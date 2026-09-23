import { createServer } from "node:http";
import { broadcastAnnouncement, announcementSchema } from "./broadcast_announcements.ts";
import { InfraiError } from "./infra_client.ts";

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/announcements") {
    response.writeHead(404).end();
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  try {
    const input = announcementSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const data = await broadcastAnnouncement(input);
    response.writeHead(202, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, data }));
  } catch (error) {
    const status = error instanceof InfraiError && error.status < 500 ? error.status : error instanceof SyntaxError || error instanceof Error && error.name === "ZodError" ? 400 : 502;
    response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ ok: false, error: { message: error instanceof Error ? error.message : "Request rejected" } }));
  }
});

server.listen(Number(process.env.PORT ?? 8787), () => console.log("announcement service listening"));
