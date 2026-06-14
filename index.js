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
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

// ================= JSON DATABASE =================

let xp = {};
let money = {};

if (fs.existsSync("./xp.json")) xp = JSON.parse(fs.readFileSync("./xp.json"));
if (fs.existsSync("./money.json")) money = JSON.parse(fs.readFileSync("./money.json"));

function saveData() {
  fs.writeFileSync("./xp.json", JSON.stringify(xp, null, 2));
  fs.writeFileSync("./money.json", JSON.stringify(money, null, 2));
}

// ================= COOLDOWN =================

let xpCooldown = {};

// ================= VOICE =================

let voiceJoinTime = {};
let voiceTotal = {};

// ================= KÜFÜR =================

const badWords = [
  "amk","aq","amq","orospu","oç","oc","piç","sik","sikerim","sikeyim",
  "yarak","yarrak","amcık","göt","got","ibne","pezevenk","kahpe","puşt",
  "mal","salak","aptal","gerizekalı",
  "fuck","fucking","shit","bitch","motherfucker","asshole"
];

// ================= NORMALIZE =================

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

// ================= ROLE SYSTEM =================

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

  const channel = member.guild.channels.cache.find(c => c.name === "💬・sohbet");

  if (channel) {
    channel.send(`👋 Hoş geldin ${member}!\n⛏️ Rolün verildi: **⛏️ | Oyuncu**`);
  }
});

// ================= VOICE TRACK =================

client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState.id || oldState.id;
  const now = Date.now();

  if (!oldState.channel && newState.channel) {
    voiceJoinTime[userId] = now;
  }

  if (oldState.channel && !newState.channel) {
    if (voiceJoinTime[userId]) {
      const duration = now - voiceJoinTime[userId];

      if (!voiceTotal[userId]) voiceTotal[userId] = 0;

      voiceTotal[userId] += duration;

      delete voiceJoinTime[userId];
    }
  }
});

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

  if (badWords.some(w => clean.includes(w))) {
    await message.delete().catch(() => {});
    message.member.timeout(5 * 60 * 1000).catch(() => {});
    return message.channel.send(`${message.author} Küfür yasak! 5 dk mute.`);
  }

  // ================= LINK =================

  if (isLink(raw)) {
    await message.delete().catch(() => {});
    message.member.timeout(60 * 60 * 1000).catch(() => {});
    return message.channel.send(`${message.author} Link yasak! 1 saat mute.`);
  }

  // ================= XP + MONEY =================

  if (!xpCooldown[userId] || now - xpCooldown[userId] > 120000) {

    const gainedXP = Math.floor(Math.random() * 21) + 10;
    const gainedMoney = Math.floor(Math.random() * 901) + 100;

    xp[userId] += gainedXP;
    money[userId] += gainedMoney;

    xpCooldown[userId] = now;

    saveData();

    const level = getLevel(xp[userId]);
    updateRoles(message.member, level);

    if (money[userId] >= 100000) {
      const role = message.guild.roles.cache.find(r => r.name === "Señor");

      if (role && !message.member.roles.cache.has(role.id)) {
        message.member.roles.add(role).catch(() => {});
        message.channel.send(`👑 ${message.author} artık Señor oldu!`);
      }
    }
  }

  // ================= XP =================

  if (message.content === "!xp") {
    return message.reply(`⭐ XP: ${xp[userId]} | 📊 Level: ${getLevel(xp[userId])}`);
  }

  // ================= RANK =================

  if (message.content.startsWith("!rank")) {
    const user = message.mentions.members.first() || message.member;
    const id = user.id;

    return message.channel.send(
      `🏆 ${user.user.tag}\n⭐ XP: ${xp[id] || 0}\n📊 Level: ${getLevel(xp[id] || 0)}`
    );
  }

  // ================= TOP RANK =================

  if (message.content === "!toprank") {

    const sorted = Object.entries(xp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    let text = "🏆 **TOP 10 XP SIRALAMASI**\n\n";

    for (let i = 0; i < sorted.length; i++) {
      const userId = sorted[i][0];
      const userXp = sorted[i][1];

      const member = message.guild.members.cache.get(userId);

      text += `${i + 1}. ${member ? member.user.tag : "Bilinmiyor"} - ⭐ ${userXp}\n`;
    }

    message.channel.send(text);
  }

  // ================= VOICE =================

  if (message.content === "!voice") {
    const total = voiceTotal[userId] || 0;
    const minutes = Math.floor(total / 60000);

    return message.reply(`🎧 Toplam ses süren: ${minutes} dakika`);
  }

  // ================= ADMIN XP =================

  if (message.content.startsWith("!xpver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.split(" ");
    const user = message.mentions.members.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) return message.reply("!xpver @kişi 500");

    xp[user.id] = (xp[user.id] || 0) + amount;
    saveData();

    message.channel.send(`⭐ ${user} +${amount} XP`);
  }

  // ================= ADMIN MONEY =================

  if (message.content.startsWith("!paraver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.split(" ");
    const user = message.mentions.members.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) return message.reply("!paraver @kişi 5000");

    money[user.id] = (money[user.id] || 0) + amount;
    saveData();

    message.channel.send(`💰 ${user} +${amount} coin`);
  }

  // ================= ÇEKİLİŞ =================

  if (message.content.startsWith("!cekilis")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const prize = message.content.split(" ").slice(1).join(" ");

    message.channel.send(`🎉 ÇEKİLİŞ: **${prize}**`);

    setTimeout(async () => {
      const msgs = await message.channel.messages.fetch({ limit: 50 });
      const users = msgs.map(m => m.author).filter(u => !u.bot);

      const winner = users[Math.floor(Math.random() * users.length)];
      if (winner) message.channel.send(`🏆 Kazanan: ${winner}`);
    }, 10000);
  }
});

client.login(process.env.TOKEN);
