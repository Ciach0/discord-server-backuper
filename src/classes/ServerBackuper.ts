import { Client, IntentsBitField, Partials } from "discord.js";
import { readdir } from "fs/promises";
import { join } from "path";
import { config } from "dotenv";

config();

export default class ServerBackuper extends Client {
  constructor() {
    super({
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
      ],
      intents: Object.values(IntentsBitField.Flags).reduce(
        (acc, p: any) => acc | p,
        0
      ),
    });
    this.loadHandlers().then(() => {});
    this.login(process.env.TOKEN).then(() => {});
  }

  async loadHandlers() {
    const handlers = await readdir(join(__dirname, "..", "handlers"));
    for (const handler of handlers) {
      if (!handler.endsWith(".js")) continue;
      const file = await import(join(__dirname, "..", "handlers", handler));
      file.default(this);
    }
  }
}
