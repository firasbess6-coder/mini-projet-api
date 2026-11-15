const express = require('express');
const mongoose = require('mongoose');
const Projet = require('../models/Projet');
const Tache = require('../models/Tache');
const { authentifier } = require('../middleware/auth');
const { rechercheValide, texteRecherche, ordreTri } = require('../utils/recherche');

const router = express.Router();
router.use(authentifier);

router.get('/', async (req, res) => {
  if (!rechercheValide(req.query, ['nom', 'dateCreation', 'statut'], ['en cours', 'termine', 'en pause'])) {
    return res.status(400).json({ message: 'Recherche, statut ou tri invalide' });
  }
  const filtre = {};
  // user el 3adi ychouf ken el projeyet mte3ou 
  if (req.utilisateur.role !== 'manager') {
    filtre.proprietaire = req.utilisateur._id;
  }
  if (req.query.recherche) filtre.nom = texteRecherche(req.query.recherche);
  if (req.query.statut) filtre.statut = req.query.statut;
  const projets = await Projet.find(filtre).sort(ordreTri(req.query));
  res.json(projets);
});

router.post('/', async (req, res) => {
  const { nom, description, statut } = req.body;
  if (typeof nom !== 'string' || !nom.trim() ||
      (description !== undefined && typeof description !== 'string')) {
    return res.status(400).json({ message: 'Nom requis et description textuelle' });
  }

  //  mola el projet houwa li yabda el record mahich id mab3outha mil client 
  const projet = await Projet.create({ nom, description, statut, proprietaire: req.utilisateur._id });
  res.status(201).json(projet);
});

router.param('id', async (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ message: 'ID de projet invalide' });
  }
  const projet = await Projet.findById(id);
  if (!projet) {
    return res.status(404).json({ message: 'Projet introuvable' });
  }
  if (req.utilisateur.role !== 'manager' && !projet.proprietaire.equals(req.utilisateur._id)) {
    return res.status(403).json({ message: 'Acces refuse a ce projet' });
  }
  req.projet = projet;
  next();
});

router.get('/:id', (req, res) => {
  res.json(req.projet);
});

router.patch('/:id', async (req, res) => {
  const { nom, description, statut } = req.body;
  if ((nom !== undefined && (typeof nom !== 'string' || !nom.trim())) ||
      (description !== undefined && typeof description !== 'string')) {
    return res.status(400).json({ message: 'Nom ou description invalide' });
  }
  if (req.body.proprietaire !== undefined) {
    return res.status(400).json({ message: 'Le proprietaire ne peut pas etre change' });
  }

  // nbadlou ken el field el masmouh behoum 
  if (nom !== undefined) req.projet.nom = nom;
  if (description !== undefined) req.projet.description = description;
  if (statut !== undefined) req.projet.statut = statut;
  await req.projet.save();
  res.json(req.projet);
});

router.delete('/:id', async (req, res) => {
  //nfas5ou el taskouwet zeda bech ma no93douch marboutin bi bprojet mfase5 
  await Tache.deleteMany({ projet: req.projet._id });
  await req.projet.deleteOne();
  res.json({ message: 'Projet et taches supprimes' });
});

module.exports = router;
