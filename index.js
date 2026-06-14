const activeGiveaways = new Map();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ================= ÇEKİLİŞ =================
  if (message.content.startsWith("!cekilis")) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Yetkin yok.");
    }

    const prize = message.content.split(" ").slice(1).join(" ");
    if (!prize) return message.reply("Kullanım: !cekilis ödül");

    const giveawayMsg = await message.channel.send(
      `🎉 **ÇEKİLİŞ BAŞLADI!**\n` +
      `🏆 Ödül: **${prize}**\n` +
      `👍 Katılmak için reaksiyon bırak!\n` +
      `⏰ Süre: 5 saniye`
    );

    await giveawayMsg.react("👍");

    activeGiveaways.set(giveawayMsg.id, {
      prize,
      channelId: message.channel.id,
      guildId: message.guild.id
    });

    // ================= 5 SANİYE =================
    setTimeout(async () => {

      const data = activeGiveaways.get(giveawayMsg.id);
      if (!data) return;

      const guild = await client.guilds.fetch(data.guildId);
      const channel = await guild.channels.fetch(data.channelId);
      const msg = await channel.messages.fetch(giveawayMsg.id);

      const reaction = msg.reactions.cache.get("👍");
      if (!reaction) {
        return channel.send("❌ Katılımcı yok!");
      }

      const users = await reaction.users.fetch();

      const validUsers = users.filter(u => !u.bot);

      const arr = [...validUsers.values()];

      if (arr.length === 0) {
        return channel.send("❌ Kazanan yok!");
      }

      const winner = arr[Math.floor(Math.random() * arr.length)];

      channel.send(
        `🏆 **KAZANAN:** ${winner}\n🎁 Ödül: **${data.prize}**`
      );

      activeGiveaways.delete(giveawayMsg.id);

    }, 5000);
  }
});
