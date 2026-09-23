import { z } from "zod";
import { createInfraiClient, type InfraiClient } from "./infra_client.ts";

export const announcementSchema = z.object({
  channel: z.string().min(1),
  kind: z.enum(["build", "release", "diagnostic"]),
  message: z.string().min(1),
  account_id: z.string().min(1)
});
export type Announcement = z.infer<typeof announcementSchema>;

export async function broadcastAnnouncement(input: Announcement, infrai: InfraiClient = createInfraiClient()) {
  const announcement = announcementSchema.parse(input);
  await infrai.realtime.channel.create({ channel: announcement.channel, type: "broadcast", vendor: "pusher" });
  return infrai.realtime.publish({
    channel: announcement.channel,
    event: `developer.${announcement.kind}`,
    data: { message: announcement.message, kind: announcement.kind },
    account_id: announcement.account_id
  });
}

if (process.argv[1]?.endsWith("broadcast_announcements.ts")) {
  const result = await broadcastAnnouncement({ channel: "devtools", kind: "release", message: "CLI 2.4.0 is available", account_id: "developer-tools" });
  console.log(JSON.stringify(result));
}
