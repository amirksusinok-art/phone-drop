// server/routes/api.js
// REST API для Telegram Mini App Phone Drop
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { COUNTRIES, RARITIES } = require('../patternEngine');

const BOT_TOKEN = process.env.BOT_TOKEN || '';

/**
 * Валидация Telegram WebApp initData по HMAC-SHA256
 */
function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    urlParams.delete('hash');
    const params = Array.from(urlParams.entries())
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(params).digest('hex');

    if (calculatedHash !== hash) return null;

    const userParam = urlParams.get('user');
    return userParam ? JSON.parse(userParam) : null;
  } catch (err) {
    console.error('[Auth] Ошибка проверки initData:', err);
    return null;
  }
}

/**
 * Middleware аутентификации игрока
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const initData = req.headers['x-telegram-init-data'];
    const demoTelegramId = req.headers['x-demo-user-id'];

    let telegramUser = null;

    if (initData && BOT_TOKEN) {
      telegramUser = validateTelegramInitData(initData, BOT_TOKEN);
    }

    // Если валидация через Telegram не прошла или dev/demo режим
    if (!telegramUser) {
      if (demoTelegramId) {
        telegramUser = {
          id: demoTelegramId,
          first_name: req.headers['x-demo-name'] || 'Demo Игрок',
          username: req.headers['x-demo-username'] || 'demo_player',
          photo_url: ''
        };
      } else {
        return res.status(401).json({ error: 'Требуется авторизация Telegram' });
      }
    }

    const tgIdStr = String(telegramUser.id);
    let user = await db.queryOne('SELECT * FROM users WHERE telegram_id = ?', [tgIdStr]);
    let isReferralBonusGiven = false;
    const startParam = req.headers['x-start-param'] || '';

    if (!user) {
      let referrerId = null;
      let startCoins = 250;

      if (startParam.startsWith('ref_')) {
        const refIdStr = startParam.replace('ref_', '').trim();
        const referrer = await db.queryOne(
          'SELECT id, telegram_id FROM users WHERE telegram_id = ? OR id = ?',
          [refIdStr, Number(refIdStr) || 0]
        );
        if (referrer && String(referrer.telegram_id) !== tgIdStr && String(referrer.id) !== tgIdStr) {
          referrerId = referrer.id;
          startCoins = 350; // +100 Coins бонус новичку
          isReferralBonusGiven = true;

          // Начисляем рефереру +150 Coins
          await db.run(
            'UPDATE users SET coins = coins + 150, referral_earnings = referral_earnings + 150 WHERE id = ?',
            [referrer.id]
          );
        }
      }

      // Регистрация нового игрока
      await db.run(
        `INSERT INTO users (telegram_id, username, first_name, avatar_url, coins, max_inventory, referrer_id)
         VALUES (?, ?, ?, ?, ?, 50, ?)`,
        [tgIdStr, telegramUser.username || '', telegramUser.first_name || 'Игрок', telegramUser.photo_url || '', startCoins, referrerId]
      );
      user = await db.queryOne('SELECT * FROM users WHERE telegram_id = ?', [tgIdStr]);

      if (referrerId) {
        try {
          await db.run(
            'INSERT INTO referrals (referrer_id, referred_id, bonus_coins) VALUES (?, ?, 150)',
            [referrerId, user.id]
          );
        } catch {}
      }
    } else if (!user.referrer_id && startParam.startsWith('ref_')) {
      // Игрок уже запускал бота ранее, но еще не был ни к кому привязан и перешел по ссылке друга
      const refIdStr = startParam.replace('ref_', '').trim();
      const referrer = await db.queryOne(
        'SELECT id, telegram_id FROM users WHERE telegram_id = ? OR id = ?',
        [refIdStr, Number(refIdStr) || 0]
      );
      if (referrer && String(referrer.id) !== String(user.id) && String(referrer.telegram_id) !== tgIdStr) {
        await db.run('UPDATE users SET coins = coins + 100, referrer_id = ? WHERE id = ?', [referrer.id, user.id]);
        await db.run('UPDATE users SET coins = coins + 150, referral_earnings = referral_earnings + 150 WHERE id = ?', [referrer.id]);
        try {
          await db.run('INSERT INTO referrals (referrer_id, referred_id, bonus_coins) VALUES (?, ?, 150)', [referrer.id, user.id]);
        } catch {}
        user = await db.queryOne('SELECT * FROM users WHERE id = ?', [user.id]);
        isReferralBonusGiven = true;
      }
    }

    req.user = user;
    req.isReferralBonusGiven = isReferralBonusGiven;
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err);
    res.status(500).json({ error: 'Ошибка сервера при авторизации' });
  }
}

/* -------------------------------------------------------------
 * 1. АВТОРИЗАЦИЯ И ПРОФИЛЬ
 * ------------------------------------------------------------- */

router.post('/auth', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    referralBonus: req.isReferralBonusGiven
  });
});

router.get('/user/profile', authenticate, async (req, res) => {
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  
  // Статистика коллекции
  const stats = await db.queryOne(`
    SELECT 
      COUNT(*) as total_phones,
      COALESCE(SUM(base_price), 0) as total_collection_value
    FROM phones 
    WHERE owner_id = ?
  `, [user.id]);

  // Статистика продаж на рынке
  const tradeStats = await db.queryOne(`
    SELECT COUNT(*) as completed_sales
    FROM market_listings
    WHERE seller_id = ? AND status = 'sold'
  `, [user.id]);

  // Надетый номер
  let equippedPhone = null;
  if (user.equipped_phone_id) {
    equippedPhone = await db.queryOne('SELECT * FROM phones WHERE id = ?', [user.equipped_phone_id]);
  }

  // Купленная косметика
  const cosmetics = await db.query('SELECT type, item_id FROM user_cosmetics WHERE user_id = ?', [user.id]);

  res.json({
    user,
    stats: {
      totalPhones: Number(stats?.total_phones || 0),
      totalValue: Number(stats?.total_collection_value || 0),
      completedSales: Number(tradeStats?.completed_sales || 0)
    },
    equippedPhone,
    ownedCosmetics: cosmetics
  });
});

/* -------------------------------------------------------------
 * 2. КЕЙСЫ (ДРОПЫ) И ВЕРОЯТНОСТИ
 * ------------------------------------------------------------- */

const CASES_CONFIG = {
  common: {
    id: 'common',
    name: 'Обычный кейс',
    description: 'Открытие номера из общего свободного пула всех стран',
    price: 100,
    icon: '📦'
  },
  national: {
    id: 'national',
    name: 'Национальный кейс',
    description: 'Открытие номера из выбранной страны',
    price: 1000,
    icon: '🌍'
  },
  elite: {
    id: 'elite',
    name: 'Элитный кейс',
    description: 'Открытие из пула повышенной редкости (Редкий, Эпический, Легендарный, Мифический)',
    price: 10000,
    icon: '👑'
  }
};

router.get('/cases/info', authenticate, async (req, res) => {
  try {
    // Подсчет доступных номеров по редкостям в общем пуле
    const counts = await db.query(`
      SELECT rarity, COUNT(*) as c 
      FROM phones 
      WHERE status = 'available' 
      GROUP BY rarity
    `);

    const countMap = {};
    let totalAvailable = 0;
    for (const r of counts) {
      countMap[r.rarity] = Number(r.c);
      totalAvailable += Number(r.c);
    }

    // Расчет актуальных динамических вероятностей
    const chances = {};
    for (const key of Object.keys(RARITIES).map(k => k.toLowerCase())) {
      const cnt = countMap[key] || 0;
      chances[key] = totalAvailable > 0 ? Number(((cnt / totalAvailable) * 100).toFixed(3)) : 0;
    }

    // Доступность по странам для национального кейса
    const countriesAvailable = await db.query(`
      SELECT country, COUNT(*) as c
      FROM phones
      WHERE status = 'available'
      GROUP BY country
    `);

    res.json({
      cases: CASES_CONFIG,
      availablePool: countMap,
      totalAvailable,
      chances,
      countriesAvailable: countriesAvailable.reduce((acc, row) => {
        acc[row.country] = Number(row.c);
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('[Cases Info Error]:', err);
    res.status(500).json({ error: 'Ошибка получения информации о кейсах' });
  }
});

router.post('/cases/open', authenticate, async (req, res) => {
  const { caseType, country, opKey } = req.body;
  const cfg = CASES_CONFIG[caseType];

  if (!cfg) {
    return res.status(400).json({ error: 'Неверный тип кейса' });
  }

  // Проверка идемпотентности по opKey
  if (opKey) {
    const existingOp = await db.queryOne('SELECT * FROM operations_log WHERE op_key = ?', [opKey]);
    if (existingOp) {
      const savedResult = JSON.parse(existingOp.details);
      return res.json(savedResult);
    }
  }

  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

  // Проверка баланса
  if (user.coins < cfg.price) {
    return res.status(400).json({ error: `Недостаточно Coins! Требуется ${cfg.price}, у вас ${user.coins}` });
  }

  // Проверка заполненности коллекции
  const ownedCountRow = await db.queryOne('SELECT COUNT(*) as c FROM phones WHERE owner_id = ?', [user.id]);
  const currentOwned = Number(ownedCountRow?.c || 0);

  if (currentOwned >= user.max_inventory) {
    return res.status(400).json({ 
      error: `Коллекция заполнена (${currentOwned}/${user.max_inventory})! Расширьте хранилище или продайте ненужные номера.` 
    });
  }

  // Формирование условий выборки доступного номера
  let whereClause = "status = 'available'";
  const queryParams = [];

  if (caseType === 'national') {
    if (!country || !COUNTRIES[country]) {
      return res.status(400).json({ error: 'Выберите поддерживаемую страну' });
    }
    whereClause += ' AND country = ?';
    queryParams.push(country);
  } else if (caseType === 'elite') {
    whereClause += " AND rarity IN ('rare', 'epic', 'legendary', 'mythic')";
  }

  // Выбираем случайный доступный номер
  const pickSql = `SELECT * FROM phones WHERE ${whereClause} ORDER BY RANDOM() LIMIT 1`;
  const pickedPhone = await db.queryOne(pickSql, queryParams);

  if (!pickedPhone) {
    return res.status(400).json({ error: 'В выбранном пуле закончились доступные номера!' });
  }

  const isFirstDiscovery = !pickedPhone.first_discovered_at;

  // Атомарная операция: списание баланса, назначение владельца, история
  if (!db.isPostgres) {
    const transaction = db.sqliteDb.transaction(() => {
      // 1. Списание монет
      db.sqliteDb.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(cfg.price, user.id);

      // 2. Назначение владельца
      db.sqliteDb.prepare(`
        UPDATE phones 
        SET status = 'owned', 
            owner_id = ?, 
            first_discovered_at = COALESCE(first_discovered_at, CURRENT_TIMESTAMP),
            first_owner_id = COALESCE(first_owner_id, ?)
        WHERE id = ? AND status = 'available'
      `).run(user.id, user.id, pickedPhone.id);

      // 3. Запись в историю
      db.sqliteDb.prepare(`
        INSERT INTO phone_history (phone_id, event_type, to_user_id, price)
        VALUES (?, 'drop', ?, ?)
      `).run(pickedPhone.id, user.id, cfg.price);

      // 4. Лог операции
      if (opKey) {
        db.sqliteDb.prepare(`
          INSERT INTO operations_log (op_key, user_id, action, details)
          VALUES (?, ?, 'open_case', ?)
        `).run(opKey, user.id, JSON.stringify({ phoneId: pickedPhone.id }));
      }
    });

    transaction();
  } else {
    // Для Postgres
    await db.run('UPDATE users SET coins = coins - ? WHERE id = ?', [cfg.price, user.id]);
    await db.run(`
      UPDATE phones 
      SET status = 'owned', 
          owner_id = ?, 
          first_discovered_at = COALESCE(first_discovered_at, NOW()),
          first_owner_id = COALESCE(first_owner_id, ?)
      WHERE id = ? AND status = 'available'
    `, [user.id, user.id, pickedPhone.id]);
    await db.run(`
      INSERT INTO phone_history (phone_id, event_type, to_user_id, price)
      VALUES (?, 'drop', ?, ?)
    `, [pickedPhone.id, user.id, cfg.price]);
    if (opKey) {
      await db.run(`
        INSERT INTO operations_log (op_key, user_id, action, details)
        VALUES (?, ?, 'open_case', ?)
      `, [opKey, user.id, JSON.stringify({ phoneId: pickedPhone.id })]);
    }
  }

  const updatedUser = await db.queryOne('SELECT coins FROM users WHERE id = ?', [user.id]);
  const finalPhone = await db.queryOne('SELECT * FROM phones WHERE id = ?', [pickedPhone.id]);

  res.json({
    success: true,
    phone: finalPhone,
    isFirstDiscovery,
    newBalance: updatedUser.coins
  });
});

/* -------------------------------------------------------------
 * 3. ПРОДАЖА НОМЕРА СИСТЕМЕ (ВОЗВРАТ В СВОБОДНЫЙ ПУЛ)
 * ------------------------------------------------------------- */

router.post('/phone/sell-system', authenticate, async (req, res) => {
  const { phoneId } = req.body;
  const user = req.user;

  const phone = await db.queryOne('SELECT * FROM phones WHERE id = ? AND owner_id = ?', [phoneId, user.id]);

  if (!phone) {
    return res.status(404).json({ error: 'Номер не найден или не принадлежит вам' });
  }

  if (phone.status === 'listed') {
    return res.status(400).json({ error: 'Сначала снимите номер с продажи на рынке' });
  }

  const refundCoins = phone.base_price;

  // Возврат в пул со статусом available (recycled), сохраняя историю
  if (!db.isPostgres) {
    const tx = db.sqliteDb.transaction(() => {
      db.sqliteDb.prepare(`
        UPDATE phones 
        SET status = 'available', owner_id = NULL 
        WHERE id = ?
      `).run(phone.id);

      db.sqliteDb.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(refundCoins, user.id);

      // Если номер был надет в профиле — снимаем
      db.sqliteDb.prepare(`
        UPDATE users SET equipped_phone_id = NULL WHERE id = ? AND equipped_phone_id = ?
      `).run(user.id, phone.id);

      db.sqliteDb.prepare(`
        INSERT INTO phone_history (phone_id, event_type, from_user_id, price)
        VALUES (?, 'sell_system', ?, ?)
      `).run(phone.id, user.id, refundCoins);
    });
    tx();
  } else {
    await db.run("UPDATE phones SET status = 'available', owner_id = NULL WHERE id = ?", [phone.id]);
    await db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [refundCoins, user.id]);
    await db.run('UPDATE users SET equipped_phone_id = NULL WHERE id = ? AND equipped_phone_id = ?', [user.id, phone.id]);
    await db.run(`
      INSERT INTO phone_history (phone_id, event_type, from_user_id, price)
      VALUES (?, 'sell_system', ?, ?)
    `, [phone.id, user.id, refundCoins]);
  }

  const updatedUser = await db.queryOne('SELECT coins FROM users WHERE id = ?', [user.id]);

  res.json({
    success: true,
    refundCoins,
    newBalance: updatedUser.coins
  });
});

/* -------------------------------------------------------------
 * 4. КОЛЛЕКЦИЯ И КАРТОЧКА НОМЕРА
 * ------------------------------------------------------------- */

router.get('/inventory', authenticate, async (req, res) => {
  const { country, rarity, category, sortBy, search } = req.query;
  const user = req.user;

  let sql = 'SELECT * FROM phones WHERE owner_id = ?';
  const params = [user.id];

  if (country) {
    sql += ' AND country = ?';
    params.push(country);
  }
  if (rarity) {
    sql += ' AND rarity = ?';
    params.push(rarity);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND (formatted_number LIKE ? OR raw_national_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Сортировка
  if (sortBy === 'price_desc') sql += ' ORDER BY base_price DESC';
  else if (sortBy === 'price_asc') sql += ' ORDER BY base_price ASC';
  else if (sortBy === 'score_desc') sql += ' ORDER BY score DESC';
  else sql += ' ORDER BY id DESC';

  const inventory = await db.query(sql, params);
  const userRow = await db.queryOne('SELECT coins, max_inventory, equipped_phone_id FROM users WHERE id = ?', [user.id]);

  res.json({
    inventory,
    count: inventory.length,
    maxInventory: userRow.max_inventory,
    equippedPhoneId: userRow.equipped_phone_id
  });
});

router.get('/phone/:id', authenticate, async (req, res) => {
  const phone = await db.queryOne('SELECT * FROM phones WHERE id = ?', [req.params.id]);
  if (!phone) {
    return res.status(404).json({ error: 'Номер не найден' });
  }

  // Владелец
  let owner = null;
  if (phone.owner_id) {
    owner = await db.queryOne('SELECT id, username, first_name, is_public FROM users WHERE id = ?', [phone.owner_id]);
  }

  // Первый открыватель
  let firstOwner = null;
  if (phone.first_owner_id) {
    firstOwner = await db.queryOne('SELECT id, username, first_name, is_public FROM users WHERE id = ?', [phone.first_owner_id]);
  }

  // История передач
  const history = await db.query(`
    SELECT h.*, 
           u_from.first_name as from_name, u_from.username as from_user,
           u_to.first_name as to_name, u_to.username as to_user
    FROM phone_history h
    LEFT JOIN users u_from ON h.from_user_id = u_from.id
    LEFT JOIN users u_to ON h.to_user_id = u_to.id
    WHERE h.phone_id = ?
    ORDER BY h.created_at DESC
  `, [phone.id]);

  res.json({
    phone,
    owner: owner && owner.is_public ? owner : (owner ? { id: owner.id, first_name: 'Скрыт' } : null),
    firstOwner: firstOwner && firstOwner.is_public ? firstOwner : (firstOwner ? { id: firstOwner.id, first_name: 'Скрыт' } : null),
    history
  });
});

router.post('/phone/equip', authenticate, async (req, res) => {
  const { phoneId } = req.body;
  const user = req.user;

  if (phoneId === null) {
    await db.run('UPDATE users SET equipped_phone_id = NULL WHERE id = ?', [user.id]);
    return res.json({ success: true, equippedPhoneId: null });
  }

  const phone = await db.queryOne('SELECT * FROM phones WHERE id = ? AND owner_id = ?', [phoneId, user.id]);
  if (!phone) {
    return res.status(400).json({ error: 'Вы можете надеть в профиль только принадлежащий вам номер' });
  }

  await db.run('UPDATE users SET equipped_phone_id = ? WHERE id = ?', [phone.id, user.id]);
  res.json({ success: true, equippedPhoneId: phone.id });
});

/* -------------------------------------------------------------
 * 5. РАСШИРЕНИЕ КОЛЛЕКЦИИ
 * ------------------------------------------------------------- */

const INVENTORY_UPGRADE_TIERS = {
  50: { nextSlots: 75, price: 2000 },
  75: { nextSlots: 100, price: 5000 },
  100: { nextSlots: 125, price: 10000 },
  125: { nextSlots: 150, price: 20000 }
};

router.post('/user/expand-inventory', authenticate, async (req, res) => {
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const upgrade = INVENTORY_UPGRADE_TIERS[user.max_inventory];

  if (!upgrade) {
    return res.status(400).json({ error: 'Достигнута максимальная вместимость коллекции (150 слотов)' });
  }

  if (user.coins < upgrade.price) {
    return res.status(400).json({ error: `Недостаточно Coins! Требуется ${upgrade.price}` });
  }

  await db.run('UPDATE users SET coins = coins - ?, max_inventory = ? WHERE id = ?', [upgrade.price, upgrade.nextSlots, user.id]);
  const updatedUser = await db.queryOne('SELECT coins, max_inventory FROM users WHERE id = ?', [user.id]);

  res.json({
    success: true,
    newCapacity: updatedUser.max_inventory,
    newBalance: updatedUser.coins
  });
});

/* -------------------------------------------------------------
 * 6. РЫНОК (ТОРГОВАЯ ПЛОЩАДКА С КОМИССИЕЙ 5%)
 * ------------------------------------------------------------- */

router.get('/market', authenticate, async (req, res) => {
  const { country, rarity, category, search, minPrice, maxPrice, sortBy, myOnly } = req.query;
  const user = req.user;

  let sql = `
    SELECT m.id as listing_id, m.price, m.fee_amount, m.seller_revenue, m.created_at as listed_at,
           m.seller_id, u.first_name as seller_name, u.username as seller_username,
           p.*
    FROM market_listings m
    JOIN phones p ON m.phone_id = p.id
    JOIN users u ON m.seller_id = u.id
    WHERE m.status = 'active'
  `;
  const params = [];

  if (myOnly === 'true') {
    sql += ' AND m.seller_id = ?';
    params.push(user.id);
  }
  if (country) {
    sql += ' AND p.country = ?';
    params.push(country);
  }
  if (rarity) {
    sql += ' AND p.rarity = ?';
    params.push(rarity);
  }
  if (category) {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (minPrice) {
    sql += ' AND m.price >= ?';
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    sql += ' AND m.price <= ?';
    params.push(Number(maxPrice));
  }
  if (search) {
    sql += ' AND (p.formatted_number LIKE ? OR p.raw_national_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (sortBy === 'price_asc') sql += ' ORDER BY m.price ASC';
  else if (sortBy === 'price_desc') sql += ' ORDER BY m.price DESC';
  else if (sortBy === 'score_desc') sql += ' ORDER BY p.score DESC';
  else sql += ' ORDER BY m.created_at DESC';

  const listings = await db.query(sql, params);
  res.json({ listings });
});

router.post('/market/list', authenticate, async (req, res) => {
  const { phoneId, price } = req.body;
  const user = req.user;

  const numPrice = Math.floor(Number(price));
  if (isNaN(numPrice) || numPrice < 100) {
    return res.status(400).json({ error: 'Минимальная цена выставления — 100 Coins' });
  }

  const phone = await db.queryOne('SELECT * FROM phones WHERE id = ? AND owner_id = ?', [phoneId, user.id]);
  if (!phone) {
    return res.status(404).json({ error: 'Номер не найден или не принадлежит вам' });
  }

  if (phone.status !== 'owned') {
    return res.status(400).json({ error: 'Номер уже выставлен на продажу или заблокирован' });
  }

  // Расчет комиссии 5%
  const feeAmount = Math.round(numPrice * 0.05);
  const sellerRevenue = numPrice - feeAmount;

  if (!db.isPostgres) {
    const tx = db.sqliteDb.transaction(() => {
      db.sqliteDb.prepare("UPDATE phones SET status = 'listed' WHERE id = ?").run(phone.id);
      db.sqliteDb.prepare(`
        INSERT INTO market_listings (phone_id, seller_id, price, fee_amount, seller_revenue, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `).run(phone.id, user.id, numPrice, feeAmount, sellerRevenue);
      db.sqliteDb.prepare(`
        INSERT INTO phone_history (phone_id, event_type, from_user_id, price)
        VALUES (?, 'list_market', ?, ?)
      `).run(phone.id, user.id, numPrice);
    });
    tx();
  } else {
    await db.run("UPDATE phones SET status = 'listed' WHERE id = ?", [phone.id]);
    await db.run(`
      INSERT INTO market_listings (phone_id, seller_id, price, fee_amount, seller_revenue, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [phone.id, user.id, numPrice, feeAmount, sellerRevenue]);
    await db.run(`
      INSERT INTO phone_history (phone_id, event_type, from_user_id, price)
      VALUES (?, 'list_market', ?, ?)
    `, [phone.id, user.id, numPrice]);
  }

  res.json({ success: true, price: numPrice, feeAmount, sellerRevenue });
});

router.post('/market/cancel', authenticate, async (req, res) => {
  const { listingId } = req.body;
  const user = req.user;

  const listing = await db.queryOne('SELECT * FROM market_listings WHERE id = ? AND seller_id = ? AND status = \'active\'', [listingId, user.id]);
  if (!listing) {
    return res.status(404).json({ error: 'Активное объявление не найдено' });
  }

  if (!db.isPostgres) {
    const tx = db.sqliteDb.transaction(() => {
      db.sqliteDb.prepare("UPDATE market_listings SET status = 'cancelled' WHERE id = ?").run(listing.id);
      db.sqliteDb.prepare("UPDATE phones SET status = 'owned' WHERE id = ?").run(listing.phone_id);
      db.sqliteDb.prepare(`
        INSERT INTO phone_history (phone_id, event_type, from_user_id, price)
        VALUES (?, 'cancel_market', ?, ?)
      `).run(listing.phone_id, user.id, listing.price);
    });
    tx();
  } else {
    await db.run("UPDATE market_listings SET status = 'cancelled' WHERE id = ?", [listing.id]);
    await db.run("UPDATE phones SET status = 'owned' WHERE id = ?", [listing.phone_id]);
    await db.run(`
      INSERT INTO phone_history (phone_id, event_type, from_user_id, price)
      VALUES (?, 'cancel_market', ?, ?)
    `, [listing.phone_id, user.id, listing.price]);
  }

  res.json({ success: true, message: 'Объявление успешно отменено' });
});

router.post('/market/buy', authenticate, async (req, res) => {
  const { listingId } = req.body;
  const buyer = req.user;

  const listing = await db.queryOne('SELECT * FROM market_listings WHERE id = ? AND status = \'active\'', [listingId]);
  if (!listing) {
    return res.status(404).json({ error: 'Объявление не найдено или уже продано' });
  }

  if (listing.seller_id === buyer.id) {
    return res.status(400).json({ error: 'Нельзя купить собственный номер' });
  }

  const freshBuyer = await db.queryOne('SELECT * FROM users WHERE id = ?', [buyer.id]);
  if (freshBuyer.coins < listing.price) {
    return res.status(400).json({ error: `Недостаточно Coins! Требуется ${listing.price}, у вас ${freshBuyer.coins}` });
  }

  // Проверка лимита инвентаря покупателя
  const buyerInventory = await db.queryOne('SELECT COUNT(*) as c FROM phones WHERE owner_id = ?', [buyer.id]);
  if (Number(buyerInventory?.c || 0) >= freshBuyer.max_inventory) {
    return res.status(400).json({ error: 'Ваша коллекция заполнена! Расширьте хранилище перед покупкой.' });
  }

  // Атомарная сделка: списание у покупателя, начисление продавцу за вычетом 5%, передача предмета
  if (!db.isPostgres) {
    const tx = db.sqliteDb.transaction(() => {
      // Списание с покупателя
      db.sqliteDb.prepare('UPDATE users SET coins = coins - ? WHERE id = ?').run(listing.price, buyer.id);
      // Начисление продавцу дохода
      db.sqliteDb.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(listing.seller_revenue, listing.seller_id);
      // Смена владельца номера
      db.sqliteDb.prepare("UPDATE phones SET status = 'owned', owner_id = ? WHERE id = ?").run(buyer.id, listing.phone_id);
      // Закрытие листинга
      db.sqliteDb.prepare("UPDATE market_listings SET status = 'sold' WHERE id = ?").run(listing.id);
      // Запись в историю
      db.sqliteDb.prepare(`
        INSERT INTO phone_history (phone_id, event_type, from_user_id, to_user_id, price)
        VALUES (?, 'buy_market', ?, ?, ?)
      `).run(listing.phone_id, listing.seller_id, buyer.id, listing.price);
    });
    tx();
  } else {
    await db.run('UPDATE users SET coins = coins - ? WHERE id = ?', [listing.price, buyer.id]);
    await db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [listing.seller_revenue, listing.seller_id]);
    await db.run("UPDATE phones SET status = 'owned', owner_id = ? WHERE id = ?", [buyer.id, listing.phone_id]);
    await db.run("UPDATE market_listings SET status = 'sold' WHERE id = ?", [listing.id]);
    await db.run(`
      INSERT INTO phone_history (phone_id, event_type, from_user_id, to_user_id, price)
      VALUES (?, 'buy_market', ?, ?, ?)
    `, [listing.phone_id, listing.seller_id, buyer.id, listing.price]);
  }

  const updatedBuyer = await db.queryOne('SELECT coins FROM users WHERE id = ?', [buyer.id]);

  res.json({
    success: true,
    newBalance: updatedBuyer.coins,
    message: 'Номер успешно приобретен!'
  });
});

/* -------------------------------------------------------------
 * 7. РЕЙТИНГИ (ТОП НОМЕРОВ И ИГРОКОВ)
 * ------------------------------------------------------------- */

router.get('/leaderboard/phones', authenticate, async (req, res) => {
  const { tab, country } = req.query;

  let sql = `
    SELECT p.*, u.first_name as owner_name, u.username as owner_username, u.is_public
    FROM phones p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (country) {
    sql += ' AND p.country = ?';
    params.push(country);
  }

  if (tab === 'most_expensive') {
    sql += ' ORDER BY p.base_price DESC, p.score DESC LIMIT 50';
  } else if (tab === 'rarest') {
    sql += " ORDER BY CASE p.rarity WHEN 'mythic' THEN 1 WHEN 'legendary' THEN 2 WHEN 'epic' THEN 3 WHEN 'rare' THEN 4 WHEN 'uncommon' THEN 5 ELSE 6 END, p.score DESC LIMIT 50";
  } else if (tab === 'monoliths') {
    sql += " AND p.category = 'Монолит' ORDER BY p.score DESC LIMIT 50";
  } else if (tab === 'mirrors') {
    sql += " AND p.category = 'Зеркальный' ORDER BY p.score DESC LIMIT 50";
  } else if (tab === 'sequences') {
    sql += " AND p.category IN ('Восходящий', 'Нисходящий') ORDER BY p.score DESC LIMIT 50";
  } else {
    sql += ' ORDER BY p.score DESC LIMIT 50';
  }

  const phones = await db.query(sql, params);
  res.json({ phones });
});

router.get('/leaderboard/players', authenticate, async (req, res) => {
  const { tab } = req.query;

  let sql = '';
  if (tab === 'richest') {
    sql = `
      SELECT id, username, first_name, avatar_url, avatar_frame, coins,
             (SELECT COUNT(*) FROM phones WHERE owner_id = users.id) as phones_count
      FROM users 
      WHERE is_public = 1
      ORDER BY coins DESC 
      LIMIT 50
    `;
  } else if (tab === 'best_collections') {
    sql = `
      SELECT u.id, u.username, u.first_name, u.avatar_url, u.avatar_frame, u.coins,
             COUNT(p.id) as phones_count,
             COALESCE(SUM(p.base_price), 0) as total_value
      FROM users u
      JOIN phones p ON p.owner_id = u.id
      WHERE u.is_public = 1
      GROUP BY u.id
      ORDER BY total_value DESC
      LIMIT 50
    `;
  } else if (tab === 'top_traders') {
    sql = `
      SELECT u.id, u.username, u.first_name, u.avatar_url, u.avatar_frame,
             COUNT(m.id) as deals_count
      FROM users u
      JOIN market_listings m ON m.seller_id = u.id AND m.status = 'sold'
      WHERE u.is_public = 1
      GROUP BY u.id
      ORDER BY deals_count DESC
      LIMIT 50
    `;
  }

  const players = await db.query(sql);
  res.json({ players });
});

/* -------------------------------------------------------------
 * 8. АЛЬБОМЫ И КОЛЛЕКЦИИ СТРАН
 * ------------------------------------------------------------- */

router.get('/albums', authenticate, async (req, res) => {
  const user = req.user;

  // Найденные категории по каждой стране
  const userFound = await db.query(`
    SELECT DISTINCT country, category 
    FROM phones 
    WHERE owner_id = ?
  `, [user.id]);

  const progressByCountry = {};
  for (const cKey of Object.keys(COUNTRIES)) {
    progressByCountry[cKey] = {
      country: cKey,
      name: COUNTRIES[cKey].name,
      flag: COUNTRIES[cKey].flag,
      foundCategories: [],
      totalCategories: 12
    };
  }

  for (const row of userFound) {
    if (progressByCountry[row.country]) {
      progressByCountry[row.country].foundCategories.push(row.category);
    }
  }

  res.json({ albums: progressByCountry });
});

/* -------------------------------------------------------------
 * 9. МАГАЗИН ПЕРСОНАЛИЗАЦИИ
 * ------------------------------------------------------------- */

const COSMETICS_CATALOG = [
  { id: 'frame_neon_blue', type: 'frame', name: 'Неоновый импульс', price: 1000, preview: 'border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]' },
  { id: 'frame_gold_luxury', type: 'frame', name: 'Золотой люкс', price: 5000, preview: 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]' },
  { id: 'frame_cyber_violet', type: 'frame', name: 'Киберпанк 2077', price: 10000, preview: 'border-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.85)]' },
  { id: 'frame_mythic_rainbow', type: 'frame', name: 'Мифическое сияние', price: 25000, preview: 'border-pink-500 shadow-[0_0_22px_rgba(236,72,153,0.9)] animate-pulse' },
  { id: 'bg_deep_space', type: 'bg', name: 'Глубокий космос', price: 1500, preview: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-black' },
  { id: 'bg_tokyo_neon', type: 'bg', name: 'Неоновый Токио', price: 5000, preview: 'bg-gradient-to-br from-purple-950 via-pink-950 to-slate-950' },
  { id: 'bg_gold_prestige', type: 'bg', name: 'Золотой престиж', price: 15000, preview: 'bg-gradient-to-br from-amber-950 via-yellow-950 to-slate-950' }
];

router.get('/cosmetics', authenticate, async (req, res) => {
  const owned = await db.query('SELECT item_id FROM user_cosmetics WHERE user_id = ?', [req.user.id]);
  const ownedSet = new Set(owned.map(r => r.item_id));

  const items = COSMETICS_CATALOG.map(item => ({
    ...item,
    isOwned: ownedSet.has(item.id)
  }));

  res.json({ cosmetics: items });
});

router.post('/user/buy-cosmetic', authenticate, async (req, res) => {
  const { itemId } = req.body;
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

  const item = COSMETICS_CATALOG.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Предмет не найден' });

  const alreadyOwned = await db.queryOne('SELECT * FROM user_cosmetics WHERE user_id = ? AND item_id = ?', [user.id, itemId]);
  if (alreadyOwned) return res.status(400).json({ error: 'У вас уже куплен этот предмет' });

  if (user.coins < item.price) {
    return res.status(400).json({ error: `Недостаточно Coins! Требуется ${item.price}` });
  }

  await db.run('UPDATE users SET coins = coins - ? WHERE id = ?', [item.price, user.id]);
  await db.run('INSERT INTO user_cosmetics (user_id, type, item_id) VALUES (?, ?, ?)', [user.id, item.type, itemId]);

  const updatedUser = await db.queryOne('SELECT coins FROM users WHERE id = ?', [user.id]);
  res.json({ success: true, newBalance: updatedUser.coins });
});

router.post('/user/equip-cosmetic', authenticate, async (req, res) => {
  const { type, itemId } = req.body;
  const user = req.user;

  if (itemId !== 'default') {
    const owned = await db.queryOne('SELECT * FROM user_cosmetics WHERE user_id = ? AND item_id = ?', [user.id, itemId]);
    if (!owned) return res.status(400).json({ error: 'Этот предмет вами не приобретен' });
  }

  if (type === 'frame') {
    await db.run('UPDATE users SET avatar_frame = ? WHERE id = ?', [itemId, user.id]);
  } else if (type === 'bg') {
    await db.run('UPDATE users SET profile_bg = ? WHERE id = ?', [itemId, user.id]);
  }

  res.json({ success: true, equipped: itemId });
});

/* -------------------------------------------------------------
 * 10. РЕФЕРАЛЬНАЯ СИСТЕМА (ДРУЗЬЯ)
 * ------------------------------------------------------------- */
router.get('/referrals', authenticate, async (req, res) => {
  const user = req.user;
  const botUsername = process.env.BOT_USERNAME || 'phonedrop_bot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.telegram_id}`;

  const friends = await db.query(`
    SELECT r.id, r.bonus_coins, r.created_at,
           u.first_name, u.username, u.avatar_url
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `, [user.id]);

  const freshUser = await db.queryOne('SELECT referral_earnings FROM users WHERE id = ?', [user.id]);

  res.json({
    referralLink,
    telegramId: user.telegram_id,
    totalEarnings: freshUser?.referral_earnings || 0,
    friendsCount: friends.length,
    friends
  });
});

/* -------------------------------------------------------------
 * 11. КРАФТ НОМЕРОВ (LUCKY FUSION 5 в 1)
 * ------------------------------------------------------------- */
const CRAFT_TIERS = {
  common: { next: 'uncommon', lucky: 'rare', luckyChance: 0.10 },
  uncommon: { next: 'rare', lucky: 'epic', luckyChance: 0.10 },
  rare: { next: 'epic', lucky: 'legendary', luckyChance: 0.10 },
  epic: { next: 'legendary', lucky: 'mythic', luckyChance: 0.10 }
};

router.post('/craft/fuse', authenticate, async (req, res) => {
  const { phoneIds } = req.body;
  const user = req.user;

  if (!Array.isArray(phoneIds) || phoneIds.length !== 5) {
    return res.status(400).json({ error: 'Для обмена необходимо выбрать ровно 5 номеров' });
  }

  const uniqueIds = [...new Set(phoneIds)];
  if (uniqueIds.length !== 5) {
    return res.status(400).json({ error: 'Номера в контракте должны быть уникальными' });
  }

  const phones = await db.query(`
    SELECT * FROM phones WHERE id IN (?, ?, ?, ?, ?) AND owner_id = ? AND status = 'owned'
  `, [...uniqueIds, user.id]);

  if (phones.length !== 5) {
    return res.status(400).json({ error: 'Все 5 номеров должны принадлежать вам и не быть выставлены на рынок' });
  }

  const baseRarity = phones[0].rarity;
  const allSameRarity = phones.every(p => p.rarity === baseRarity);
  if (!allSameRarity) {
    return res.status(400).json({ error: 'Все 5 номеров должны быть одной редкости' });
  }

  const craftRule = CRAFT_TIERS[baseRarity];
  if (!craftRule) {
    return res.status(400).json({ error: 'Номера мифической редкости нельзя использовать в синтезе' });
  }

  const isLuckyRoll = Math.random() < craftRule.luckyChance;
  const targetRarity = isLuckyRoll ? craftRule.lucky : craftRule.next;

  let resultPhone = await db.queryOne(`
    SELECT * FROM phones WHERE status = 'available' AND rarity = ? ORDER BY RANDOM() LIMIT 1
  `, [targetRarity]);

  if (!resultPhone && isLuckyRoll) {
    resultPhone = await db.queryOne(`
      SELECT * FROM phones WHERE status = 'available' AND rarity = ? ORDER BY RANDOM() LIMIT 1
    `, [craftRule.next]);
  }

  if (!resultPhone) {
    return res.status(400).json({ error: 'В свободном пуле временно закончились номера для синтеза' });
  }

  if (!db.isPostgres) {
    const tx = db.sqliteDb.transaction(() => {
      for (const p of phones) {
        db.sqliteDb.prepare("UPDATE phones SET status = 'available', owner_id = NULL WHERE id = ?").run(p.id);
        db.sqliteDb.prepare("INSERT INTO phone_history (phone_id, event_type, from_user_id) VALUES (?, 'craft_burn', ?)").run(p.id, user.id);
        db.sqliteDb.prepare("UPDATE users SET equipped_phone_id = NULL WHERE id = ? AND equipped_phone_id = ?").run(user.id, p.id);
      }

      db.sqliteDb.prepare(`
        UPDATE phones 
        SET status = 'owned', 
            owner_id = ?,
            first_discovered_at = COALESCE(first_discovered_at, CURRENT_TIMESTAMP),
            first_owner_id = COALESCE(first_owner_id, ?)
        WHERE id = ?
      `).run(user.id, user.id, resultPhone.id);

      db.sqliteDb.prepare("INSERT INTO phone_history (phone_id, event_type, to_user_id) VALUES (?, 'craft_result', ?)").run(resultPhone.id, user.id);
    });
    tx();
  } else {
    for (const p of phones) {
      await db.run("UPDATE phones SET status = 'available', owner_id = NULL WHERE id = ?", [p.id]);
      await db.run("INSERT INTO phone_history (phone_id, event_type, from_user_id) VALUES (?, 'craft_burn', ?)", [p.id, user.id]);
      await db.run("UPDATE users SET equipped_phone_id = NULL WHERE id = ? AND equipped_phone_id = ?", [user.id, p.id]);
    }
    await db.run(`
      UPDATE phones 
      SET status = 'owned', 
          owner_id = ?,
          first_discovered_at = COALESCE(first_discovered_at, NOW()),
          first_owner_id = COALESCE(first_owner_id, ?)
      WHERE id = ?
    `, [user.id, user.id, resultPhone.id]);
    await db.run("INSERT INTO phone_history (phone_id, event_type, to_user_id) VALUES (?, 'craft_result', ?)", [resultPhone.id, user.id]);
  }

  const finalPhone = await db.queryOne('SELECT * FROM phones WHERE id = ?', [resultPhone.id]);

  res.json({
    success: true,
    phone: finalPhone,
    isLuckyUpgrade: isLuckyRoll && finalPhone.rarity === craftRule.lucky
  });
});

/* -------------------------------------------------------------
 * 12. TELEGRAM STARS (МОНЕТИЗАЦИЯ)
 * ------------------------------------------------------------- */
const STARS_PACKAGES = [
  { id: 'pack_10', stars: 10, coins: 1000, title: '1 000 Coins', description: 'Стартовый набор для открытий' },
  { id: 'pack_30', stars: 30, coins: 5000, title: '5 000 Coins', description: 'Популярный набор коллекционера' },
  { id: 'pack_50', stars: 50, coins: 25000, title: '25 000 Coins', description: 'Супер-выгода для элитных кейсов' }
];

router.get('/stars/packages', (req, res) => {
  res.json({ packages: STARS_PACKAGES });
});

router.post('/stars/buy', authenticate, async (req, res) => {
  const { packageId } = req.body;
  const user = req.user;

  const pkg = STARS_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    return res.status(400).json({ error: 'Пакет не найден' });
  }

  const initData = req.headers['x-telegram-init-data'];
  if (initData && BOT_TOKEN) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${pkg.coins.toLocaleString()} Coins`,
          description: pkg.description,
          payload: JSON.stringify({ userId: user.id, pkgId: pkg.id, coins: pkg.coins }),
          currency: 'XTR',
          prices: [{ label: `${pkg.coins.toLocaleString()} Coins`, amount: pkg.stars }]
        })
      });
      const data = await resp.json();
      if (data.ok && data.result) {
        return res.json({ success: true, invoiceLink: data.result });
      }
    } catch (err) {
      console.error('[Stars Error]:', err);
    }
  }

  // Demo fallback
  await db.run('UPDATE users SET coins = coins + ? WHERE id = ?', [pkg.coins, user.id]);
  await db.run('INSERT INTO stars_orders (user_id, stars_amount, coins_amount, status) VALUES (?, ?, ?, ?)', [
    user.id, pkg.stars, pkg.coins, 'completed'
  ]);

  const updatedUser = await db.queryOne('SELECT coins FROM users WHERE id = ?', [user.id]);

  res.json({
    success: true,
    isDemo: true,
    coinsAdded: pkg.coins,
    newBalance: updatedUser.coins,
    message: `Успешно начислено +${pkg.coins.toLocaleString()} Coins!`
  });
});

/* -------------------------------------------------------------
 * 13. СИГНАЛ СЕТИ (ПАССИВНЫЙ ДОХОД) И ПИНГ СТАНЦИИ (КЛИКЕР)
 * ------------------------------------------------------------- */
const PASSIVE_RATES = {
  common: 5,
  uncommon: 10,
  rare: 20,
  epic: 35,
  legendary: 50,
  mythic: 80
};

router.get('/signal/status', authenticate, async (req, res) => {
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  
  let ratePerHour = 3;
  let equippedPhone = null;

  if (user.equipped_phone_id) {
    equippedPhone = await db.queryOne('SELECT * FROM phones WHERE id = ?', [user.equipped_phone_id]);
    if (equippedPhone && PASSIVE_RATES[equippedPhone.rarity]) {
      ratePerHour = PASSIVE_RATES[equippedPhone.rarity];
    }
  }

  const now = Date.now();
  const lastClaim = user.last_signal_claim ? new Date(user.last_signal_claim).getTime() : now;
  const elapsedHours = Math.max(0, (now - lastClaim) / (3600 * 1000));
  const cappedHours = Math.min(8, elapsedHours);
  const uncollectedCoins = Math.floor(cappedHours * ratePerHour);
  const progressPercent = Math.min(100, Math.round((elapsedHours / 8) * 100));

  const lastEnergy = user.last_energy_update ? new Date(user.last_energy_update).getTime() : now;
  const elapsedSeconds = Math.max(0, (now - lastEnergy) / 1000);
  const recoveredEnergy = Math.floor(elapsedSeconds / 3);
  const currentEnergy = Math.min(250, (user.energy !== null && user.energy !== undefined ? user.energy : 250) + recoveredEnergy);

  res.json({
    ratePerHour,
    uncollectedCoins,
    maxCapCoins: ratePerHour * 8,
    progressPercent,
    currentEnergy,
    maxEnergy: 250,
    equippedPhone
  });
});

router.post('/signal/claim', authenticate, async (req, res) => {
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  
  let ratePerHour = 3;
  if (user.equipped_phone_id) {
    const phone = await db.queryOne('SELECT * FROM phones WHERE id = ?', [user.equipped_phone_id]);
    if (phone && PASSIVE_RATES[phone.rarity]) {
      ratePerHour = PASSIVE_RATES[phone.rarity];
    }
  }

  const now = Date.now();
  const lastClaim = user.last_signal_claim ? new Date(user.last_signal_claim).getTime() : now;
  const elapsedHours = Math.max(0, (now - lastClaim) / (3600 * 1000));
  const cappedHours = Math.min(8, elapsedHours);
  const uncollectedCoins = Math.floor(cappedHours * ratePerHour);

  if (uncollectedCoins <= 0) {
    return res.status(400).json({ error: 'Сигнал еще накапливается! Подождите немного.' });
  }

  if (db.isPostgres) {
    await db.run('UPDATE users SET coins = coins + ?, last_signal_claim = NOW() WHERE id = ?', [uncollectedCoins, user.id]);
  } else {
    await db.run('UPDATE users SET coins = coins + ?, last_signal_claim = CURRENT_TIMESTAMP WHERE id = ?', [uncollectedCoins, user.id]);
  }

  const freshUser = await db.queryOne('SELECT coins FROM users WHERE id = ?', [user.id]);

  res.json({
    success: true,
    claimedCoins: uncollectedCoins,
    newBalance: freshUser.coins
  });
});

router.post('/signal/tap', authenticate, async (req, res) => {
  const { count, luckyHits = 0 } = req.body;
  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

  const tapCount = Math.floor(Number(count) || 0);
  const lucky = Math.floor(Number(luckyHits) || 0);

  if (tapCount <= 0 || tapCount > 250) {
    return res.status(400).json({ error: 'Некорректное число тапов' });
  }

  const now = Date.now();
  const lastEnergy = user.last_energy_update ? new Date(user.last_energy_update).getTime() : now;
  const elapsedSeconds = Math.max(0, (now - lastEnergy) / 1000);
  const recoveredEnergy = Math.floor(elapsedSeconds / 3);
  const currentEnergy = Math.min(250, (user.energy !== null && user.energy !== undefined ? user.energy : 250) + recoveredEnergy);

  if (tapCount > currentEnergy) {
    return res.status(400).json({ error: 'Недостаточно энергии' });
  }

  const validatedLucky = Math.min(lucky, Math.max(1, Math.floor(tapCount * 0.1)));
  const earnedCoins = tapCount * 1 + validatedLucky * 25;
  const remainingEnergy = currentEnergy - tapCount;

  if (db.isPostgres) {
    await db.run('UPDATE users SET coins = coins + ?, energy = ?, last_energy_update = NOW() WHERE id = ?', [earnedCoins, remainingEnergy, user.id]);
  } else {
    await db.run('UPDATE users SET coins = coins + ?, energy = ?, last_energy_update = CURRENT_TIMESTAMP WHERE id = ?', [earnedCoins, remainingEnergy, user.id]);
  }

  const freshUser = await db.queryOne('SELECT coins, energy FROM users WHERE id = ?', [user.id]);

  res.json({
    success: true,
    earnedCoins,
    newBalance: freshUser.coins,
    remainingEnergy: freshUser.energy
  });
});

module.exports = router;

