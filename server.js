const express = require('express');
const cors = require('cors');
const path = require('path');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');
const customersRouter = require('./routes/customers');
const settingsRouter = require('./routes/settings');
const clientsRouter = require('./routes/clients');
const messagesRouter = require('./routes/messages');
const notificationsRouter = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Autorise le site (hébergé ailleurs, ex. GitHub Pages) à appeler cette API.
// En production, tu peux restreindre à ton seul domaine :
// app.use(cors({ origin: 'https://tonnomutilisateur.github.io' }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API Céréales Flex en ligne' });
});

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/notifications', notificationsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route inconnue' });
});

app.listen(PORT, () => {
  console.log(`Serveur Céréales Flex démarré sur le port ${PORT}`);
});
