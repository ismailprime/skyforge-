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

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

const SEÑOR_ROLE = "1515780264779841689";
const LOG_CHANNEL = "📜│herşey-log";

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const g = member.guild;

  const r = {
    caylak: g.roles.cache.get(ROLES.caylak),
    aktif: g.roles.cache.get(ROLES.aktif),
    sadik: g.roles.cache.get(ROLES.sadik),
    daimi: g.roles.cache.get(ROLES.daimi),
    special: g.roles.cache.get(ROLES.special)
  };

  await member.roles.remove(Object.values(r)).catch(() => {});

  if (xpValue >= 50000) return member.roles.add(r.special).catch(() => {});
  if (xpValue >= 25000) return member.roles.add(r.daimi).catch(() => {});
  if (xpValue >= 14000) return member.roles.add(r.sadik).catch(() => {});
  if (xpValue >= 6500) return member.roles.add(r.aktif).catch(() => {});
  if (xpValue >= 1000) return member.roles.add(r.caylak).catch(() => {});
}

// ================= LOG =================

function log(guild, text) {
  const ch = guild.channels.cache.find(c => c.name === LOG_CHANNEL);
  if (ch) ch.send(text);
}

// ================= MESSAGE =================

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

    const xpGain = Math.floor(Math.random() * 21) + 10;
    const moneyGain = Math.floor(Math.random() * 901) + 100;

    xp[id] += xpGain;
    money[id] += moneyGain;

    cooldown[id] = now;
    save();

    updateRoles(message.member, xp[id]);
  }

  // ================= BASIC =================
  if (txt === "!xp") return message.reply(`⭐ XP: ${xp[id]}`);
  if (txt === "!param") return message.reply(`💰 Para: ${money[id]}`);

  // ================= LEADERBOARD =================
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

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const args = txt.split(" ");
    const user = message.mentions.members.first();
    const amount = Number(args.find(x => !isNaN(x)));

    if (!user || !amount)
      return message.reply("!xpver @kişi 100");

    xp[user.id] = (xp[user.id] || 0) + amount;
    save();

    updateRoles(user, xp[user.id]);

    return message.channel.send(`⭐ XP verildi: ${amount}`);
  }

  // ================= ADMIN PARA =================
  if (txt.startsWith("!paraver")) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const args = txt.split(" ");
    const user = message.mentions.members.first();
    const amount = Number(args.find(x => !isNaN(x)));

    if (!user || !amount)
      return message.reply("!paraver @kişi 100");

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

    if (money[id] < 50)
      return i.reply({ content: "Yetersiz", ephemeral: true });

    money[id] -= 50;
    xp[id] += 1;

    save();
    updateRoles(i.member, xp[id]);

    return i.reply({ content: "⭐ XP alındı", ephemeral: true });
  }

  if (i.customId === "buy_senor") {

    const role = i.guild.roles.cache.get(SEÑOR_ROLE);
    const member = await i.guild.members.fetch(id);

    if (!role)
      return i.reply({ content: "Rol yok", ephemeral: true });

    if (member.roles.cache.has(SEÑOR_ROLE))
      return i.reply({ content: "Zaten var", ephemeral: true });

    if (money[id] < 100000)
      return i.reply({ content: "100K gerekli", ephemeral: true });

    money[id] -= 100000;
    save();

    await member.roles.add(role);

    return i.reply({ content: "👑 Señor verildi", ephemeral: true });
  }
});

// ================= LOG =================

client.on("messageDelete", m => log(m.guild, `🗑 silindi ${m.author?.tag}`));
client.on("messageUpdate", m => log(m.guild, `✏️ edit ${m.author?.tag}`));

client.login(process.env.TOKEN);
