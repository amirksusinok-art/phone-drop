// server/patternEngine.js
// Движок анализа и оценки телефонных номеров Phone Drop согласно спецификации

const COUNTRIES = {
  RU: {
    code: '+7',
    name: 'Россия',
    flag: '🇷🇺',
    digitsLength: 10,
    prefix: '9', // Мобильный префикс
    format: (nat) => `+7 (${nat.slice(0, 3)}) ${nat.slice(3, 6)}-${nat.slice(6, 8)}-${nat.slice(8, 10)}`
  },
  UA: {
    code: '+380',
    name: 'Украина',
    flag: '🇺🇦',
    digitsLength: 9,
    prefix: '50', // 9 цифр после +380
    format: (nat) => `+380 (${nat.slice(0, 2)}) ${nat.slice(2, 5)}-${nat.slice(5, 7)}-${nat.slice(7, 9)}`
  },
  US: {
    code: '+1',
    name: 'США',
    flag: '🇺🇸',
    digitsLength: 10,
    prefix: '', // 555-01XX безопасный диапазон NANPA
    format: (nat) => `+1 (${nat.slice(0, 3)}) ${nat.slice(3, 6)}-${nat.slice(6, 10)}`
  },
  TR: {
    code: '+90',
    name: 'Турция',
    flag: '🇹🇷',
    digitsLength: 10,
    prefix: '5',
    format: (nat) => `+90 (${nat.slice(0, 3)}) ${nat.slice(3, 6)} ${nat.slice(6, 8)} ${nat.slice(8, 10)}`
  },
  CN: {
    code: '+86',
    name: 'Китай',
    flag: '🇨🇳',
    digitsLength: 11,
    prefix: '13',
    format: (nat) => `+86 ${nat.slice(0, 3)} ${nat.slice(3, 7)} ${nat.slice(7, 11)}`
  }
};

const CATEGORIES = {
  MONOLITH: 'Монолит',
  DOUBLE_PAIR: 'Двойная пара',
  ALTERNATING: 'Чередование',
  MIRROR: 'Зеркальный',
  ASCENDING: 'Восходящий',
  DESCENDING: 'Нисходящий',
  TRIPLE: 'Тройка',
  BLOCK_REPEAT: 'Повтор блока',
  CONTRAST: 'Контрастный',
  ROUND: 'Круглый',
  ADJACENT_REPEATS: 'Соседние повторы',
  MIXED: 'Смешанный'
};

const RARITIES = {
  COMMON: { key: 'common', name: 'Обычный', color: '#94a3b8', border: 'border-slate-500', glow: 'glow-common', basePrice: 40 },
  UNCOMMON: { key: 'uncommon', name: 'Необычный', color: '#22c55e', border: 'border-green-500', glow: 'glow-uncommon', basePrice: 150 },
  RARE: { key: 'rare', name: 'Редкий', color: '#3b82f6', border: 'border-blue-500', glow: 'glow-rare', basePrice: 750 },
  EPIC: { key: 'epic', name: 'Эпический', color: '#a855f7', border: 'border-purple-500', glow: 'glow-epic', basePrice: 3500 },
  LEGENDARY: { key: 'legendary', name: 'Легендарный', color: '#eab308', border: 'border-amber-400', glow: 'glow-legendary', basePrice: 25000 },
  MYTHIC: { key: 'mythic', name: 'Мифический', color: '#ec4899', border: 'border-pink-500', glow: 'glow-mythic', basePrice: 150000 }
};

/**
 * Анализирует национальную часть телефонного номера и определяет узоры
 */
function analyzePatterns(nationalDigits) {
  const len = nationalDigits.length;
  const tags = [];
  let primaryCategory = CATEGORIES.MIXED;
  let coverage = 0;
  let patternStrength = 0;

  // 1. Проверка на монолит (преобладание одной цифры)
  const digitCounts = {};
  for (const ch of nationalDigits) {
    digitCounts[ch] = (digitCounts[ch] || 0) + 1;
  }
  const maxFreq = Math.max(...Object.values(digitCounts));
  const maxFreqDigit = Object.keys(digitCounts).find(k => digitCounts[k] === maxFreq);
  const monolithRatio = maxFreq / len;

  if (monolithRatio >= 0.6) {
    tags.push('Монолит');
    coverage = Math.max(coverage, monolithRatio);
    patternStrength = Math.max(patternStrength, monolithRatio >= 0.8 ? 0.95 : 0.75);
    primaryCategory = CATEGORIES.MONOLITH;
  }

  // 2. Проверка на круглый (блоки нулей)
  const zeroMatches = nationalDigits.match(/0{3,}/g);
  if (zeroMatches) {
    const maxZeroSeq = Math.max(...zeroMatches.map(m => m.length));
    const zeroRatio = maxZeroSeq / len;
    tags.push('Круглый');
    if (zeroRatio >= 0.4 && primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.ROUND;
    }
    coverage = Math.max(coverage, zeroRatio);
    patternStrength = Math.max(patternStrength, zeroRatio >= 0.5 ? 0.9 : 0.65);
  }

  // 3. Зеркальный (палиндром)
  let maxPalindrome = 0;
  for (let i = 0; i < len; i++) {
    for (let j = i + 3; j <= len; j++) {
      const sub = nationalDigits.slice(i, j);
      if (sub === sub.split('').reverse().join('')) {
        if (sub.length > maxPalindrome) maxPalindrome = sub.length;
      }
    }
  }
  if (maxPalindrome >= 4) {
    tags.push('Зеркальный');
    const palRatio = maxPalindrome / len;
    coverage = Math.max(coverage, palRatio);
    patternStrength = Math.max(patternStrength, palRatio >= 0.7 ? 0.95 : 0.7);
    if (palRatio >= 0.6 || primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.MIRROR;
    }
  }

  // 4. Повтор блока (e.g. 123123 или 770770)
  for (let blockSize = 2; blockSize <= 4; blockSize++) {
    for (let i = 0; i <= len - blockSize * 2; i++) {
      const block = nationalDigits.slice(i, i + blockSize);
      const nextBlock = nationalDigits.slice(i + blockSize, i + blockSize * 2);
      if (block === nextBlock && !/^(\d)\1+$/.test(block)) {
        tags.push('Повтор блока');
        const repRatio = (blockSize * 2) / len;
        coverage = Math.max(coverage, repRatio);
        patternStrength = Math.max(patternStrength, blockSize >= 3 ? 0.85 : 0.6);
        if (primaryCategory === CATEGORIES.MIXED) {
          primaryCategory = CATEGORIES.BLOCK_REPEAT;
        }
        break;
      }
    }
  }

  // 5. Чередование (ABAB...)
  const altMatch = nationalDigits.match(/(\d)(\d)\1\2(\1\2)?/);
  if (altMatch && altMatch[1] !== altMatch[2]) {
    tags.push('Чередование');
    const altRatio = altMatch[0].length / len;
    coverage = Math.max(coverage, altRatio);
    patternStrength = Math.max(patternStrength, altMatch[0].length >= 6 ? 0.9 : 0.7);
    if (primaryCategory === CATEGORIES.MIXED || primaryCategory === CATEGORIES.BLOCK_REPEAT) {
      primaryCategory = CATEGORIES.ALTERNATING;
    }
  }

  // 6. Восходящий (1234...)
  let maxAsc = 1, curAsc = 1;
  for (let i = 0; i < len - 1; i++) {
    if (Number(nationalDigits[i + 1]) === (Number(nationalDigits[i]) + 1) % 10) {
      curAsc++;
      if (curAsc > maxAsc) maxAsc = curAsc;
    } else {
      curAsc = 1;
    }
  }
  if (maxAsc >= 4) {
    tags.push('Восходящий');
    const ascRatio = maxAsc / len;
    coverage = Math.max(coverage, ascRatio);
    patternStrength = Math.max(patternStrength, maxAsc >= 6 ? 0.95 : 0.7);
    if (primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.ASCENDING;
    }
  }

  // 7. Нисходящий (8765...)
  let maxDesc = 1, curDesc = 1;
  for (let i = 0; i < len - 1; i++) {
    if (Number(nationalDigits[i + 1]) === (Number(nationalDigits[i]) - 1 + 10) % 10) {
      curDesc++;
      if (curDesc > maxDesc) maxDesc = curDesc;
    } else {
      curDesc = 1;
    }
  }
  if (maxDesc >= 4) {
    tags.push('Нисходящий');
    const descRatio = maxDesc / len;
    coverage = Math.max(coverage, descRatio);
    patternStrength = Math.max(patternStrength, maxDesc >= 6 ? 0.95 : 0.7);
    if (primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.DESCENDING;
    }
  }

  // 8. Контрастный (сложные пары/блоки e.g. 770099)
  const doublePairs = nationalDigits.match(/(\d)\1(\d)\2/);
  const triplePairs = nationalDigits.match(/(\d)\1(\d)\2(\d)\3/);
  if (triplePairs) {
    tags.push('Контрастный');
    coverage = Math.max(coverage, 0.6);
    patternStrength = Math.max(patternStrength, 0.85);
    if (primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.CONTRAST;
    }
  } else if (doublePairs && doublePairs[1] !== doublePairs[2]) {
    tags.push('Двойная пара');
    coverage = Math.max(coverage, 0.4);
    patternStrength = Math.max(patternStrength, 0.6);
    if (primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.DOUBLE_PAIR;
    }
  }

  // 9. Тройка (777)
  const tripleMatch = nationalDigits.match(/(\d)\1\1/);
  if (tripleMatch) {
    tags.push('Тройка');
    coverage = Math.max(coverage, 0.3);
    patternStrength = Math.max(patternStrength, 0.5);
    if (primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.TRIPLE;
    }
  }

  // 10. Соседние повторы
  const adjacentPairs = nationalDigits.match(/(\d)\1/g);
  if (adjacentPairs && adjacentPairs.length >= 2) {
    tags.push('Соседние повторы');
    coverage = Math.max(coverage, (adjacentPairs.length * 2) / len);
    patternStrength = Math.max(patternStrength, 0.55);
    if (primaryCategory === CATEGORIES.MIXED) {
      primaryCategory = CATEGORIES.ADJACENT_REPEATS;
    }
  }

  // Если узоров не найдено — смешанный
  if (tags.length === 0) {
    tags.push('Смешанный');
    coverage = 0.15;
    patternStrength = 0.15;
  }

  // Дедупликация тегов
  const uniqueTags = [...new Set(tags)];

  // Уникальность оценивается от силы узора и разнообразия цифр
  const uniqueDigitsCount = new Set(nationalDigits.split('')).size;
  const uniqueness = Math.max(0.1, Math.min(1.0, (1 - uniqueDigitsCount / len) * 1.5 + (patternStrength * 0.4)));

  // Формула из концепции:
  // Score = 100 * (0.45 * Coverage + 0.35 * PatternStrength + 0.20 * Uniqueness)
  const rawScore = 100 * (0.45 * coverage + 0.35 * patternStrength + 0.20 * uniqueness);
  const score = Math.max(1, Math.min(100, Math.round(rawScore)));

  return {
    primaryCategory,
    tags: uniqueTags,
    score,
    coverage: Math.round(coverage * 100) / 100,
    patternStrength: Math.round(patternStrength * 100) / 100,
    uniqueness: Math.round(uniqueness * 100) / 100
  };
}

module.exports = {
  COUNTRIES,
  CATEGORIES,
  RARITIES,
  analyzePatterns
};
