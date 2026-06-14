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
    GatewayIntentBits.GuildMembers
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

let xpCooldown = {};

// ================= DEV KÜFÜR LİSTESİ =================

const badWords = [
  "amk","aq","amq","orospu","oç","oc","piç","pic","siktir","sik","sikerim","sikeyim",
  "yarak","yarrak","amcık","amcuk","göt","got","ibne","pezevenk","kahpe","puşt",
  "ananı","bacını","gavat","lavuk","mal","salak","aptal","gerizekalı",
  "fuck","fucking","motherfucker","shit","bitch","asshole","dick","cock"
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
    1: "⛏️ Çaylak Üye",
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

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const raw = message.content;
  const clean = normalizeText(raw);

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

  if (!xp[userId]) xp[userId] = 0;
  if (!money[userId]) money[userId] = 0;

  const now = Date.now();

  if (!xpCooldown[userId] || now - xpCooldown[userId] > 120000) {

    const gainedXP = Math.floor(Math.random() * 21) + 10;
    const gainedMoney = Math.floor(Math.random() * 901) + 100;

    xp[userId] += gainedXP;
    money[userId] += gainedMoney;

    xpCooldown[userId] = now;

    saveData();

    const level = getLevel(xp[userId]);
    updateRoles(message.member, level);

    // ================= SEÑOR =================

    if (money[userId] >= 100000) {
      const role = message.guild.roles.cache.find(r => r.name === "Señor");

      if (role && !message.member.roles.cache.has(role.id)) {
        message.member.roles.add(role).catch(() => {});
        message.channel.send(`👑 ${message.author} artık Señor oldu!`);
      }
    }
  }

  // ================= BALANCE =================

  if (message.content === "!para") {
    return message.reply(`💰 Paran: ${money[userId] || 0} coin`);
  }

  // ================= ADMIN MONEY =================

  if (message.content.startsWith("!paraver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.split(" ");
    const user = message.mentions.members.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) return message.reply("!paraver @kişi 5000");

    if (!money[user.id]) money[user.id] = 0;

    money[user.id] += amount;
    saveData();

    message.channel.send(`💰 ${user} +${amount} coin aldı!`);

    if (money[user.id] >= 100000) {
      const role = message.guild.roles.cache.find(r => r.name === "Señor");
      if (role && !user.roles.cache.has(role.id)) user.roles.add(role).catch(() => {});
    }
  }

  // ================= ADMIN XP =================

  if (message.content.startsWith("!xpver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.split(" ");
    const user = message.mentions.members.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) return message.reply("!xpver @kişi 500");

    if (!xp[user.id]) xp[user.id] = 0;

    xp[user.id] += amount;
    saveData();

    const level = getLevel(xp[user.id]);
    updateRoles(user, level);

    message.channel.send(`⭐ ${user} +${amount} XP aldı!`);
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
