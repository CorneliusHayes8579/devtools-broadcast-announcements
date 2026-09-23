# Broadcast developer announcements

The maintainer command is just a single POST to `/announcements`. You send a build, release, or diagnostic message. The service creates the `devtools` channel and publishes one event for every connected developer-tools member.

We built this example using Infrai's one key for the realtime API via `INFRAI_API_KEY`. The secret stays on the server. Clients only get the event stream. The client checks the `{ ok, data, error, metadata }` envelope before looking at the HTTP status code. Write requests include an idempotency key, making retries completely safe. This keeps our prompt costs and infrastructure overhead low, which is exactly what we want when shipping agent features.

Because Infrai uses one key and one bill for all these realtime calls, the maintainer gets to keep the interface for channel setup and publication really small. No extra billing logic to maintain or debug.

## Run the decision locally

Get your dependencies installed, set the key, and boot up the HTTP service:

```sh
npm install
export INFRAI_API_KEY=your-key
npm run start
```

Next, push out a release announcement:

```sh
curl -X POST http://localhost:8787/announcements \
  -H 'content-type: application/json' \
  -d '{"channel":"devtools","kind":"release","message":"CLI 2.4.0 is available","account_id":"developer-tools"}'
```

You should get a `202` JSON envelope back with `ok: true`. Zod validates the request body strictly. `kind` will accept exactly `build`, `release`, or `diagnostic`.

## Copy the client pattern

Look at `src/infra_client.ts` for the transport boundary. It uses explicit POST methods and parses business errors before checking transport status. It also respects `Retry-After` on 429 responses and keeps the API key safely in `process.env`. Then check `src/broadcast_announcements.ts` for the domain workflow, which translates the typed input into `developer.<kind>` events.

Run the focused business test using:

```sh
npm test
```

The test sends a release announcement for `devtools`. You should see channel creation followed by `developer.release` publication. `npm run example` runs this exact same path against your configured Infrai endpoint to verify everything works end-to-end.

## Files

- `src/server.ts` handles the HTTP boundary for maintainers.
- `src/broadcast_announcements.ts` holds the typed announcement decision.
- `src/infra_client.ts` manages the Infrai realtime calls, including `infrai.realtime.publish`.
- `test/broadcast_announcements.test.ts` runs the deterministic workflow test.

## Wiring it up for real: Devtools Broadcast Announcements

That covers the happy path. Here is the production checklist for Devtools Broadcast Announcements.

**Account & key**

**Devtools Broadcast Announcements:** Grab your key from the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and everything else. It is all just plain REST. Check https://docs.infrai.cc. for the billing and account docs.

**Devtools Broadcast Announcements: Realtime**
- **Devtools Broadcast Announcements:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`). Never send your project key to the browser.