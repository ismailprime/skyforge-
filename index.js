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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// ================= DATABASE =================

let xp = {};
let money = {};
let voiceStart = {};
let voiceTotal = {};
let xpCooldown = {};

if (fs.existsSync("./xp.json")) xp = JSON.parse(fs.readFileSync("./xp.json"));
if (fs.existsSync("./money.json")) money = JSON.parse(fs.readFileSync("./money.json"));

function save() {
  fs.writeFileSync("./xp.json", JSON.stringify(xp, null, 2));
  fs.writeFileSync("./money.json", JSON.stringify(money, null, 2));
}

// ================= ROLE IDS =================

const ROLE = {
  1: "1515752720433152050",
  10: "1515752883600232538",
  20: "1515753054912118796",
  30: "1515770549870264330",
  40: "1515779632761143540"
};

const SEÑOR_ROLE = "1515780264779841689";

// ================= LOG =================

const LOG = "📜│herşey-log";

// ================= KÜFÜR =================

const badWords = [
  "amk","aq","amq","orospu","oç","piç","s1k","sik","siktir",
  "yarak","amcık","göt","ibne","fuck","shit","bitch","asshole"
];

function clean(t) {
  return t.toLowerCase()
    .replace(/[\s\W_]+/g, "")
    .replace(/0/g,"o")
    .replace(/1/g,"i")
    .replace(/3/g,"e")
    .replace(/4/g,"a")
    .replace(/5/g,"s");
}

function isLink(t) {
  return t.includes("http") || t.includes("discord.gg") || t.includes(".com") || t.includes(".net") || t.includes(".gg");
}

// ================= LEVEL =================

function getLevel(x) {
  let l = 0;
  let req = 1000;

  while (x >= req) {
    x -= req;
    req += 500;
    l++;
  }

  return l;
}

// ================= LOG =================

function log(g, t) {
  const c = g.channels.cache.find(x => x.name === LOG);
  if (c) c.send(t);
}

// ================= WELCOME =================

client.on("guildMemberAdd", m => {
  const r = m.guild.roles.cache.get(ROLE[1]);
  if (r) m.roles.add(r).catch(() => {});

  const c = m.guild.channels.cache.find(x => x.name === "💬│genel-sohbet");
  if (c) c.send(`👋 Hoş geldin ${m}`);
});

// ================= VOICE =================

client.on("voiceStateUpdate", (o, n) => {
  const id = n.id || o.id;
  const now = Date.now();

  if (!o.channel && n.channel) voiceStart[id] = now;

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
  if (badWords.some(w => clean(txt).includes(w))) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      message.member.timeout(60 * 1000).catch(() => {});
      log(message.guild, `🚫 KÜFÜR ${message.author.tag}`);
      return message.channel.send(`${message.author} 1 dk mute`);
    }
  }

  // ================= LINK =================
  if (isLink(txt)) {
    await message.delete().catch(() => {});
    message.member.timeout(60 * 60 * 1000).catch(() => {});
    log(message.guild, `🔗 LINK ${message.author.tag}`);
    return;
  }

  // ================= XP + MONEY =================
  if (!xpCooldown[id] || now - xpCooldown[id] > 120000) {

    xp[id] += Math.floor(Math.random() * 21) + 10;
    money[id] += Math.floor(Math.random() * 901) + 100;

    xpCooldown[id] = now;

    const lvl = getLevel(xp[id]);
    const roleId = ROLE[lvl];

    if (roleId) {
      const role = message.guild.roles.cache.get(roleId);
      if (role && !message.member.roles.cache.has(roleId)) {
        message.member.roles.add(role).catch(() => {});
      }
    }

    save();
  }

  // ================= KOMUTLAR =================

  if (txt === "!xp") return message.reply(`⭐ XP: ${xp[id]}`);
  if (txt === "!param") return message.reply(`💰 Para: ${money[id] || 0}`);

  if (txt.startsWith("!rank")) {
    const u = message.mentions.members.first() || message.member;
    return message.channel.send(`⭐ ${u.user.tag} XP: ${xp[u.id] || 0}`);
  }

  if (txt === "!toprank") {
    const sorted = Object.entries(xp).sort((a,b)=>b[1]-a[1]).slice(0,10);
    return message.channel.send(sorted.map((x,i)=>`${i+1}. <@${x[0]}> ${x[1]}`).join("\n"));
  }

  if (txt === "!voice")
    return message.reply(`${Math.floor((voiceTotal[id]||0)/60000)} dk`);

  // ================= ADMIN =================

  if (txt.startsWith("!xpver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const u = message.mentions.members.first();
    const a = Number(txt.split(" ")[2]);

    xp[u.id] = (xp[u.id] || 0) + a;
    save();
  }

  if (txt.startsWith("!paraver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const u = message.mentions.members.first();
    const a = Number(txt.split(" ")[2]);

    money[u.id] = (money[u.id] || 0) + a;
    save();
  }

  // ================= SHOP MENÜ =================

  if (txt === "!shop") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_xp")
        .setLabel("⭐ XP (50💰 = 1 XP)")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("buy_senor")
        .setLabel("👑 Señor (100.000💰)")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({
      content: "🛒 SHOP MENÜSÜ",
      components: [row]
    });
  }

  // ================= ÇEKİLİŞ =================

  if (txt.startsWith("!cekilis")) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const prize = txt.split(" ").slice(1).join(" ");

    const m = await message.channel.send(
      `🎉 ÇEKİLİŞ\n🏆 ${prize}\n⏰ 1 gün\n👍 Katıl`
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

    }, 86400000);
  }

});

// ================= BUTTON SYSTEM =================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  const id = interaction.user.id;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  // ================= XP SATIN AL =================
  if (interaction.customId === "buy_xp") {

    if (money[id] < 50)
      return interaction.reply({ content: "💰 Yetersiz para", ephemeral: true });

    money[id] -= 50;
    xp[id] += 1;

    save();

    return interaction.reply({ content: "⭐ 1 XP satın alındı", ephemeral: true });
  }

  // ================= SEÑOR SATIN AL =================
  if (interaction.customId === "buy_senor") {

    const role = interaction.guild.roles.cache.get(SEÑOR_ROLE);

    if (!role)
      return interaction.reply({ content: "Rol yok", ephemeral: true });

    const member = await interaction.guild.members.fetch(id);

    if (member.roles.cache.has(SEÑOR_ROLE))
      return interaction.reply({ content: "Zaten sahipsin", ephemeral: true });

    if (money[id] < 100000)
      return interaction.reply({ content: "💰 100.000 gerekli", ephemeral: true });

    money[id] -= 100000;
    save();

    await member.roles.add(role);

    return interaction.reply({ content: "👑 Señor alındı!", ephemeral: true });
  }
});

// ================= LOG =================

client.on("messageDelete", m => log(m.guild, `🗑 SİLİNDİ ${m.author?.tag}`));
client.on("messageUpdate", m => log(m.guild, `✏️ EDİT ${m.author?.tag}`));
client.on("guildBanAdd", b => log(b.guild, `⛔ BAN ${b.user.tag}`));
client.on("guildMemberRemove", m => log(m.guild, `👢 KICK ${m.user?.tag}`));

client.login(process.env.TOKEN);
