import test from "node:test";
import assert from "node:assert/strict";
import { broadcastAnnouncement } from "../src/broadcast_announcements.ts";

test("publishes a release event to the developer channel", async () => {
  const calls: string[] = [];
  const client = { realtime: { channel: { create: async (body: { channel: string }) => { calls.push(`create:${body.channel}`); } }, publish: async (body: { event: string; data: { message: string } }) => { calls.push(`publish:${body.event}:${body.data.message}`); return { delivered: true }; } } } as never;
  await broadcastAnnouncement({ channel: "devtools", kind: "release", message: "2.4.0", account_id: "developer-tools" }, client);
  assert.deepEqual(calls, ["create:devtools", "publish:developer.release:2.4.0"]);
});
