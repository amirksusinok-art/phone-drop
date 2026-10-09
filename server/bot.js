// server/bot.js
// Легковесный бот Telegram для обработки команды /start и отправки кнопки WebApp
const BOT_TOKEN = process.env.BOT_TOKEN;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || '';

let isPolling = false;
let lastUpdateId = 0;

async function sendTelegramMessage(chatId, text, replyMarkup) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
  } catch (err) {
    console.error('[Bot] Ошибка отправки сообщения:', err.message);
  }
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'Коллекционер';

  if (msg.text.startsWith('/start')) {
    const webAppUrl = RENDER_EXTERNAL_URL || 'https://t.me';

    const welcomeText = `👋 Привет, <b>${firstName}</b>!\n\n` +
      `📱 Добро пожаловать в <b>Phone Drop</b> — коллекционную мини-игру с виртуальной экономикой и рынком номеров.\n\n` +
      `🔹 <b>10 000 уникальных номеров</b> 5 стран (Серия 2026)\n` +
      `🔹 <b>250 стартовых Coins</b> уже ждут вас на балансе\n` +
      `🔹 <b>12 категорий узоров</b> (зеркала, монолиты, лесенки)\n` +
      `🔹 <b>Рынок игроков</b> с комиссией 5%\n\n` +
      `Нажмите кнопку ниже, чтобы запустить игру! 👇`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          RENDER_EXTERNAL_URL
            ? { text: '🚀 Играть в Phone Drop', web_app: { url: RENDER_EXTERNAL_URL } }
            : { text: '📱 Открыть сайт', url: 'https://github.com/amirksusinok-art/phone-drop' }
        ],
        [
          { text: '📜 Правила и Политика', url: `${RENDER_EXTERNAL_URL}/privacy` }
        ]
      ]
    };

    await sendTelegramMessage(chatId, welcomeText, inlineKeyboard);
  }
}

async function pollUpdates() {
  if (!isPolling || !BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        await handleUpdate(update);
      }
    }
  } catch {
    // Временная ошибка сети, повторяем
  }

  if (isPolling) {
    setTimeout(pollUpdates, 1000);
  }
}

function startBot() {
  if (!BOT_TOKEN) {
    console.log('[Bot] BOT_TOKEN не задан. Бот работает в пассивном веб-режиме.');
    return;
  }
  console.log('[Bot] Запуск Telegram-бота (обработка команды /start и кнопок)...');
  isPolling = true;
  pollUpdates();
}

module.exports = {
  startBot
};
