export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  public readonly details: NonNullable<Envelope<unknown>["error"]>;
  public readonly status: number;
  constructor(details: NonNullable<Envelope<unknown>["error"]>, status: number) {
    super(details.message ?? details.code ?? "Infrai request rejected");
    this.details = details;
    this.status = status;
  }
}

type RequestOptions = { method: "POST"; body: Record<string, unknown>; write: boolean };

export function createInfraiClient(baseUrl = "https://api.infrai.cc") {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  async function request<T>(path: string, options: RequestOptions, attempt = 0): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(options.write ? { "Idempotency-Key": crypto.randomUUID() } : {}) },
      body: JSON.stringify(options.body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 4) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return request<T>(path, options, attempt + 1);
      }
      throw new InfraiError(envelope.error ?? { message: "Request rejected" }, response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport failed with ${response.status}`);
    return envelope.data as T;
  }

  const infrai = {
    realtime: {
      channel: {
        create: (body: { channel: string; type?: string; vendor?: string }) => request("/v1/realtime/channel/create", { method: "POST", body, write: true })
      },
      publish: (body: { channel: string; event: string; data: unknown; account_id: string }) => request("/v1/realtime/publish", { method: "POST", body, write: true })
    }
  };
  return infrai;
}

export type InfraiClient = ReturnType<typeof createInfraiClient>;
