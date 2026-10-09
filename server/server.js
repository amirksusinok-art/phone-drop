// server/server.js
// Главный сервер Phone Drop Telegram Mini App
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { seedCatalogIfNeeded } = require('./seedCatalog');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Маршруты
app.use('/api', apiRoutes);

// Раздача статики собранного фронтенда
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback для SPA
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Маршрут API не найден' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Phone Drop API сервер активен. Соберите клиент: npm run build');
    }
  });
});

async function startServer() {
  try {
    console.log('[Server] Инициализация базы данных Phone Drop...');
    await db.initSchema();
    await seedCatalogIfNeeded();

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`📱 Phone Drop Telegram Mini App запущен!`);
      console.log(`🌐 Порт: http://localhost:${PORT}`);
      console.log(`🔗 API:  http://localhost:${PORT}/api/cases/info`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('[Server Start Error]:', err);
    process.exit(1);
  }
}

startServer();
