const express = require('express');

const app = express();

// houni n5aliw express  yefhem el data li jeya fi format json 
app.use(express.json());

// bich netfadew el mohawla mta3 na9raw fields min body fere5 wala min array 
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) &&
      (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ message: 'Envoyer un objet JSON' });
  }
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'API de gestion de projets et de taches' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projets', require('./routes/projets'));
app.use('/api/taches', require('./routes/taches'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

app.use(require('./middleware/erreurs'));

module.exports = app;
