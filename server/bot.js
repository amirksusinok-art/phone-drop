// server/bot.js
// Бот Telegram для обработки /start, реферальных ссылок и запуска WebApp
const BOT_TOKEN = process.env.BOT_TOKEN;
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || '';

let isPolling = false;
let lastUpdateId = 0;

async function sendTelegramMessage(chatId, text, replyMarkup) {
  if (!BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('[Bot Send Error]:', data.description);
    }
  } catch (err) {
    console.error('[Bot Network Error]:', err.message);
  }
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'Игрок';
  const text = msg.text.trim();

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const startParam = parts[1] || ''; // Например: ref_12345
    const isReferral = startParam.startsWith('ref_');

    const baseAppUrl = RENDER_EXTERNAL_URL || 'https://t.me';
    const launchUrl = startParam
      ? `${baseAppUrl}?startapp=${encodeURIComponent(startParam)}&ref=${encodeURIComponent(startParam)}`
      : baseAppUrl;

    let welcomeText = '';
    if (isReferral) {
      welcomeText = `🎁 Привет, <b>${firstName}</b>!\n\n` +
        `Тебя пригласил друг в <b>Phone Drop</b>!\n` +
        `При первом запуске ты получишь <b>бонус +100 Coins</b> (всего 350 Coins на балансе).\n\n` +
        `📱 <b>Что тебя ждет в игре:</b>\n` +
        `• 10 000 уникальных телефонных номеров (Серия 2026)\n` +
        `• 12 категорий узоров и 6 уровней редкости\n` +
        `• Рынок свободной торговли между игроками (сбор 5%)\n` +
        `• Контракты синтеза 5в1 с шансом супер-удачи\n` +
        `• Вышка связи с пассивным доходом монет\n\n` +
        `Нажимай кнопку ниже, чтобы забрать бонус и начать играть! 👇`;
    } else {
      welcomeText = `👋 Привет, <b>${firstName}</b>!\n\n` +
        `Добро пожаловать в <b>Phone Drop</b> — коллекционную мини-игру с виртуальной экономикой и рынком телефонных номеров.\n\n` +
        `🔹 <b>10 000 номеров</b> (Россия, Украина, США, Турция, Китай)\n` +
        `🔹 <b>250 стартовых Coins</b> уже на твоем балансе\n` +
        `🔹 <b>12 узоров</b>: монолиты, зеркала, восходящие\n` +
        `🔹 <b>Рынок игроков</b> и контракты обмена 5в1\n` +
        `🔹 <b>Вышка связи</b>: пассивный доход каждый час\n\n` +
        `Нажимай кнопку ниже, чтобы войти в игру! 👇`;
    }

    const inlineKeyboard = {
      inline_keyboard: [
        [
          RENDER_EXTERNAL_URL
            ? { text: isReferral ? '🎁 Забрать +100 Coins и играть' : '🚀 Играть в Phone Drop', web_app: { url: launchUrl } }
            : { text: '📱 Открыть Phone Drop', url: 'https://github.com/amirksusinok-art/phone-drop' }
        ],
        [
          { text: '📜 Правила и Политика конфиденциальности', url: `${RENDER_EXTERNAL_URL || 'https://github.com/amirksusinok-art/phone-drop'}/privacy` }
        ]
      ]
    };

    await sendTelegramMessage(chatId, welcomeText, inlineKeyboard);
  }
}

async function pollUpdates() {
  if (!isPolling || !BOT_TOKEN) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        await handleUpdate(update);
      }
    } else if (data.error_code === 409) {
      console.warn('[Bot] Webhook конфликт. Сбрасываем webhook...');
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    }
  } catch (err) {
    // Сетевой таймаут / сбой
  }

  if (isPolling) {
    setTimeout(pollUpdates, 800);
  }
}

async function startBot() {
  if (!BOT_TOKEN) {
    console.log('[Bot] BOT_TOKEN не задан. Бот работает в пассивном веб-режиме.');
    return;
  }

  console.log('[Bot] Инициализация Telegram-бота...');
  try {
    // Обязательно сбрасываем старый webhook перед включением polling!
    const delRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    const delData = await delRes.json();
    console.log('[Bot] Сброс webhook:', delData.ok ? 'успешно' : delData.description);
  } catch (err) {
    console.error('[Bot deleteWebhook error]:', err.message);
  }

  isPolling = true;
  pollUpdates();
}

module.exports = {
  startBot,
  handleUpdate
};
