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

// ================= ROLE =================

const SEÑOR_ROLE = "1515780264779841689";

// ================= LOG =================

const LOG = "📜│herşey-log";

// ================= STRONG KÜFÜR FİLTRESİ =================

const badWords = [
  "amk","aq","a.q","amq","orospu","oç","oc","piç","sik","s1k","siktir",
  "yarak","amcık","göt","g0t","ibne","kahpe","puşt","kahbe",
  "fuck","fck","shit","bitch","asshole","dick","pussy","bastard"
];

function clean(t) {
  return t.toLowerCase()
    .replace(/0/g,"o")
    .replace(/1/g,"i")
    .replace(/3/g,"e")
    .replace(/4/g,"a")
    .replace(/5/g,"s")
    .replace(/[^a-zçğıöşü]/g,"");
}

function isLink(t) {
  return t.includes("http") || t.includes("discord.gg") || t.includes(".com") || t.includes(".gg");
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

// ================= MESSAGE SYSTEM =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const id = message.author.id;
  const txt = message.content;
  const now = Date.now();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;

  // ================= KÜFÜR =================
  if (badWords.some(w => clean(txt).includes(w))) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      message.member.timeout(60 * 1000).catch(() => {});
      log(message.guild, `🚫 KÜFÜR ${message.author.tag}`);
      return message.channel.send(`🚫 1 dk mute`);
    }
  }

  // ================= LINK =================
  if (isLink(txt)) {
    await message.delete().catch(() => {});
    message.member.timeout(60 * 60 * 1000).catch(() => {});
    log(message.guild, `🔗 LINK ${message.author.tag}`);
    return;
  }

  // ================= XP + PARA =================
  if (now - cooldown[id] > 120000) {

    xp[id] += Math.floor(Math.random() * 20) + 10;
    money[id] += Math.floor(Math.random() * 900) + 100;

    cooldown[id] = now;
    save();
  }

  // ================= KOMUTLAR =================

  if (txt === "!xp") return message.reply(`⭐ XP: ${xp[id]}`);
  if (txt === "!param") return message.reply(`💰 Para: ${money[id]}`);

  if (txt.startsWith("!rank")) {
    const u = message.mentions.members.first() || message.member;
    return message.channel.send(`⭐ ${u.user.tag} XP: ${xp[u.id] || 0}`);
  }

  if (txt === "!toprank") {
    const sorted = Object.entries(xp).sort((a,b)=>b[1]-a[1]).slice(0,10);
    return message.channel.send(sorted.map((x,i)=>`${i+1}. <@${x[0]}> ${x[1]}`).join("\n"));
  }

  // ================= ADMIN XP =================
  if (txt.startsWith("!xpver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const u = message.mentions.members.first();
    const a = parseInt(txt.split(" ")[2]);

    if (!u || isNaN(a)) return;

    xp[u.id] = (xp[u.id] || 0) + a;
    save();

    return message.channel.send("⭐ XP verildi");
  }

  // ================= ADMIN PARA =================
  if (txt.startsWith("!paraver")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const u = message.mentions.members.first();
    const a = parseInt(txt.split(" ")[2]);

    if (!u || isNaN(a)) return;

    money[u.id] = (money[u.id] || 0) + a;
    save();

    return message.channel.send("💰 Para verildi");
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

    return message.channel.send({
      content: "🛒 SHOP",
      components: [row]
    });
  }
});

// ================= BUTTON SYSTEM =================

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  const id = interaction.user.id;

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;

  // XP BUY
  if (interaction.customId === "buy_xp") {

    if (money[id] < 50)
      return interaction.reply({ content: "💰 Yetersiz", ephemeral: true });

    money[id] -= 50;
    xp[id] += 1;

    save();

    return interaction.reply({ content: "⭐ +1 XP", ephemeral: true });
  }

  // SEÑOR BUY
  if (interaction.customId === "buy_senor") {

    const role = interaction.guild.roles.cache.get(SEÑOR_ROLE);
    const member = await interaction.guild.members.fetch(id);

    if (!role)
      return interaction.reply({ content: "Rol yok", ephemeral: true });

    if (member.roles.cache.has(SEÑOR_ROLE))
      return interaction.reply({ content: "Zaten var", ephemeral: true });

    if (money[id] < 100000)
      return interaction.reply({ content: "💰 100K lazım", ephemeral: true });

    money[id] -= 100000;
    save();

    await member.roles.add(role);

    return interaction.reply({ content: "👑 Señor alındı", ephemeral: true });
  }
});

// ================= LOG =================

client.on("messageDelete", m => log(m.guild, `🗑 silindi ${m.author?.tag}`));
client.on("messageUpdate", m => log(m.guild, `✏️ edit ${m.author?.tag}`));

client.login(process.env.TOKEN);
