// client/src/haptic.js
// Нативная тактильная виброотдача для Telegram Mini App

export const haptic = {
  impact: (style = 'light') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch {
      // Игнорируем в обычном браузере
    }
  },
  notification: (type = 'success') => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    } catch {
      // Игнорируем
    }
  },
  selection: () => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    } catch {
      // Игнорируем
    }
  }
};
