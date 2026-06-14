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

const LOG_CHANNEL = "📜│herşey-log";
const GIVEAWAYS = new Map();

// ================= KÜFÜR =================

const badWords = [
  "amk","aq","amq","orospu","oç","oc","piç","pic",
  "sik","sikerim","sikeyim","siktir","yarak","yarrak",
  "amcık","göt","got","ibne","pezevenk","kahpe","puşt",
  "mal","salak","aptal","gerizekalı",
  "fuck","fucking","shit","bitch","asshole","motherfucker"
];

function normalize(text) {
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

function getLevel(x) {
  let level = 0;
  let req = 1000;

  while (x >= req) {
    x -= req;
    req += 500;
    level++;
  }
  return level;
}

// ================= ROLE =================

async function updateRoles(member, level) {
  const roles = {
    1: "⛏️ Çaylak Üye",
    10: "Aktif Üye",
    20: "Sadık Üye",
    30: "Daimi Üye",
    40: "Special",
    50: "Elit"
  };

  const role = member.guild.roles.cache.find(r => r.name === roles[level]);
  if (role) member.roles.add(role).catch(() => {});
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

client.on("voiceStateUpdate", (oldState, newState) => {
  const id = newState.id || oldState.id;
  const now = Date.now();

  if (!oldState.channel && newState.channel) {
    voiceJoinTime[id] = now;
  }

  if (oldState.channel && !newState.channel) {
    const t = now - voiceJoinTime[id];
    voiceTotal[id] = (voiceTotal[id] || 0) + t;
  }
});

// ================= MESSAGE =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const id = message.author.id;
  const raw = message.content;
  const clean = normalize(raw);

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  const now = Date.now();

  // ================= KÜFÜR =================

  if (curseFilter && badWords.some(w => clean.includes(w))) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {

      await message.delete().catch(() => {});
      message.member.timeout(60 * 1000, "Küfür").catch(() => {});

      log(message.guild,
        `🚫 KÜFÜR ${message.author.tag}\n${message.content}`
      );

      return message.channel.send(`${message.author} 1 dk mute!`);
    }
  }

  // ================= LINK =================

  if (isLink(raw)) {
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

  // ================= COMMANDS =================

  if (message.content === "!xp")
    return message.reply(`⭐ ${xp[id]}`);

  if (message.content.startsWith("!rank")) {
    const u = message.mentions.members.first() || message.member;
    return message.channel.send(`⭐ ${u.user.tag} XP: ${xp[u.id] || 0}`);
  }

  if (message.content === "!toprank") {
    const sorted = Object.entries(xp).sort((a,b)=>b[1]-a[1]).slice(0,10);
    return message.channel.send(
      sorted.map((x,i)=>`${i+1}. <@${x[0]}> ${x[1]}`).join("\n")
    );
  }

  if (message.content === "!voice")
    return message.reply(`${Math.floor((voiceTotal[id]||0)/60000)} dk`);

  // ================= ADMIN =================

  if (message.content.startsWith("!xpver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const u = message.mentions.members.first();
    const a = parseInt(message.content.split(" ")[2]);
    xp[u.id] += a;
    saveData();
  }

  if (message.content.startsWith("!paraver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const u = message.mentions.members.first();
    const a = parseInt(message.content.split(" ")[2]);
    money[u.id] += a;
    saveData();
  }

  // ================= ÇEKİLİŞ (10 SN) =================

  if (message.content.startsWith("!cekilis")) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const prize = message.content.split(" ").slice(1).join(" ");

    const msg = await message.channel.send(
      `🎉 ÇEKİLİŞ\n🏆 ${prize}\n👍 10 saniye`
    );

    await msg.react("👍");

    GIVEAWAYS.set(msg.id, { prize });

    setTimeout(async () => {

      const reaction = msg.reactions.cache.get("👍");
      const users = await reaction.users.fetch();

      const list = users.filter(u => !u.bot);

      const arr = [...list.values()];
      const winner = arr[Math.floor(Math.random() * arr.length)];

      message.channel.send(`🏆 Kazanan: ${winner}`);

    }, 10000);
  }
});

// ================= LOG EVENTS =================

client.on("messageDelete", m =>
  log(m.guild, `🗑 SİLİNDİ ${m.author?.tag}`)
);

client.on("messageUpdate", (o,n) =>
  log(o.guild, `✏️ EDİT ${o.author?.tag}`)
);

client.on("guildBanAdd", b =>
  log(b.guild, `⛔ BAN ${b.user.tag}`)
);

client.on("guildMemberRemove", m =>
  log(m.guild, `👢 KICK ${m.user.tag}`)
);

client.on("guildMemberUpdate", (o,n) => {
  if (!o.communicationDisabledUntil && n.communicationDisabledUntil) {
    log(n.guild, `🔇 MUTE ${n.user.tag}`);
  }
});

client.login(process.env.TOKEN);
