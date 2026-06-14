const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fs = require("fs");

// ================= CLIENT =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// ================= DATA =================

let xp = {};
let money = {};
let cooldown = {};

if (fs.existsSync("./xp.json")) xp = JSON.parse(fs.readFileSync("./xp.json"));
if (fs.existsSync("./money.json")) money = JSON.parse(fs.readFileSync("./money.json"));

function save() {
  fs.writeFileSync("./xp.json", JSON.stringify(xp, null, 2));
  fs.writeFileSync("./money.json", JSON.stringify(money, null, 2));
}

// ================= SETTINGS =================

const SEÑOR_ROLE = "1515780264779841689";
const LOG_CHANNEL = "📜│herşey-log";

// ================= SYSTEM =================

const badWords = [
  "amk","aq","orospu","oç","piç","sik","siktir","yarak","amcık","göt",
  "fuck","shit","bitch"
];

function clean(text) {
  return text.toLowerCase()
    .replace(/0/g,"o")
    .replace(/1/g,"i")
    .replace(/3/g,"e")
    .replace(/4/g,"a")
    .replace(/5/g,"s")
    .replace(/[^a-zçğıöşü]/g,"");
}

function isLink(text) {
  return text.includes("http") || text.includes("discord.gg") || text.includes(".com");
}

function log(guild, msg) {
  const ch = guild.channels.cache.find(c => c.name === LOG_CHANNEL);
  if (ch) ch.send(msg);
}

// ================= MESSAGE SYSTEM =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const id = message.author.id;
  const txt = message.content;
  const now = Date.now();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;

  // ================= XP + PARA (2 DK) =================
  if (now - cooldown[id] >= 120000) {
    xp[id] += Math.floor(Math.random() * 20) + 10;
    money[id] += Math.floor(Math.random() * 900) + 100;
    cooldown[id] = now;
    save();
  }

  // ================= KÜFÜR =================
  if (badWords.some(w => clean(txt).includes(w))) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      message.member.timeout(60000).catch(() => {});
      log(message.guild, `🚫 Küfür: ${message.author.tag}`);
      return message.reply("🚫 1 dk mute");
    }
  }

  // ================= LINK =================
  if (isLink(txt)) {
    await message.delete().catch(() => {});
    message.member.timeout(3600000).catch(() => {});
    log(message.guild, `🔗 Link: ${message.author.tag}`);
    return;
  }

  // ================= KOMUTLAR =================

  if (txt === "!xp") return message.reply(`⭐ XP: ${xp[id]}`);
  if (txt === "!param") return message.reply(`💰 Para: ${money[id]}`);

  if (txt === "!toprank") {
    const top = Object.entries(xp)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10)
      .map((x,i)=>`${i+1}. <@${x[0]}> - ${x[1]} XP`)
      .join("\n");

    return message.channel.send(top || "Veri yok");
  }

  // ================= ADMIN XP =================
  if (txt.startsWith("!xpver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = txt.split(" ");
    const user = message.mentions.members.first();
    const amount = Number(args[2]);

    if (!user || isNaN(amount)) return message.reply("!xpver @kişi 100");

    xp[user.id] = (xp[user.id] || 0) + amount;
    save();

    return message.channel.send(`⭐ XP verildi: ${amount}`);
  }

  // ================= ADMIN PARA =================
  if (txt.startsWith("!paraver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = txt.split(" ");
    const user = message.mentions.members.first();
    const amount = Number(args[2]);

    if (!user || isNaN(amount)) return message.reply("!paraver @kişi 100");

    money[user.id] = (money[user.id] || 0) + amount;
    save();

    return message.channel.send(`💰 Para verildi: ${amount}`);
  }

  // ================= SHOP =================
  if (txt === "!shop") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_xp")
        .setLabel("⭐ XP (50💰)")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("buy_senor")
        .setLabel("👑 Señor (100K)")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ content: "🛒 SHOP", components: [row] });
  }
});

// ================= BUTTONS =================

client.on("interactionCreate", async i => {
  if (!i.isButton()) return;

  const id = i.user.id;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  if (i.customId === "buy_xp") {
    if (money[id] < 50) return i.reply({ content: "Yetersiz", ephemeral: true });

    money[id] -= 50;
    xp[id] += 1;
    save();

    return i.reply({ content: "⭐ XP alındı", ephemeral: true });
  }

  if (i.customId === "buy_senor") {
    const role = i.guild.roles.cache.get(SEÑOR_ROLE);
    const member = await i.guild.members.fetch(id);

    if (!role) return i.reply({ content: "Rol yok", ephemeral: true });
    if (member.roles.cache.has(SEÑOR_ROLE)) return i.reply({ content: "Zaten var", ephemeral: true });
    if (money[id] < 100000) return i.reply({ content: "100K lazım", ephemeral: true });

    money[id] -= 100000;
    save();

    await member.roles.add(role);

    return i.reply({ content: "👑 Señor verildi", ephemeral: true });
  }
});

// ================= LOG EVENTS =================

client.on("messageDelete", m => log(m.guild, `🗑 silindi ${m.author?.tag}`));
client.on("messageUpdate", m => log(m.guild, `✏️ edit ${m.author?.tag}`));

client.login(process.env.TOKEN);
