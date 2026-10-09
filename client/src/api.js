// client/src/api.js
// Модуль взаимодействия с бэкендом Phone Drop

const API_BASE = '/api';

// Получение сохраненного демо-пользователя для браузера
export function getDemoUser() {
  const saved = localStorage.getItem('phone_drop_demo_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  const defaultUser = {
    id: 'demo_user_1',
    name: 'Алекс Коллекционер',
    username: 'alex_collector'
  };
  localStorage.setItem('phone_drop_demo_user', JSON.stringify(defaultUser));
  return defaultUser;
}

export function setDemoUser(user) {
  localStorage.setItem('phone_drop_demo_user', JSON.stringify(user));
}

export async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Проверка Telegram WebApp
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) {
    headers['x-telegram-init-data'] = tg.initData;
  } else {
    // Режим браузера (Demo / Dev)
    const demo = getDemoUser();
    headers['x-demo-user-id'] = demo.id;
    headers['x-demo-name'] = demo.name;
    headers['x-demo-username'] = demo.username;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Ошибка запроса к серверу');
  }

  return data;
}

export const api = {
  // Авторизация и профиль
  auth: () => apiRequest('/auth', { method: 'POST' }),
  getProfile: () => apiRequest('/user/profile'),
  expandInventory: () => apiRequest('/user/expand-inventory', { method: 'POST' }),
  equipPhone: (phoneId) => apiRequest('/phone/equip', { method: 'POST', body: JSON.stringify({ phoneId }) }),
  buyCosmetic: (itemId) => apiRequest('/user/buy-cosmetic', { method: 'POST', body: JSON.stringify({ itemId }) }),
  equipCosmetic: (type, itemId) => apiRequest('/user/equip-cosmetic', { method: 'POST', body: JSON.stringify({ type, itemId }) }),
  getCosmetics: () => apiRequest('/cosmetics'),

  // Кейсы
  getCasesInfo: () => apiRequest('/cases/info'),
  openCase: (caseType, country = null, opKey = null) =>
    apiRequest('/cases/open', {
      method: 'POST',
      body: JSON.stringify({ caseType, country, opKey })
    }),
  sellSystem: (phoneId) => apiRequest('/phone/sell-system', { method: 'POST', body: JSON.stringify({ phoneId }) }),

  // Инвентарь
  getInventory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/inventory?${qs}`);
  },
  getPhoneDetails: (id) => apiRequest(`/phone/${id}`),

  // Рынок
  getMarket: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/market?${qs}`);
  },
  listMarket: (phoneId, price) => apiRequest('/market/list', { method: 'POST', body: JSON.stringify({ phoneId, price }) }),
  cancelMarket: (listingId) => apiRequest('/market/cancel', { method: 'POST', body: JSON.stringify({ listingId }) }),
  buyMarket: (listingId) => apiRequest('/market/buy', { method: 'POST', body: JSON.stringify({ listingId }) }),

  // Рейтинги и альбомы
  getPhoneLeaderboard: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/leaderboard/phones?${qs}`);
  },
  getPlayerLeaderboard: (tab) => apiRequest(`/leaderboard/players?tab=${tab}`),
  getAlbums: () => apiRequest('/albums')
};
