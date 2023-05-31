import ServerBackuper from "../classes/ServerBackuper";
import * as prompts from "prompts";
import { blue, bold, green, red } from "kleur";
import { request } from "undici";
import Utils from "../classes/Utils";
import * as fs from "fs";
import { join } from "path";

function getName(fileName: string, fileId: string) {
  if (fileName.split(".").length == 1) return fileName;
  const extension = fileName.split(".").at(-1);
  return `${fileId}.${extension}`;
}

export default async function (client: ServerBackuper): Promise<void> {
  console.log(`Logged in as ${client.user?.tag}!`);
  if (!fs.existsSync(join(__dirname, "..", "..", "backups"))) {
    fs.mkdirSync(join(__dirname, "..", "..", "backups"));
  }
  const adminGuilds = client.guilds.cache.filter((g) =>
    g.members.me.permissions.has("Administrator")
  );
  if (adminGuilds.size === 0) {
    console.log(
      red().bold("You don't have the Administrator permission in any guild.")
    );
    client.destroy();
    process.exit(0);
    return;
  }
  async function prompt() {
    const { guildId } = await prompts({
      type: "autocomplete",
      name: "guildId",
      message: "Select a guild to backup or exit:",
      choices: [
        {
          title: "❯ Exit from this menu",
          value: "exit",
        },
        ...adminGuilds.map((g) => ({ title: g.name, value: g.id })),
      ],
    });
    if (guildId === "exit") {
      console.log("Exiting...");
      client.destroy();
      console.log(green().bold("You can now close this window."));
      process.exit(0);
    }
    const guild = adminGuilds.find((g) => g.id === guildId);
    const { confirm } = await prompts({
      type: "toggle",
      name: "confirm",
      message: `Are you sure you want to backup ${bold().blue(guild?.name)}?`,
      initial: true,
      active: "yes",
      inactive: "no",
    });
    if (confirm) {
      console.log(`Backing up ${bold().blue(guild?.name)}...`);
      if (!fs.existsSync(join(__dirname, "..", "..", "backups", guild?.id))) {
        fs.mkdirSync(join(__dirname, "..", "..", "backups", guild?.id));
      }
      if (
        !fs.existsSync(
          join(__dirname, "..", "..", "backups", guild?.id, "assets")
        )
      ) {
        fs.mkdirSync(
          join(__dirname, "..", "..", "backups", guild?.id, "assets")
        );
      }
      const channels = guild.channels.cache.map((c) => c.toJSON());
      const jsonChannels = JSON.stringify(channels);
      fs.writeFileSync(
        join(__dirname, "..", "..", "backups", guild?.id, "channels.json"),
        jsonChannels
      );
      const jsonGuild = JSON.stringify(guild.toJSON());
      fs.writeFileSync(
        join(__dirname, "..", "..", "backups", guild?.id, "guild.json"),
        jsonGuild
      );
      if (
        !fs.existsSync(
          join(__dirname, "..", "..", "backups", guild?.id, "messages")
        )
      ) {
        fs.mkdirSync(
          join(__dirname, "..", "..", "backups", guild?.id, "messages")
        );
      }
      for (const feature of ["icon", "banner", "splash", "discoverySplash"]) {
        if (guild[feature]) {
          console.log(`Downloading ${feature}...`);
          const file = await fs.createWriteStream(
            join(
              __dirname,
              "..",
              "..",
              "backups",
              guild.id,
              "assets",
              `${feature}.png`
            )
          );
          const response = await request(
            guild[`${feature}URL`]({ extension: "png", size: 4096 })
          );
          response.body.pipe(file);
        }
      }
      for (const channel of guild.channels.cache.values()) {
        if (!channel.isTextBased()) continue;
        console.log(`Backing up ${bold().blue(channel.name)}...`);
        const messages = await Utils.getAllMessages(channel);
        console.log(`Got ${messages.length} messages.`);
        if (
          !fs.existsSync(
            join(
              __dirname,
              "..",
              "..",
              "backups",
              guild?.id,
              "assets",
              "attachments"
            )
          )
        ) {
          fs.mkdirSync(
            join(
              __dirname,
              "..",
              "..",
              "backups",
              guild?.id,
              "assets",
              "attachments"
            )
          );
        }
        for (const msg of messages) {
          console.log(`Retrieving attachments of ${blue().bold(msg.id)}...`);
          for (const attachment of msg.attachments.values()) {
            const file = await fs.createWriteStream(
              join(
                __dirname,
                "..",
                "..",
                "backups",
                guild?.id,
                "assets",
                "attachments",
                getName(attachment.name, attachment.id)
              )
            );
            const response = await request(attachment.url);
            response.body.pipe(file);
            const json = JSON.stringify({
              id: attachment.id,
              name: attachment.name,
              size: attachment.size,
              contentType: attachment.contentType,
              url: attachment.url,
              proxyURL: attachment.proxyURL,
              height: attachment.height,
              width: attachment.width,
              duration: attachment.duration,
            });
            fs.writeFileSync(
              join(
                __dirname,
                "..",
                "..",
                "backups",
                guild?.id,
                "assets",
                "attachments",
                `${attachment.id}.meta.json`
              ),
              json
            );
          }
        }
        const json = JSON.stringify(messages.map((m) => m.toJSON()));
        fs.writeFileSync(
          join(
            __dirname,
            "..",
            "..",
            "backups",
            guild?.id,
            "messages",
            `${channel.id}.json`
          ),
          json
        );
      }
      console.log(`Done backing up ${bold().green(guild?.name)}.`);
      await prompt();
    } else {
      await prompt();
    }
  }
  await prompt();
}
