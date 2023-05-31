import { Client } from "discord.js";
import { readdir } from "fs/promises";
import { join } from "path";

export default async function (client: Client) {
  const evtFiles = await readdir(join(__dirname, "..", "events"));
  for (const file of evtFiles) {
    if (!file.endsWith(".js")) continue;
    const evt = await import(join(__dirname, "..", "events", file));
    client.on(file.split(".")[0], evt.default.bind(null, client));
  }
}
