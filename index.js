require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
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

const LOG_CHANNEL_ID = "1512629605830496257";
const MEMBER_ROLE = "1506370448814899280";
const SUPPORT_CHANNEL_ID = "1506387613559423007";

// ================= DATA =================

let curse = {};
const messageCache = new Map();
const giveaways = {};

// ================= BAD WORDS =================

const BAD_WORDS = [
  "amk","aq","orospu","oç","piç","sik","yarak","göt",
  "fuck","shit","bitch","idiot","stupid"
];

// ================= LINK =================

const LINK_REGEX = /(https?:\/\/|www\.|discord\.gg|discord\.com\/invite)/i;

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
    channel.send(`👋 Hoşgeldin <@${member.id}>`);
  }

  const log = member.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (log) log.send(`📥 Yeni üye: <@${member.id}>`);
});

// ================= LOG =================

client.on("messageDelete", async (message) => {

  if (!message.guild) return;

  const log = message.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (log) {
    log.send(`🗑️ Silindi: ${message.author?.tag} → ${message.content || "boş"}`);
  }
});

client.on("messageUpdate", async (oldM, newM) => {

  if (!oldM.guild || oldM.content === newM.content) return;

  const log = oldM.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (log) {
    log.send(`✏️ Edit: ${oldM.author?.tag}\nEski: ${oldM.content}\nYeni: ${newM.content}`);
  }
});

// ================= MESSAGE =================

client.on("messageCreate", async (message) => {

  messageCache.set(message.id, {
    content: message.content,
    author: message.author?.tag
  });

  if (message.author.bot || !message.guild) return;

  const txt = message.content.toLowerCase();
  const member = message.member;

  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

  // ================= LINK =================

  if (LINK_REGEX.test(txt)) {
    if (isAdmin) return;

    await message.delete().catch(()=>{});
    member.timeout(60 * 60 * 1000).catch(()=>{});

    return message.channel.send("🔗 Link yasak → 1 saat mute");
  }

  // ================= SWEAR =================

  if (BAD_WORDS.some(w => txt.includes(w))) {
    if (isAdmin) return;

    await message.delete().catch(()=>{});

    curse[member.id] = (curse[member.id] || 0) + 1;

    if (curse[member.id] >= 3) {
      curse[member.id] = 0;
      member.timeout(5 * 60 * 1000).catch(()=>{});
      return message.channel.send("⚠️ 3 küfür → 5 dk mute");
    }

    return message.channel.send("⚠️ Küfür uyarısı");
  }
});

// ================= TICKET PANEL (SADECE DESTEK KANALI) =================

client.on("messageCreate", async (message) => {

  if (message.author.bot || !message.guild) return;

  if (message.content === "!ticketpanel") {

    if (message.channel.id !== SUPPORT_CHANNEL_ID) {
      return message.reply("❌ Bu komut sadece destek kanalında kullanılabilir.");
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_open_menu")
        .setLabel("🎫 Ticket Aç")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({
      content: "🎫 Ticket sistemi aktif",
      components: [row]
    });
  }
});

// ================= INTERACTIONS =================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  // ================= OPEN MENU =================

  if (interaction.customId === "ticket_open_menu") {

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_category")
        .setPlaceholder("📂 Kategori seç")
        .addOptions(
          { label: "Destek", value: "destek", emoji: "🛠️" },
          { label: "Bug", value: "bug", emoji: "🐞" },
          { label: "Şikayet", value: "sikayet", emoji: "⚠️" },
          { label: "Diğer", value: "diger", emoji: "📩" }
        )
    );

    return interaction.reply({
      content: "📂 Kategori seç",
      components: [menu],
      ephemeral: true
    });
  }

  // ================= CREATE TICKET =================

  if (interaction.customId === "ticket_category") {

    const category = interaction.values[0];
    const user = interaction.user;

    const channel = await interaction.guild.channels.create({
      name: `ticket-${category}-${user.username}`,
      type: 0,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: ["ViewChannel"]
        },
        {
          id: user.id,
          allow: ["ViewChannel","SendMessages","ReadMessageHistory"]
        }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("🔒 Kapat")
        .setStyle(ButtonStyle.Danger)
    );

    channel.send({
      content: `🎫 Ticket | ${category}`,
      components: [row]
    });

    return interaction.reply({
      content: `✅ Ticket açıldı: ${channel}`,
      ephemeral: true
    });
  }

  // ================= CLOSE =================

  if (interaction.customId === "ticket_close") {

    const channel = interaction.channel;

    if (!channel.name.startsWith("ticket-")) {
      return interaction.reply({
        content: "❌ Bu ticket değil",
        ephemeral: true
      });
    }

    await interaction.reply("🔒 Kapatılıyor...");

    setTimeout(() => {
      channel.delete().catch(()=>{});
    }, 2000);
  }
});

// ================= LOGIN =================

client.login(process.env.TOKEN);if (message.content.startsWith("!xpver")) {

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
