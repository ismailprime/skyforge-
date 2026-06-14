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
let voiceStart = {};
let voiceTotal = {};
let curseFilter = true;

const LOG_CHANNEL = "📜│herşey-log";

// ================= KÜFÜR =================

const badWords = [
  "amk","aq","amq","orospu","oç","oc","piç","pic",
  "sik","sikerim","sikeyim","siktir","yarak","yarrak",
  "amcık","göt","got","ibne","pezevenk","kahpe","puşt",
  "mal","salak","aptal","gerizekalı",
  "fuck","shit","bitch","asshole"
];

function cleanText(t) {
  return t.toLowerCase().replace(/[\W_]+/g, "");
}

// ================= LINK =================

function isLink(t) {
  return (
    t.includes("http") ||
    t.includes("discord.gg") ||
    t.includes(".com") ||
    t.includes(".net") ||
    t.includes(".gg")
  );
}

// ================= LEVEL =================

function getLevel(x) {
  let l = 0, req = 1000;
  while (x >= req) { x -= req; req += 500; l++; }
  return l;
}

// ================= ROLE =================

async function updateRoles(member, lvl) {
  const roles = {
    1: "Çaylak",
    10: "Aktif",
    20: "Sadık",
    30: "Daimi",
    40: "Special",
    50: "Elit"
  };

  const r = member.guild.roles.cache.find(x => x.name === roles[lvl]);
  if (r) member.roles.add(r).catch(() => {});
}

// ================= LOG =================

function log(guild, text) {
  const ch = guild.channels.cache.find(c => c.name === LOG_CHANNEL);
  if (ch) ch.send(text);
}

// ================= WELCOME =================

client.on("guildMemberAdd", member => {
  const role = member.guild.roles.cache.find(r => r.name === "⛏️ | Oyuncu");
  if (role) member.roles.add(role).catch(() => {});

  const ch = member.guild.channels.cache.find(c => c.name === "💬│genel-sohbet");
  if (ch) ch.send(`👋 Hoş geldin ${member}`);
});

// ================= VOICE =================

client.on("voiceStateUpdate", (o, n) => {
  const id = n.id || o.id;
  const now = Date.now();

  if (!o.channel && n.channel) {
    voiceStart[id] = now;
  }

  if (o.channel && !n.channel) {
    voiceTotal[id] = (voiceTotal[id] || 0) + (now - voiceStart[id]);
  }
});

// ================= MESSAGE =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const id = message.author.id;
  const txt = message.content;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  const now = Date.now();

  // ================= KÜFÜR =================
  if (curseFilter && badWords.some(w => cleanText(txt).includes(w))) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

      await message.delete().catch(() => {});
      message.member.timeout(60 * 1000, "Küfür").catch(() => {});

      log(message.guild, `🚫 KÜFÜR ${message.author.tag}`);
      return message.channel.send(`${message.author} 1 dk mute`);
    }
  }

  // ================= LINK =================
  if (isLink(txt)) {
    await message.delete().catch(() => {});
    message.member.timeout(60 * 60 * 1000, "Link").catch(() => {});
    log(message.guild, `🔗 LINK ${message.author.tag}`);
    return;
  }

  // ================= XP / MONEY =================
  if (!xpCooldown[id] || now - xpCooldown[id] > 120000) {
    xp[id] += Math.floor(Math.random() * 21) + 10;
    money[id] += Math.floor(Math.random() * 901) + 100;

    xpCooldown[id] = now;
    saveData();

    const lvl = getLevel(xp[id]);
    updateRoles(message.member, lvl);

    if (money[id] >= 100000) {
      const role = message.guild.roles.cache.find(r => r.name === "Señor");
      if (role) message.member.roles.add(role).catch(() => {});
    }
  }

  // ================= KOMUTLAR =================

  if (txt === "!xp") return message.reply(`⭐ ${xp[id]}`);

  if (txt.startsWith("!rank")) {
    const u = message.mentions.members.first() || message.member;
    return message.channel.send(`⭐ ${u.user.tag} XP: ${xp[u.id] || 0}`);
  }

  if (txt === "!toprank") {
    const sorted = Object.entries(xp).sort((a,b)=>b[1]-a[1]).slice(0,10);
    return message.channel.send(sorted.map((x,i)=>`${i+1}. <@${x[0]}> ${x[1]}`).join("\n"));
  }

  if (txt === "!voice") {
    return message.reply(`${Math.floor((voiceTotal[id]||0)/60000)} dk`);
  }

  // ================= ADMIN =================

  if (txt.startsWith("!xpver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const u = message.mentions.members.first();
    const a = parseInt(txt.split(" ")[2]);
    xp[u.id] += a;
    saveData();
  }

  if (txt.startsWith("!paraver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const u = message.mentions.members.first();
    const a = parseInt(txt.split(" ")[2]);
    money[u.id] += a;
    saveData();
  }

  // ================= ÇEKİLİŞ (1 GÜN) =================

  if (txt.startsWith("!cekilis")) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const prize = txt.split(" ").slice(1).join(" ");

    const m = await message.channel.send(
      `🎉 ÇEKİLİŞ BAŞLADI!\n🏆 ${prize}\n👍 Süre: 1 gün`
    );

    await m.react("👍");

    setTimeout(async () => {

      const reaction = m.reactions.cache.get("👍");
      if (!reaction) return;

      const users = await reaction.users.fetch();
      const list = users.filter(u => !u.bot);

      const arr = [...list.values()];
      const winner = arr[Math.floor(Math.random() * arr.length)];

      message.channel.send(`🏆 Kazanan: ${winner}`);

    }, 86400000); // ⏰ 1 GÜN

  }

});

// ================= LOG EVENTS =================

client.on("messageDelete", m => log(m.guild, `🗑 SİLİNDİ ${m.author?.tag}`));
client.on("messageUpdate", m => log(m.guild, `✏️ EDİT ${m.author?.tag}`));
client.on("guildBanAdd", b => log(b.guild, `⛔ BAN ${b.user.tag}`));
client.on("guildMemberRemove", m => log(m.guild, `👢 KICK ${m.user.tag}`));

client.on("guildMemberUpdate", (o,n) => {
  if (!o.communicationDisabledUntil && n.communicationDisabledUntil) {
    log(n.guild, `🔇 MUTE ${n.user.tag}`);
  }
});

client.login(process.env.TOKEN);
