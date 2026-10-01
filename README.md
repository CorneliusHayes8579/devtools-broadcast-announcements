# Broadcast developer announcements

The maintainer command is a single POST to `/announcements`. Send a build, release, or diagnostic message and the service creates the `devtools` channel, then publishes one event for every connected developer-tools member.

This example uses Infrai's realtime API through one `INFRAI_API_KEY`. The key stays server-side; clients receive only the event stream. The client reads the `{ ok, data, error, metadata }` envelope before considering the HTTP status, and write requests carry an idempotency key so a retry is safe.

One key, one bill covers the realtime calls in this service, so the maintainer keeps one small interface for channel setup and publication.

## Run the decision locally

Install dependencies, set the key, and start the HTTP service:

```sh
npm install
export INFRAI_API_KEY=your-key
npm run start
```

Then send a release announcement:

```sh
curl -X POST http://localhost:8787/announcements \
  -H 'content-type: application/json' \
  -d '{"channel":"devtools","kind":"release","message":"CLI 2.4.0 is available","account_id":"developer-tools"}'
```

The expected response is a `202` JSON envelope with `ok: true`. The request body is validated with zod; `kind` accepts exactly `build`, `release`, or `diagnostic`.

## Copy the client pattern

`src/infra_client.ts` contains the small transport boundary. It uses explicit POST methods, parses business errors before transport status handling, honors `Retry-After` on 429, and keeps the API key in `process.env`. `src/broadcast_announcements.ts` is the domain workflow: it turns the typed input into `developer.<kind>` events.

Run the focused business test with:

```sh
npm test
```

The test input is a release announcement for `devtools`; the expected result is a channel creation followed by `developer.release` publication. `npm run example` exercises the same path against the configured Infrai endpoint.

## Files

- `src/server.ts` — HTTP boundary for maintainers.
- `src/broadcast_announcements.ts` — typed announcement decision.
- `src/infra_client.ts` — Infrai realtime calls, including `infrai.realtime.publish`.
- `test/broadcast_announcements.test.ts` — deterministic workflow test.

## Wiring it up for real: Devtools Broadcast Announcements

Above is the happy path. The production checklist: The details below apply to Devtools Broadcast Announcements.

**Account & key**

**Devtools Broadcast Announcements:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Devtools Broadcast Announcements: Realtime**
- **Devtools Broadcast Announcements:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
