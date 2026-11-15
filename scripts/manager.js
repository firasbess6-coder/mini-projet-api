require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const connecterDB = require('../config/db');
const User = require('../models/User');

async function nommerManager() {
  const login = process.argv[2];
  if (!login || !login.trim()) {
    throw new Error('Utilisation : npm run manager -- login');
  }

  await connecterDB();
  // el script hetha nesta3mlouh via terminal mahich api ma7loula li nes lkol
  const utilisateur = await User.findOne({ login: login.trim().toLowerCase() });
  if (!utilisateur) {
    throw new Error('Creer ce compte avec /api/auth/register avant de le promouvoir');
  }
  utilisateur.role = 'manager';
  await utilisateur.save();
  console.log(utilisateur.login + ' est maintenant manager');
}

nommerManager()
  .catch((erreur) => {
    console.error(erreur.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
