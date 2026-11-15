const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

async function authentifier(req, res, next) {
  const autorisation = req.headers.authorization;
  if (!autorisation || !autorisation.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  let contenu;
  try {
    //nthabtou mili token shih w wa9tou mawfech 
    contenu = jwt.verify(autorisation.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (erreur) {
    return res.status(401).json({ message: 'Token invalide ou expire' });
  }

  if (!mongoose.isObjectIdOrHexString(contenu.id)) {
    return res.status(401).json({ message: 'Token invalide' });
  }

  // na9raw el rule mi database bich ma3tamdouch ala role 9dim fi token 
  const utilisateur = await User.findById(contenu.id);
  if (!utilisateur) {
    return res.status(401).json({ message: 'Utilisateur introuvable' });
  }

  req.utilisateur = utilisateur;
  next();
}

function managerSeulement(req, res, next) {
  if (req.utilisateur.role !== 'manager') {
    return res.status(403).json({ message: 'Action reservee au manager' });
  }
  next();
}

module.exports = { authentifier, managerSeulement };
