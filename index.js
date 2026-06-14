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
let voiceTime = {};
let voiceTotal = {};
let curseFilter = true;

const LOG = "📜│herşey-log";

// ================= KÜFÜR =================

const badWords = [
  "amk","aq","amq","orospu","oç","oc","piç","pic",
  "sik","sikerim","sikeyim","siktir","yarak","yarrak",
  "amcık","göt","got","ibne","pezevenk","kahpe","puşt",
  "mal","salak","aptal","gerizekalı",
  "fuck","shit","bitch","asshole"
];

function clean(text) {
  return text.toLowerCase().replace(/[\W_]+/g, "");
}

// ================= LINK =================

function isLink(t) {
  return t.includes("http") || t.includes("discord.gg") || t.includes(".com") || t.includes(".net") || t.includes(".gg");
}

// ================= LEVEL =================

function level(x) {
  let l = 0, req = 1000;
  while (x >= req) { x -= req; req += 500; l++; }
  return l;
}

// ================= ROLE =================

async function roleUpdate(m, l) {
  const roles = {
    1: "Çaylak",
    10: "Aktif",
    20: "Sadık",
    30: "Daimi",
    40: "Special",
    50: "Elit"
  };

  const r = m.guild.roles.cache.find(x => x.name === roles[l]);
  if (r) m.roles.add(r).catch(() => {});
}

// ================= LOG =================

function log(g, t) {
  const c = g.channels.cache.find(x => x.name === LOG);
  if (c) c.send(t);
}

// ================= WELCOME =================

client.on("guildMemberAdd", m => {
  const r = m.guild.roles.cache.find(x => x.name === "⛏️ | Oyuncu");
  if (r) m.roles.add(r).catch(() => {});

  const c = m.guild.channels.cache.find(x => x.name === "💬│genel-sohbet");
  if (c) c.send(`👋 Hoş geldin ${m}`);
});

// ================= VOICE =================

client.on("voiceStateUpdate", (o, n) => {
  const id = n.id || o.id;
  const now = Date.now();

  if (!o.channel && n.channel) voiceTime[id] = now;

  if (o.channel && !n.channel) {
    voiceTotal[id] = (voiceTotal[id] || 0) + (now - voiceTime[id]);
  }
});

// ================= MESSAGE =================

client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  const id = msg.author.id;
  const txt = msg.content;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  const now = Date.now();

  // ================= KÜFÜR =================
  if (curseFilter && badWords.some(w => clean(txt).includes(w))) {

    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

      await msg.delete().catch(() => {});
      msg.member.timeout(60 * 1000, "Küfür").catch(() => {});

      log(msg.guild, `🚫 KÜFÜR ${msg.author.tag}`);
      return msg.channel.send(`${msg.author} 1 dk mute`);
    }
  }

  // ================= LINK =================
  if (isLink(txt)) {
    await msg.delete().catch(() => {});
    msg.member.timeout(60 * 60 * 1000, "Link").catch(() => {});
    log(msg.guild, `🔗 LINK ${msg.author.tag}`);
    return;
  }

  // ================= XP / MONEY =================
  if (!xpCooldown[id] || now - xpCooldown[id] > 120000) {
    xp[id] += Math.floor(Math.random() * 21) + 10;
    money[id] += Math.floor(Math.random() * 901) + 100;

    xpCooldown[id] = now;
    saveData();

    const lv = level(xp[id]);
    roleUpdate(msg.member, lv);

    if (money[id] >= 100000) {
      const r = msg.guild.roles.cache.find(x => x.name === "Señor");
      if (r) msg.member.roles.add(r).catch(() => {});
    }
  }

  // ================= KOMUTLAR =================

  if (txt === "!xp") return msg.reply(`⭐ ${xp[id]}`);

  if (txt.startsWith("!rank")) {
    const u = msg.mentions.members.first() || msg.member;
    return msg.channel.send(`⭐ ${u.user.tag} XP: ${xp[u.id] || 0}`);
  }

  if (txt === "!toprank") {
    const sorted = Object.entries(xp).sort((a,b)=>b[1]-a[1]).slice(0,10);
    return msg.channel.send(sorted.map((x,i)=>`${i+1}. <@${x[0]}> ${x[1]}`).join("\n"));
  }

  if (txt === "!voice") {
    return msg.reply(`${Math.floor((voiceTotal[id]||0)/60000)} dk`);
  }

  // ================= ADMIN =================

  if (txt.startsWith("!xpver")) {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const u = msg.mentions.members.first();
    const a = parseInt(txt.split(" ")[2]);
    xp[u.id] += a;
    saveData();
  }

  if (txt.startsWith("!paraver")) {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const u = msg.mentions.members.first();
    const a = parseInt(txt.split(" ")[2]);
    money[u.id] += a;
    saveData();
  }

  // ================= ÇEKİLİŞ (1 GÜN) =================

  if (txt.startsWith("!cekilis")) {

    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const prize = txt.split(" ").slice(1).join(" ");

    const m = await msg.channel.send(
      `🎉 ÇEKİLİŞ\n🏆 ${prize}\n👍 1 gün`
    );

    await m.react("👍");

    setTimeout(async () => {

      const reaction = m.reactions.cache.get("👍");
      if (!reaction) return;

      const users = await reaction.users.fetch();
      const list = users.filter(u => !u.bot);

      const arr = [...list.values()];
      const winner = arr[Math.floor(Math.random() * arr.length)];

      msg.channel.send(`🏆 Kazanan: ${winner}`);

    }, 86400000);
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
