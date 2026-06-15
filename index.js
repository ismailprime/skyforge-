require("dotenv").config();

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

// ================= DATABASE =================

let xp = {};
let money = {};
let cooldown = {};
let curseCount = {};

function load(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : fallback;
}

xp = load("./xp.json", {});
money = load("./money.json", {});

function save() {
  fs.writeFileSync("./xp.json", JSON.stringify(xp, null, 2));
  fs.writeFileSync("./money.json", JSON.stringify(money, null, 2));
}

// ================= CONFIG =================

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

const linkRegex = /(https?:\/\/|www\.)/i;

const badWords = [
  "amk","oç","siktir","fuck","shit","piç","aq","amq","yarrak",
  "orospu","mal","salak","gerizekalı","aptal","bitch"
];

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const g = member.guild;

  const roles = Object.values(ROLES)
    .map(id => g.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(roles).catch(()=>{});

  if (xpValue >= 50000)
    return member.roles.add(ROLES.special).catch(()=>{});

  if (xpValue >= 25000)
    return member.roles.add(ROLES.daimi).catch(()=>{});

  if (xpValue >= 14000)
    return member.roles.add(ROLES.sadik).catch(()=>{});

  if (xpValue >= 6500)
    return member.roles.add(ROLES.aktif).catch(()=>{});

  if (xpValue >= 1000)
    return member.roles.add(ROLES.caylak).catch(()=>{});
}

// ================= MESSAGE SYSTEM =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const id = message.author.id;
  const now = Date.now();
  const txt = message.content.toLowerCase();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curseCount[id]) curseCount[id] = 0;

  // 🔗 LINK ENGEL
  if (linkRegex.test(txt)) {
    await message.delete().catch(()=>{});

    if (message.member?.moderatable)
      message.member.timeout(60 * 60 * 1000);

    return message.channel.send("🔗 Link → 1 saat mute");
  }

  // 💬 KÜFÜR (3 = 5 DK MUTE)
  if (badWords.some(w => txt.includes(w))) {
    await message.delete().catch(()=>{});

    curseCount[id]++;

    if (curseCount[id] >= 3) {
      curseCount[id] = 0;

      if (message.member?.moderatable)
        message.member.timeout(5 * 60 * 1000);

      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send(`⚠️ Küfür sayısı: ${curseCount[id]}/3`);
  }

  // 💰 XP + PARA (2 DAKİKA)
  if (now - cooldown[id] >= 120000) {

    xp[id] += Math.floor(Math.random() * 21) + 10;
    money[id] += Math.floor(Math.random() * 901) + 100;

    cooldown[id] = now;

    save();
    updateRoles(message.member, xp[id]);
  }

  // ================= BASIC COMMANDS =================

  if (message.content === "!xp")
    return message.reply(`⭐ XP: ${xp[id] || 0}`);

  if (message.content === "!param")
    return message.reply(`💰 Para: ${money[id] || 0}`);
});

// ================= GIVEAWAY SYSTEM =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.content.startsWith("!cekilis")) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return;

  const args = message.content.split(" ");
  let time = args[1] || "1d";

  let ms = 86400000;

  if (time.endsWith("m")) ms = parseInt(time) * 60000;
  else if (time.endsWith("h")) ms = parseInt(time) * 3600000;
  else if (time.endsWith("d")) ms = parseInt(time) * 86400000;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("join_giveaway")
      .setLabel("🎉 Katıl")
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await message.channel.send({
    content: `🎉 **ÇEKİLİŞ BAŞLADI!**\n⏰ Süre: ${time}`,
    components: [row]
  });

  if (!global.giveaways) global.giveaways = {};
  global.giveaways[msg.id] = [];

  setTimeout(() => {

    const list = global.giveaways[msg.id] || [];

    if (list.length === 0)
      return message.channel.send("❌ Katılım yok");

    const winner = list[Math.floor(Math.random() * list.length)];

    message.channel.send(`🎉 Kazanan: <@${winner}>`);

  }, ms);
});

// ================= BUTTON =================

client.on("interactionCreate", async (i) => {

  if (!i.isButton()) return;

  if (i.customId !== "join_giveaway") return;

  if (!global.giveaways)
    global.giveaways = {};

  if (!global.giveaways[i.message.id])
    global.giveaways[i.message.id] = [];

  if (global.giveaways[i.message.id].includes(i.user.id))
    return i.reply({ content: "Zaten katıldın", ephemeral: true });

  global.giveaways[i.message.id].push(i.user.id);

  return i.reply({ content: "🎉 Katıldın!", ephemeral: true });
});

// ================= LOGIN =================

client.login(process.env.TOKEN);
