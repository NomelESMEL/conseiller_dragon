require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');
const moment = require('moment');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Commande help
client.on('messageCreate', (message) => {
  if (message.content.toLowerCase() === '!help') {
    message.channel.send(`
**Commandes disponibles :**
\`!help\` - Affiche cette liste de commandes.
\`!ticket\` - Crée un nouveau ticket.
\`!kick @user\` - Expulse un membre du serveur.
\`!ban @user\` - Bannit un membre du serveur.
    `);
  }
});


// Ticket System
const ticketCategoryName = "Tickets";

client.on('messageCreate', async (message) => {
  if (message.content.toLowerCase() === '!ticket') {
    const ticketChannel = await message.guild.channels.create(`ticket-${message.author.username}`, {
      type: 'GUILD_TEXT',
      parent: message.guild.channels.cache.find(c => c.name === ticketCategoryName && c.type === 'GUILD_CATEGORY'),
      permissionOverwrites: [
        {
          id: message.guild.id,
          deny: ['VIEW_CHANNEL'],
        },
        {
          id: message.author.id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
        },
      ],
    });

    message.reply(`Ticket created: ${ticketChannel}`);
  }
});

// Moderation Commands
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!kick')) {
    if (!message.member.permissions.has('KICK_MEMBERS')) return message.reply("You don't have permission to use this command!");

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a user to kick!");

    await member.kick();
    message.reply(`${member.user.tag} has been kicked!`);
  }

  if (message.content.startsWith('!ban')) {
    if (!message.member.permissions.has('BAN_MEMBERS')) return message.reply("You don't have permission to use this command!");

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a user to ban!");

    await member.ban();
    message.reply(`${member.user.tag} has been banned!`);
  }
});

// YouTube Notifications
const youtubeChannelID = 'UCDaGVUFqnD_C3-sm_lLbJqA';
const youtubeInterval = 600000; // 10 minutes

setInterval(async () => {
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        channelId: youtubeChannelID,
        order: 'date',
        type: 'video',
        maxResults: 1,
        key: process.env.YOUTUBE_API_KEY
      }
    });

    const video = response.data.items[0];
    const videoID = video.id.videoId;
    const videoTitle = video.snippet.title;
    const videoURL = `https://www.youtube.com/watch?v=${videoID}`;

    const channel = client.channels.cache.find(ch => ch.name === 'Ryūtsuki 龍月');
    if (channel) {
      channel.send(`New video posted: **${videoTitle}**\n${videoURL}`);
    }
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
  }
}, youtubeInterval);

// Twitch Notifications
const twitchUsername = 'vtuberryutsuki';
const twitchInterval = 600000; // 10 minutes
let twitchAccessToken = '';

const getTwitchAccessToken = async () => {
  const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials'
    }
  });
  twitchAccessToken = response.data.access_token;
};

const checkTwitchStream = async () => {
  try {
    const response = await axios.get(`https://api.twitch.tv/helix/streams`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${twitchAccessToken}`
      },
      params: {
        user_login: twitchUsername
      }
    });

    if (response.data.data.length > 0) {
      const stream = response.data.data[0];
      const streamTitle = stream.title;
      const streamURL = `https://www.twitch.tv/${twitchUsername}`;

      const channel = client.channels.cache.find(ch => ch.name === 'VTuberRyutsuki');
      if (channel) {
        channel.send(`**${twitchUsername}** is live on Twitch: **${streamTitle}**\n${streamURL}`);
      }
    }
  } catch (error) {
    console.error('Error fetching Twitch data:', error);
  }
};

setInterval(async () => {
  if (!twitchAccessToken) {
    await getTwitchAccessToken();
  }
  await checkTwitchStream();
}, twitchInterval);

// Twitter Notifications
const twitterUsername = 'Rytsuki_VTuber';
const twitterInterval = 600000; // 10 minutes
let lastTweetID = '';

const checkTwitterPosts = async () => {
  try {
    const response = await axios.get(`https://api.twitter.com/2/tweets`, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      },
      params: {
        'screen_name': twitterUsername,
        'count': 1,
        'tweet_mode': 'extended'
      }
    });

    const tweet = response.data.statuses[0];
    if (tweet && tweet.id_str !== lastTweetID) {
      lastTweetID = tweet.id_str;
      const tweetText = tweet.full_text;
      const tweetURL = `https://twitter.com/${twitterUsername}/status/${tweet.id_str}`;

      const channel = client.channels.cache.find(ch => ch.name === 'Ryūtsuki');
      if (channel) {
        channel.send(`New tweet from **${twitterUsername}**: **${tweetText}**\n${tweetURL}`);
      }
    }
  } catch (error) {
    console.error('Error fetching Twitter data:', error);
  }
};

setInterval(checkTwitterPosts, twitterInterval);

// Welcome Message
client.on('guildMemberAdd', (member) => {
  const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome');
  if (channel) {
    channel.send(`Welcome to the server, ${member}!`);
  }
});

client.login(process.env.DISCORD_TOKEN);