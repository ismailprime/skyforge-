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
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember
  ]
});

// ================= IDS =================

const OWNER_ID = "1003708560728920165";

const LOG_CHANNEL_ID = "1512629605830496257";

const MEMBER_ROLE = "1506370448814899280";

const SENOR_ROLE = "1515780264779841689";

// ================= RANK ROLES =================

const ROLES = {
  caylak: "1515752720433152050",
  aktif: "1515752883600232538",
  sadik: "1515753054912118796",
  daimi: "1515770549870264330",
  special: "1515779632761143540"
};

// ================= DATA =================

function load(file, def) {
  return fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file))
    : def;
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let xp = load("./data/xp.json", {});
let money = load("./data/money.json", {});
let cooldown = {};
let curse = {};
let giveaways = {};

// ================= BAD WORDS =================

const BAD_WORDS = [

  // Türkçe
  "amk",
  "a.mk",
  "aq",
  "amq",
  "amına",
  "amina",
  "amini",
  "amcık",
  "amcik",
  "orospu",
  "orosb",
  "oc",
  "oç",
  "piç",
  "pic",
  "sik",
  "sikerim",
  "siktir",
  "sikik",
  "yarak",
  "yarrak",
  "göt",
  "got",
  "götveren",
  "ibne",
  "eşşek",
  "mal",
  "salak",
  "gerizekalı",
  "aptal",
  "kahpe",
  "pezevenk",
  "şerefsiz",
  "haysiyetsiz",
  "ananı",
  "anan",
  "bacını",
  "bacin",
  "ananıskm",
  "anneskm",
  "mk",
  "aq",
  "sg",
  "sg git",
  "yavşak",
  "lavuk",
  "dangalak",
  "geri zekalı",
  "gerizekali",
  "aptal herif",
  "sürtük",
  "puşt",
  "it oğlu it",
  "salak oç",
  "am biti",
  "gavat",
  "dalyarak",
  "am hoşafı",
  "amcık hoşafı",
  "dingil",
  "gerzek",
  "malsın",
  "ezik",
  "am surat",
  "sik kafalı",
  "göt kafa",
  "beyinsiz",

  // İngilizce
  "fuck",
  "fucking",
  "motherfucker",
  "bitch",
  "shit",
  "asshole",
  "dick",
  "wtf",
  "idiot",
  "stupid",
  "bastard",
  "slut",
  "whore",
  "retard",
  "dumbass",
  "moron",
  "loser",
  "nigga",
  "nigger",
  "faggot",
  "sucker",
  "jerk",
  "piece of shit"
];

// ================= LINK =================

const LINK_REGEX = /(https?:\/\/|www\.|discord\.gg|discord\.com\/invite)/i;

// ================= ROLE SYSTEM =================

async function updateRoles(member, xpValue) {

  const allRoles = Object.values(ROLES)
    .map(id => member.guild.roles.cache.get(id))
    .filter(Boolean);

  await member.roles.remove(allRoles).catch(()=>{});

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

// ================= READY =================

client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);
});

// ================= WELCOME =================

client.on("guildMemberAdd", async (member) => {

  member.roles.add(MEMBER_ROLE).catch(()=>{});

  const channel = member.guild.channels.cache.find(
    c => c.name === "💬│genel-sohbet"
  );

  if (channel) {
    channel.send(
      `👋 Hoşgeldin <@${member.id}>!\n` +
      `📊 Sen ${member.guild.memberCount}. üyesisin 🎉`
    );
  }

  const log = member.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (log) {
    log.send(`📥 Yeni üye geldi: <@${member.id}>`);
  }
});

// ================= MESSAGE DELETE LOG =================

client.on("messageDelete", async (message) => {

  if (!message.guild) return;

  const log = message.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (!log) return;

  log.send(
    `🗑️ MESAJ SİLİNDİ\n\n` +
    `👤 Kullanıcı: ${message.author?.tag || "unknown"}\n` +
    `💬 Mesaj: ${message.content || "boş"}`
  );
});

// ================= MESSAGE EDIT LOG =================

client.on("messageUpdate", async (oldMessage, newMessage) => {

  if (!oldMessage.guild) return;

  if (oldMessage.content === newMessage.content) return;

  const log = oldMessage.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (!log) return;

  log.send(
    `✏️ MESAJ DÜZENLENDİ\n\n` +
    `👤 Kullanıcı: ${oldMessage.author?.tag || "unknown"}\n` +
    `📌 Eski: ${oldMessage.content || "boş"}\n` +
    `📌 Yeni: ${newMessage.content || "boş"}`
  );
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.guild) return;

  const id = message.author.id;

  const now = Date.now();

  const txt = message.content.toLowerCase();

  if (!xp[id]) xp[id] = 0;
  if (!money[id]) money[id] = 0;
  if (!cooldown[id]) cooldown[id] = 0;
  if (!curse[id]) curse[id] = 0;

  const isAdmin =
    message.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

  // ================= LINK SYSTEM =================

  if (LINK_REGEX.test(txt)) {

    if (isAdmin) return;

    await message.delete().catch(()=>{});

    // 1 SAAT MUTE
    message.member.timeout(60 * 60 * 1000).catch(()=>{});

    return message.channel.send(
      "🔗 Link yasak → 1 saat mute"
    );
  }

  // ================= SWEAR SYSTEM =================

  const clean = txt
    .replace(/0/g,"o")
    .replace(/1/g,"i")
    .replace(/3/g,"e")
    .replace(/4/g,"a")
    .replace(/5/g,"s")
    .replace(/7/g,"t");

  if (BAD_WORDS.some(word => clean.includes(word))) {

    if (isAdmin) return;

    await message.delete().catch(()=>{});

    curse[id]++;

    if (curse[id] >= 3) {

      curse[id] = 0;

      message.member.timeout(5 * 60 * 1000).catch(()=>{});

      return message.channel.send(
        "⚠️ 3 küfür → 5 dakika mute"
      );
    }

    return message.channel.send(
      `⚠️ Küfür uyarısı (${curse[id]}/3)`
    );
  }

  // ================= XP + MONEY =================

  if (now - cooldown[id] >= 120000) {

    let xpGain =
      Math.floor(Math.random() * 21) + 10;

    let moneyGain =
      Math.floor(Math.random() * 901) + 100;

    // SENOR BOOST
    if (
      message.member.roles.cache.has(SENOR_ROLE)
    ) {
      xpGain = Math.floor(xpGain * 1.3);
      moneyGain = Math.floor(moneyGain * 1.3);
    }

    xp[id] += xpGain;
    money[id] += moneyGain;

    cooldown[id] = now;

    save("./data/xp.json", xp);
    save("./data/money.json", money);

    updateRoles(message.member, xp[id]);
  }

  // ================= COMMANDS =================

  if (message.content === "!xp") {
    return message.reply(
      `⭐ XP'n: ${xp[id]}`
    );
  }

  if (message.content === "!param") {
    return message.reply(
      `💰 Paran: ${money[id]}`
    );
  }

  if (message.content === "!top10") {

    const top = Object.entries(xp)
      .sort((a,b) => b[1] - a[1])
      .slice(0,10)
      .map((user, i) =>
        `#${i+1} <@${user[0]}> → ⭐ ${user[1]}`
      )
      .join("\n");

    return message.channel.send(
      `🏆 TOP 10 XP\n\n${top}`
    );
  }

  // ================= SHOP =================

  if (message.content === "!shop") {

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("buy_senor")
          .setLabel("👑 SENOR (250K)")
          .setStyle(ButtonStyle.Primary)
      );

    return message.channel.send({
      content: "🛒 SHOP MENÜSÜ",
      components: [row]
    });
  }

  // ================= GIVEAWAY =================

  if (message.content.startsWith("!cekilis")) {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) return;

    const time =
      message.content.split(" ")[1] || "1m";

    let ms = 60000;

    if (time.endsWith("m"))
      ms = parseInt(time) * 60000;

    if (time.endsWith("h"))
      ms = parseInt(time) * 3600000;

    if (time.endsWith("d"))
      ms = parseInt(time) * 86400000;

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("join_giveaway")
          .setLabel("🎉 Katıl")
          .setStyle(ButtonStyle.Success)
      );

    const msg = await message.channel.send({
      content:
        `🎉 ÇEKİLİŞ BAŞLADI!\n` +
        `⏰ Süre: ${time}`,
      components: [row]
    });

    giveaways[msg.id] = [];

    setTimeout(() => {

      const users = giveaways[msg.id];

      if (!users || users.length <= 0) {
        return message.channel.send(
          "❌ Çekilişe kimse katılmadı"
        );
      }

      const winner =
        users[Math.floor(Math.random() * users.length)];

      message.channel.send(
        `🏆 Kazanan: <@${winner}>`
      );

      const log =
        message.guild.channels.cache.get(
          LOG_CHANNEL_ID
        );

      if (log) {
        log.send(
          `🎉 Çekiliş bitti → Kazanan: <@${winner}>`
        );
      }

    }, ms);
  }

  // ================= OWNER XP GIVE =================

  if (message.content.startsWith("!xpver")) {

    if (message.author.id !== OWNER_ID) return;

    const member =
      message.mentions.members.first();

    const amount =
      Number(message.content.split(" ")[2]);

    if (!member) {
      return message.reply("Kullanıcı belirt");
    }

    if (!amount) {
      return message.reply("Miktar belirt");
    }

    if (!xp[member.id]) xp[member.id] = 0;

    xp[member.id] += amount;

    save("./data/xp.json", xp);

    updateRoles(member, xp[member.id]);

    return message.reply(
      `⭐ ${amount} XP verildi`
    );
  }

});

// ================= BUTTONS =================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton()) return;

  const id = interaction.user.id;

  // GIVEAWAY BUTTON
  if (interaction.customId === "join_giveaway") {

    if (!giveaways[interaction.message.id]) {
      giveaways[interaction.message.id] = [];
    }

    if (
      giveaways[interaction.message.id].includes(id)
    ) {
      return interaction.reply({
        content: "❌ Zaten katıldın",
        ephemeral: true
      });
    }

    giveaways[interaction.message.id].push(id);

    return interaction.reply({
      content: "🎉 Çekilişe katıldın!",
      ephemeral: true
    });
  }

  // SHOP BUTTON
  if (interaction.customId === "buy_senor") {

    if (money[id] < 250000) {
      return interaction.reply({
        content: "❌ 250.000 para lazım",
        ephemeral: true
      });
    }

    money[id] -= 250000;

    save("./data/money.json", money);

    const member =
      interaction.guild.members.cache.get(id);

    member.roles.add(SENOR_ROLE).catch(()=>{});

    return interaction.reply({
      content: "👑 SENOR rolünü aldın!",
      ephemeral: true
    });
  }

});

// ================= LOGIN =================

client.login(process.env.TOKEN);
