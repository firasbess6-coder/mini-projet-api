const express = require('express');
const mongoose = require('mongoose');
const Projet = require('../models/Projet');
const Tache = require('../models/Tache');
const User = require('../models/User');
const { authentifier, managerSeulement } = require('../middleware/auth');
const { rechercheValide, texteRecherche, ordreTri } = require('../utils/recherche');

const router = express.Router();
router.use(authentifier);

router.get('/', async (req, res) => {
  if (!rechercheValide(req.query, ['titre', 'dateCreation', 'deadline', 'statut'], ['todo', 'doing', 'done'])) {
    return res.status(400).json({ message: 'Recherche, statut ou tri invalide' });
  }
  const filtre = {};
  if (req.utilisateur.role !== 'manager') {
    const projets = await Projet.find({ proprietaire: req.utilisateur._id }).select('_id');
    // ychouf el projet  mte3ou w el tasks  li 3andou 
    filtre.$or = [
      { projet: { $in: projets.map((projet) => projet._id) } },
      { utilisateurAssigne: req.utilisateur._id }
    ];
  }
  if (req.query.projet !== undefined) {
    if (!mongoose.isObjectIdOrHexString(req.query.projet)) {
      return res.status(400).json({ message: 'ID de projet invalide' });
    }
    filtre.projet = req.query.projet;
  }
  if (req.query.recherche) filtre.titre = texteRecherche(req.query.recherche);
  if (req.query.statut) filtre.statut = req.query.statut;
  const taches = await Tache.find(filtre).sort(ordreTri(req.query));
  res.json(taches);
});

router.post('/', async (req, res) => {
  const { titre, description, statut, deadline, projet } = req.body;
  if (typeof titre !== 'string' || !titre.trim() ||
      (description !== undefined && typeof description !== 'string') ||
      !mongoose.isObjectIdOrHexString(projet)) {
    return res.status(400).json({ message: 'Titre, description ou ID de projet invalide' });
  }
  if (req.body.utilisateurAssigne !== undefined) {
    return res.status(400).json({ message: 'Utiliser la route affectation pour assigner une tache' });
  }

  const projetTrouve = await Projet.findById(projet);
  if (!projetTrouve) {
    return res.status(404).json({ message: 'Projet introuvable' });
  }
  if (req.utilisateur.role !== 'manager' && !projetTrouve.proprietaire.equals(req.utilisateur._id)) {
    return res.status(403).json({ message: 'Acces refuse a ce projet' });
  }

  const tache = await Tache.create({ titre, description, statut, deadline, projet });
  res.status(201).json(tache);
});

router.param('id', async (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ message: 'ID de tache invalide' });
  }
  const tache = await Tache.findById(id);
  if (!tache) {
    return res.status(404).json({ message: 'Tache introuvable' });
  }
  const projet = await Projet.findById(tache.projet);
  if (!projet) {
    return res.status(404).json({ message: 'Projet introuvable' });
  }

  const peutGerer = req.utilisateur.role === 'manager' || projet.proprietaire.equals(req.utilisateur._id);
  const estAssigne = tache.utilisateurAssigne && tache.utilisateurAssigne.equals(req.utilisateur._id);
  if (!peutGerer && !estAssigne) {
    return res.status(403).json({ message: 'Acces refuse a cette tache' });
  }

  req.tache = tache;
  req.peutGererTache = peutGerer;
  next();
});

router.get('/:id', (req, res) => {
  res.json(req.tache);
});

router.patch('/:id', async (req, res) => {
  const { titre, description, statut, deadline } = req.body;
  if (req.body.projet !== undefined || req.body.utilisateurAssigne !== undefined) {
    return res.status(400).json({ message: 'Projet fixe. Utiliser la route affectation pour assigner.' });
  }
  // li ta3tatlou task ken houwa ynajm ybadl ken el statut mte3ou kenchi ken houwa moch mola el projet 
  if (!req.peutGererTache && Object.keys(req.body).some((champ) => champ !== 'statut')) {
    return res.status(403).json({ message: 'Vous pouvez seulement changer le statut' });
  }
  if ((titre !== undefined && (typeof titre !== 'string' || !titre.trim())) ||
      (description !== undefined && typeof description !== 'string')) {
    return res.status(400).json({ message: 'Titre ou description invalide' });
  }

  if (titre !== undefined) req.tache.titre = titre;
  if (description !== undefined) req.tache.description = description;
  if (statut !== undefined) req.tache.statut = statut;
  if (deadline !== undefined) req.tache.deadline = deadline;
  await req.tache.save();
  res.json(req.tache);
});

router.patch('/:id/affectation', managerSeulement, async (req, res) => {
  const { utilisateurAssigne } = req.body;
  // null ma3neha the manager removed the effects
  if (utilisateurAssigne !== null) {
    if (!mongoose.isObjectIdOrHexString(utilisateurAssigne)) {
      return res.status(400).json({ message: 'ID utilisateur invalide, ou null pour retirer l affectation' });
    }
    if (!(await User.findById(utilisateurAssigne))) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
  }

  req.tache.utilisateurAssigne = utilisateurAssigne;
  await req.tache.save();
  res.json(req.tache);
});

router.delete('/:id', async (req, res) => {
  if (!req.peutGererTache) {
    return res.status(403).json({ message: 'Seul le proprietaire du projet ou le manager peut supprimer' });
  }
  await req.tache.deleteOne();
  res.json({ message: 'Tache supprimee' });
});

module.exports = router;
