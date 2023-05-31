import { Message, TextBasedChannel } from "discord.js";
import { promisify } from "util";

const wait = promisify(setTimeout);

export default class Utils {
  static async getAllMessages(channel: TextBasedChannel): Promise<Message[]> {
    const allMessages: Message[] = [];
    let lastId: string | undefined;
    let done = false;
    while (!done) {
      const msgs = await channel.messages.fetch({
        limit: 100,
        ...(lastId ? { before: lastId } : {}),
      });
      if (msgs.size === 0) done = true;
      else {
        lastId = msgs.last()?.id;
        allMessages.push(...msgs.values());
      }
      await wait(2000);
    }
    return allMessages;
  }
}
