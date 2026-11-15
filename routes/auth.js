const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authentifier } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { nom, login, motDePasse, role } = req.body;

  if (typeof nom !== 'string' || !nom.trim() ||
      typeof login !== 'string' || !login.trim() ||
      typeof motDePasse !== 'string' || motDePasse.length < 8 ||
      Buffer.byteLength(motDePasse, 'utf8') > 72) {
    return res.status(400).json({ message: 'Nom et login requis. Mot de passe : 8 caracteres minimum, 72 octets maximum.' });
  }

  // el manager eli bich yamel compte jdid maynajamech ya3ti l rouho role 
  if (role !== undefined && role !== 'user') {
    return res.status(400).json({ message: 'Le role a l inscription est toujours user' });
  }

  const utilisateur = await User.create({
    nom,
    login,
    motDePasse: await bcrypt.hash(motDePasse, 10),
    role: 'user'
  });

  res.status(201).json({
    _id: utilisateur._id,
    nom: utilisateur.nom,
    login: utilisateur.login,
    role: utilisateur.role,
    dateCreation: utilisateur.dateCreation
  });
});

router.post('/login', async (req, res) => {
  const { login, motDePasse } = req.body;
  if (typeof login !== 'string' || typeof motDePasse !== 'string') {
    return res.status(400).json({ message: 'Login et mot de passe requis' });
  }

  //njibouha ken wa9t el login bech n9arnouha bil mdp 
  const utilisateur = await User.findOne({ login: login.trim().toLowerCase() }).select('+motDePasse');
  if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.motDePasse))) {
    return res.status(401).json({ message: 'Login ou mot de passe incorrect' });
  }

  const token = jwt.sign({ id: utilisateur._id.toString() }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1d'
  });

  res.json({ token });
});

router.get('/me', authentifier, (req, res) => {
  res.json(req.utilisateur);
});

module.exports = router;
