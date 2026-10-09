// server/seedCatalog.js
// Генерация и калибровка каталога Серии 2026 на 10 000 уникальных номеров
const { COUNTRIES, RARITIES, analyzePatterns } = require('./patternEngine');
const db = require('./db');

/**
 * Псевдослучайный детерминированный генератор
 */
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Генерирует уникальный национальный номер заданной длины и структуры
 */
function generateNationalNumber(countryKey, index, total, rand) {
  const cfg = COUNTRIES[countryKey];
  const len = cfg.digitsLength;

  // США использует безопасный диапазон NANPA (префикс 555-01XX)
  if (countryKey === 'US') {
    // 20 кодов зон США x 100 безопасных номеров 555-0100..0199 = 2000 уникальных номеров
    const areaCodes = [
      '202', '212', '310', '415', '650', '213', '305', '702', '512', '206',
      '617', '312', '404', '713', '214', '602', '503', '303', '619', '818'
    ];
    const areaIdx = Math.floor(index / 100) % areaCodes.length;
    const lineIdx = index % 100;
    const area = areaCodes[areaIdx];
    const numEnding = String(lineIdx).padStart(2, '0');
    return `${area}55501${numEnding}`;
  }

  // Для других стран — богатый спектр паттернов и уникальных комбинаций
  // 1. Монолиты и супер-комбинации (для первых 30 номеров)
  if (index < 30) {
    const d = String(index % 10);
    return d.repeat(len);
  }

  // 2. Зеркальные и палиндромы (30 - 100)
  if (index < 100) {
    const halfLen = Math.floor(len / 2);
    const half = String(100000 + (index * 73) % 900000).slice(0, halfLen);
    const rev = half.split('').reverse().join('');
    return (half + (len % 2 === 1 ? '7' : '') + rev).slice(0, len);
  }

  // 3. Восходящие и нисходящие последовательности (100 - 180)
  if (index < 180) {
    const start = index % 10;
    let s = '';
    for (let i = 0; i < len; i++) {
      s += (start + i) % 10;
    }
    return s;
  }

  // 4. Повторы блоков (180 - 350)
  if (index < 350) {
    const block = String(100 + (index * 13) % 900);
    let s = '';
    while (s.length < len) s += block;
    return s.slice(0, len);
  }

  // 5. Чередования (350 - 500)
  if (index < 500) {
    const a = index % 10;
    const b = (index + 5) % 10;
    let s = '';
    for (let i = 0; i < len; i++) s += (i % 2 === 0 ? a : b);
    return s;
  }

  // 6. Круглые и контрастные пары (500 - 750)
  if (index < 750) {
    const prefix = cfg.prefix || '9';
    const zeros = '0'.repeat(Math.max(3, len - prefix.length - 2));
    const suffix = String(index % 100).padStart(2, '0');
    let s = prefix + zeros + suffix;
    return s.slice(0, len).padEnd(len, '0');
  }

  // 7. Обычные и полу-паттерные номера (750 - 2000)
  const pref = cfg.prefix || String(1 + (index % 8));
  let rest = '';
  for (let i = 0; i < len - pref.length; i++) {
    rest += Math.floor(rand() * 10);
  }
  return (pref + rest).slice(0, len);
}

/**
 * Заполняет базу данных 10 000 уникальными номерами Серии 2026
 */
async function seedCatalogIfNeeded() {
  const existingCountRow = await db.queryOne('SELECT COUNT(*) as count FROM phones');
  const count = Number(existingCountRow?.count || 0);

  if (count >= 10000) {
    console.log(`[Seed] В каталоге уже есть ${count} номеров. Пропуск сидинга.`);
    return;
  }

  console.log('[Seed] Запуск генерации 10 000 уникальных номеров Серии 2026...');
  const countryKeys = Object.keys(COUNTRIES);
  const targetPerCountry = 2000;
  let totalInserted = 0;

  for (const countryKey of countryKeys) {
    const countryCfg = COUNTRIES[countryKey];
    const rand = seededRandom(1337 + countryKey.charCodeAt(0) * 100);
    const generatedSet = new Set();
    const candidateList = [];

    let attemptIndex = 0;
    while (candidateList.length < targetPerCountry && attemptIndex < 10000) {
      attemptIndex++;
      const national = generateNationalNumber(countryKey, attemptIndex, targetPerCountry, rand);
      if (generatedSet.has(national)) continue;
      generatedSet.add(national);

      const formatted = countryCfg.format(national);
      const analysis = analyzePatterns(national);

      candidateList.push({
        country: countryKey,
        country_code: countryCfg.code,
        formatted_number: formatted,
        raw_national_number: national,
        score: analysis.score,
        category: analysis.primaryCategory,
        tags: JSON.stringify(analysis.tags),
        base_price: 40 // обновится после калибровки редкости
      });
    }

    // Сортировка по очкам (DESC) для строгого разделения по редкостям
    candidateList.sort((a, b) => b.score - a.score || a.formatted_number.localeCompare(b.formatted_number));

    // Назначение редкостей по процентным долям на 2000 номеров:
    // Mythic: 1 (0.05%)
    // Legendary: 4 (0.2%)
    // Epic: 16 (0.8%)
    // Rare: 60 (3.0%)
    // Uncommon: 260 (13.0%)
    // Common: остальные (83%)
    const mythicLimit = 1;
    const legendaryLimit = mythicLimit + 4;
    const epicLimit = legendaryLimit + 16;
    const rareLimit = epicLimit + 60;
    const uncommonLimit = rareLimit + 260;

    candidateList.forEach((item, idx) => {
      let rarityKey = 'common';
      if (idx < mythicLimit) {
        rarityKey = 'mythic';
      } else if (idx < legendaryLimit) {
        rarityKey = 'legendary';
      } else if (idx < epicLimit) {
        rarityKey = 'epic';
      } else if (idx < rareLimit) {
        rarityKey = 'rare';
      } else if (idx < uncommonLimit) {
        rarityKey = 'uncommon';
      } else {
        rarityKey = 'common';
      }

      item.rarity = rarityKey;
      item.base_price = RARITIES[rarityKey.toUpperCase()].basePrice;
    });

    // Пакетная вставка в базу данных
    console.log(`[Seed] Вставка ${candidateList.length} номеров для ${countryCfg.name} (${countryKey})...`);

    if (!db.isPostgres) {
      const insertStmt = db.sqliteDb.prepare(`
        INSERT OR IGNORE INTO phones (
          country, country_code, formatted_number, raw_national_number,
          score, category, tags, rarity, base_price, series, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '2026', 'available')
      `);

      const insertMany = db.sqliteDb.transaction((items) => {
        for (const item of items) {
          insertStmt.run(
            item.country,
            item.country_code,
            item.formatted_number,
            item.raw_national_number,
            item.score,
            item.category,
            item.tags,
            item.rarity,
            item.base_price
          );
        }
      });
      insertMany(candidateList);
    } else {
      // Для Postgres пакетный INSERT
      for (const item of candidateList) {
        await db.run(`
          INSERT INTO phones (
            country, country_code, formatted_number, raw_national_number,
            score, category, tags, rarity, base_price, series, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '2026', 'available')
          ON CONFLICT (formatted_number) DO NOTHING
        `, [
          item.country,
          item.country_code,
          item.formatted_number,
          item.raw_national_number,
          item.score,
          item.category,
          item.tags,
          item.rarity,
          item.base_price
        ]);
      }
    }

    totalInserted += candidateList.length;
  }

  console.log(`[Seed] Успешно загружен каталог Серии 2026: ${totalInserted} уникальных номеров.`);
}

module.exports = {
  seedCatalogIfNeeded
};
