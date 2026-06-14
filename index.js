const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// ================= DATABASE =================

let xp = {};
let money = {};

if (fs.existsSync("./xp.json")) xp = JSON.parse(fs.readFileSync("./xp.json"));
if (fs.existsSync("./money.json")) money = JSON.parse(fs.readFileSync("./money.json"));

function saveData() {
  fs.writeFileSync("./xp.json", JSON.stringify(xp, null, 2));
  fs.writeFileSync("./money.json", JSON.stringify(money, null, 2));
}

// ================= SYSTEM =================

let xpCooldown = {};
let voiceJoinTime = {};
let voiceTotal = {};
let curseFilter = true;

const LOG_CHANNEL_NAME = "📜│herşey-log";

// ================= KÜFÜR =================

const badWords = [
  "amk","aq","amq","orospu","oç","oc","piç","pic",
  "sik","sikerim","sikeyim","siktir","yarak","yarrak",
  "amcık","göt","got","ibne","pezevenk","kahpe","puşt",
  "mal","salak","aptal","gerizekalı",
  "fuck","fucking","shit","bitch","asshole","motherfucker"
];

function normalizeText(text) {
  return text.toLowerCase().replace(/[\W_]+/g, "");
}

// ================= LINK =================

function isLink(text) {
  return (
    text.includes("http://") ||
    text.includes("https://") ||
    text.includes("discord.gg") ||
    text.includes(".com") ||
    text.includes(".net") ||
    text.includes(".gg")
  );
}

// ================= LEVEL =================

function getLevel(userXp) {
  let level = 0;
  let req = 1000;

  while (userXp >= req) {
    userXp -= req;
    req += 500;
    level++;
  }

  return level;
}

// ================= ROLE =================

async function updateRoles(member, level) {
  const roles = {
    1: "Çaylak Üye",
    10: "Aktif Üye",
    20: "Sadık Üye",
    30: "Daimi Üye",
    40: "Special",
    50: "Elit"
  };

  const roleName = roles[level];
  if (!roleName) return;

  const role = member.guild.roles.cache.find(r => r.name === roleName);
  if (role) member.roles.add(role).catch(() => {});
}

// ================= WELCOME =================

client.on("guildMemberAdd", async (member) => {
  const role = member.guild.roles.cache.find(r => r.name === "⛏️ | Oyuncu");
  if (role) member.roles.add(role).catch(() => {});

  const channel = member.guild.channels.cache.find(c => c.name === "💬│genel-sohbet");

  if (channel) {
    channel.send(`👋 Hoş geldin ${member}!\n⛏️ Rolün verildi.`);
  }
});

// ================= LOG FUNCTION =================

function log(guild, text) {
  const channel = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
  if (!channel) return;
  channel.send(text);
}

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const raw = message.content;
  const clean = normalizeText(raw);

  if (!xp[userId]) xp[userId] = 0;
  if (!money[userId]) money[userId] = 0;

  const now = Date.now();

  // ================= KÜFÜR =================

  if (curseFilter && badWords.some(w => clean.includes(w))) {

    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    await message.delete().catch(() => {});
    message.member.timeout(60 * 1000, "Küfür").catch(() => {});

    log(message.guild,
      `🚫 **KÜFÜR**\n👤 ${message.author.tag}\n💬 ${message.content}`
    );

    return message.channel.send(`${message.author} 1 dakika mute!`);
  }

  // ================= LINK =================

  if (isLink(raw)) {
    await message.delete().catch(() => {});
    message.member.timeout(60 * 60 * 1000, "Link").catch(() => {});

    log(message.guild,
      `🔗 **LINK**\n👤 ${message.author.tag}\n💬 ${message.content}`
    );

    return message.channel.send("Link yasak!");
  }

  // ================= XP + MONEY =================

  if (!xpCooldown[userId] || now - xpCooldown[userId] > 120000) {
    xp[userId] += Math.floor(Math.random() * 21) + 10;
    money[userId] += Math.floor(Math.random() * 901) + 100;

    xpCooldown[userId] = now;

    saveData();
  }

  // ================= COMMANDS =================

  if (message.content === "!xp") {
    return message.reply(`⭐ XP: ${xp[userId]}`);
  }

  if (message.content === "!toprank") {
    const sorted = Object.entries(xp).sort((a,b)=>b[1]-a[1]).slice(0,10);

    let text = "🏆 TOP 10\n\n";
    sorted.forEach((u,i)=>{
      text += `${i+1}. <@${u[0]}> - ${u[1]} XP\n`;
    });

    message.channel.send(text);
  }
});

// ================= MESSAGE DELETE LOG =================

client.on("messageDelete", msg => {
  if (!msg.guild) return;

  log(msg.guild,
    `🗑 **MESAJ SİLİNDİ**\n👤 ${msg.author?.tag}\n💬 ${msg.content || "boş"}`
  );
});

// ================= MESSAGE EDIT LOG =================

client.on("messageUpdate", (oldMsg, newMsg) => {
  if (!oldMsg.guild) return;
  if (oldMsg.content === newMsg.content) return;

  log(oldMsg.guild,
    `✏️ **MESAJ DÜZENLENDİ**\n👤 ${oldMsg.author?.tag}\n❌ ${oldMsg.content}\n✅ ${newMsg.content}`
  );
});

// ================= MOD LOGS =================

// BAN
client.on("guildBanAdd", ban => {
  log(ban.guild,
    `⛔ **BAN**\n👤 ${ban.user.tag}`
  );
});

// KICK
client.on("guildMemberRemove", member => {
  log(member.guild,
    `👢 **KICK / AYRILDI**\n👤 ${member.user.tag}`
  );
});

// TIMEOUT (MUTE)
client.on("guildMemberUpdate", (oldMember, newMember) => {
  const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
  const newTimeout = newMember.communicationDisabledUntilTimestamp;

  if (!oldTimeout && newTimeout) {
    log(newMember.guild,
      `🔇 **MUTE (TIMEOUT)**\n👤 ${newMember.user.tag}`
    );
  }
});

client.login(process.env.TOKEN);
