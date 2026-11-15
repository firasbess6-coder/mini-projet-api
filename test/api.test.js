const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const Projet = require('../models/Projet');
const Tache = require('../models/Tache');

process.env.JWT_SECRET = 'cle-uniquement-pour-les-tests-automatiques-123456';

test('Scenario complet de l API avec MongoDB', { timeout: 900000 }, async (t) => {
  // nesta3mlou database moua9ta bich el test matmesech el database mta3 el projet 
  const mongo = await MongoMemoryServer.create({
    binary: { version: '8.2.6', downloadDir: path.join(__dirname, '..', '.cache', 'mongodb') }
  });

  try {
    const uri = mongo.getUri('mini_projet_test');
    await mongoose.connect(uri);
    await User.init();
    const api = request(app);
    const motDePasse = 'MotDePasse123!';
    let firas, yacine, manager;
    let tokenFiras, tokenYacine, tokenManager;
    let projetFiras, projetYacine, tache;
    const idAbsent = new mongoose.Types.ObjectId().toString();

    await t.test('Inscription : compte user et mot de passe hashe', async () => {
      const resultat = await api.post('/api/auth/register').send({ nom: 'Firas', login: 'FIRAS', motDePasse }).expect(201);
      firas = resultat.body;
      assert.equal(firas.role, 'user');
      assert.equal(firas.login, 'firas');
      assert.equal(firas.motDePasse, undefined);
      const stocke = await User.findById(firas._id).select('+motDePasse');
      assert.notEqual(stocke.motDePasse, motDePasse);
      assert.equal(await bcrypt.compare(motDePasse, stocke.motDePasse), true);
      yacine = (await api.post('/api/auth/register').send({ nom: 'Yacine', login: 'yacine', motDePasse }).expect(201)).body;
      manager = (await api.post('/api/auth/register').send({ nom: 'Manager', login: 'manager', motDePasse }).expect(201)).body;
    });

    await t.test('Refuser login duplique, mot de passe court et role manager public', async () => {
      await api.post('/api/auth/register').send({ nom: 'Autre', login: ' FiRaS ', motDePasse }).expect(409);
      await api.post('/api/auth/register').send({ nom: 'Test', login: 'test', motDePasse: '123' }).expect(400);
      await api.post('/api/auth/register').send({ nom: 'Test', login: 'test', motDePasse, role: 'manager' }).expect(400);
    });

    await t.test('Connexion et refus des mauvais identifiants', async () => {
      tokenFiras = (await api.post('/api/auth/login').send({ login: ' FIRAS ', motDePasse }).expect(200)).body.token;
      tokenYacine = (await api.post('/api/auth/login').send({ login: 'yacine', motDePasse }).expect(200)).body.token;
      tokenManager = (await api.post('/api/auth/login').send({ login: 'manager', motDePasse }).expect(200)).body.token;
      await api.post('/api/auth/login').send({ login: 'firas', motDePasse: 'incorrect' }).expect(401);
      await api.post('/api/auth/login').send({ login: { $ne: null }, motDePasse }).expect(400);
    });

    await t.test('Proteger toutes les ressources et verifier les tokens', async () => {
      for (const route of ['/api/auth/me', '/api/users', '/api/projets', '/api/taches']) {
        await api.get(route).expect(401);
      }
      await api.get('/api/projets').auth('faux-token', { type: 'bearer' }).expect(401);
      const expire = jwt.sign({ id: firas._id }, process.env.JWT_SECRET, { expiresIn: -1 });
      await api.get('/api/projets').auth(expire, { type: 'bearer' }).expect(401);
      const mauvaisSecret = jwt.sign({ id: firas._id }, 'mauvaise-cle');
      await api.get('/api/projets').auth(mauvaisSecret, { type: 'bearer' }).expect(401);
      const utilisateurAbsent = jwt.sign({ id: idAbsent }, process.env.JWT_SECRET);
      await api.get('/api/projets').auth(utilisateurAbsent, { type: 'bearer' }).expect(401);
      const profil = await api.get('/api/auth/me').auth(tokenFiras, { type: 'bearer' }).expect(200);
      assert.equal(profil.body.motDePasse, undefined);
    });

    await t.test('Promouvoir le manager avec le script local', async () => {
      await api.get('/api/users').auth(tokenManager, { type: 'bearer' }).expect(403);
      await promisify(execFile)(process.execPath, [path.join(__dirname, '..', 'scripts', 'manager.js'), 'manager'], {
        env: { ...process.env, MONGO_URI: uri }
      });
      // nafs el token yekhdem bel role ejdid 5ater el middleware ya9ra mel database.
      const resultat = await api.get('/api/users').auth(tokenManager, { type: 'bearer' }).expect(200);
      assert.equal(resultat.body.length, 3);
      assert(resultat.body.every((user) => user.motDePasse === undefined));
      await api.get('/api/users').auth(tokenFiras, { type: 'bearer' }).expect(403);
    });

    await t.test('Creer des projets : proprietaire impose par le token', async () => {
      projetFiras = (await api.post('/api/projets').auth(tokenFiras, { type: 'bearer' })
        .send({ nom: 'Alpha [1]', proprietaire: yacine._id }).expect(201)).body;
      assert.equal(projetFiras.proprietaire, firas._id);
      projetYacine = (await api.post('/api/projets').auth(tokenYacine, { type: 'bearer' })
        .send({ nom: 'Beta', statut: 'en pause' }).expect(201)).body;
      const projetManager = await api.post('/api/projets').auth(tokenManager, { type: 'bearer' }).send({ nom: 'Gamma' }).expect(201);
      assert.equal(projetManager.body.proprietaire, manager._id);
      await api.post('/api/projets').auth(tokenFiras, { type: 'bearer' }).send({ nom: ' ' }).expect(400);
      await api.post('/api/projets').auth(tokenFiras, { type: 'bearer' }).send({ nom: 'Test', statut: null }).expect(400);
    });

    await t.test('Limiter les projets visibles et empecher les modifications externes', async () => {
      const resultat = await api.get('/api/projets').auth(tokenFiras, { type: 'bearer' }).expect(200);
      assert.deepEqual(resultat.body.map((projet) => projet._id), [projetFiras._id]);
      const tous = await api.get('/api/projets').auth(tokenManager, { type: 'bearer' }).expect(200);
      assert.equal(tous.body.length, 3);
      await api.get('/api/projets/' + projetFiras._id).auth(tokenYacine, { type: 'bearer' }).expect(403);
      await api.patch('/api/projets/' + projetFiras._id).auth(tokenYacine, { type: 'bearer' }).send({ nom: 'Pirate' }).expect(403);
      await api.delete('/api/projets/' + projetFiras._id).auth(tokenYacine, { type: 'bearer' }).expect(403);
      await api.patch('/api/projets/' + projetFiras._id).auth(tokenFiras, { type: 'bearer' }).send({ proprietaire: yacine._id }).expect(400);
    });

    await t.test('Lire et modifier les projets autorises', async () => {
      await api.get('/api/projets/' + projetFiras._id).auth(tokenFiras, { type: 'bearer' }).expect(200);
      const modifie = await api.patch('/api/projets/' + projetFiras._id).auth(tokenFiras, { type: 'bearer' })
        .send({ description: 'Description modifiee', statut: 'termine' }).expect(200);
      assert.equal(modifie.body.statut, 'termine');
      await api.patch('/api/projets/' + projetYacine._id).auth(tokenManager, { type: 'bearer' })
        .send({ description: 'Modification du manager' }).expect(200);
    });

    await t.test('Rechercher et trier les projets sans elargir les droits', async () => {
      const litteral = await api.get('/api/projets').query({ recherche: '[1]' }).auth(tokenFiras, { type: 'bearer' }).expect(200);
      assert.equal(litteral.body.length, 1);
      const externe = await api.get('/api/projets').query({ recherche: 'Beta' }).auth(tokenFiras, { type: 'bearer' }).expect(200);
      assert.equal(externe.body.length, 0);
      const tries = await api.get('/api/projets?tri=nom&ordre=asc').auth(tokenManager, { type: 'bearer' }).expect(200);
      assert.deepEqual(tries.body.map((projet) => projet.nom), ['Alpha [1]', 'Beta', 'Gamma']);
      const filtres = await api.get('/api/projets').query({ statut: 'en pause' }).auth(tokenManager, { type: 'bearer' }).expect(200);
      assert.equal(filtres.body.length, 1);
    });

    await t.test('Creer les taches seulement dans un projet autorise', async () => {
      tache = (await api.post('/api/taches').auth(tokenFiras, { type: 'bearer' })
        .send({ titre: 'API [1]', projet: projetFiras._id, deadline: '2026-12-01' }).expect(201)).body;
      assert.equal(tache.statut, 'todo');
      await api.post('/api/taches').auth(tokenYacine, { type: 'bearer' })
        .send({ titre: 'Interdit', projet: projetFiras._id }).expect(403);
      await api.post('/api/taches').auth(tokenManager, { type: 'bearer' })
        .send({ titre: 'Documentation', projet: projetFiras._id, deadline: '2026-12-03' }).expect(201);
      await api.post('/api/taches').auth(tokenFiras, { type: 'bearer' }).send({ titre: 'Test', projet: idAbsent }).expect(404);
    });

    await t.test('Refuser titres vides, dates invalides et statuts autres que todo doing done', async () => {
      for (const donnees of [{ titre: '' }, { statut: 'finished' }, { statut: null }, { deadline: 'pas-une-date' }]) {
        await api.post('/api/taches').auth(tokenFiras, { type: 'bearer' })
          .send({ titre: 'Test', projet: projetFiras._id, ...donnees }).expect(400);
      }
      await api.patch('/api/taches/' + tache._id).auth(tokenFiras, { type: 'bearer' }).send({ statut: 'invalid' }).expect(400);
      await api.patch('/api/taches/' + tache._id).auth(tokenFiras, { type: 'bearer' }).send({ statut: null }).expect(400);
    });

    await t.test('Empecher les affectations hors de la route manager', async () => {
      await api.patch('/api/taches/' + tache._id + '/affectation').auth(tokenFiras, { type: 'bearer' })
        .send({ utilisateurAssigne: yacine._id }).expect(403);
      await api.post('/api/taches').auth(tokenFiras, { type: 'bearer' })
        .send({ titre: 'Test', projet: projetFiras._id, utilisateurAssigne: yacine._id }).expect(400);
      await api.patch('/api/taches/' + tache._id).auth(tokenFiras, { type: 'bearer' })
        .send({ utilisateurAssigne: yacine._id }).expect(400);
      await api.patch('/api/taches/' + tache._id).auth(tokenManager, { type: 'bearer' })
        .send({ projet: projetYacine._id }).expect(400);
    });

    await t.test('Proteger les taches non assignees', async () => {
      await api.get('/api/taches/' + tache._id).auth(tokenYacine, { type: 'bearer' }).expect(403);
      await api.patch('/api/taches/' + tache._id).auth(tokenYacine, { type: 'bearer' }).send({ statut: 'done' }).expect(403);
      const liste = await api.get('/api/taches').query({ projet: projetFiras._id }).auth(tokenYacine, { type: 'bearer' }).expect(200);
      assert.equal(liste.body.length, 0);
    });

    await t.test('Affecter une tache avec un utilisateur existant', async () => {
      const route = '/api/taches/' + tache._id + '/affectation';
      await api.patch(route).auth(tokenManager, { type: 'bearer' }).send({ utilisateurAssigne: idAbsent }).expect(404);
      await api.patch(route).auth(tokenManager, { type: 'bearer' }).send({ utilisateurAssigne: 'invalide' }).expect(400);
      await api.patch(route).auth(tokenManager, { type: 'bearer' }).send({}).expect(400);
      const resultat = await api.patch(route).auth(tokenManager, { type: 'bearer' }).send({ utilisateurAssigne: yacine._id }).expect(200);
      assert.equal(resultat.body.utilisateurAssigne, yacine._id);
    });

    await t.test('Limiter l utilisateur assigne a sa tache et a son statut', async () => {
      const liste = await api.get('/api/taches').auth(tokenYacine, { type: 'bearer' }).expect(200);
      assert.deepEqual(liste.body.map((element) => element._id), [tache._id]);
      await api.get('/api/taches/' + tache._id).auth(tokenYacine, { type: 'bearer' }).expect(200);
      const resultat = await api.patch('/api/taches/' + tache._id).auth(tokenYacine, { type: 'bearer' })
        .send({ statut: 'doing' }).expect(200);
      assert.equal(resultat.body.statut, 'doing');
      await api.patch('/api/taches/' + tache._id).auth(tokenYacine, { type: 'bearer' }).send({ titre: 'Interdit' }).expect(403);
      await api.delete('/api/taches/' + tache._id).auth(tokenYacine, { type: 'bearer' }).expect(403);
      await api.get('/api/projets/' + projetFiras._id).auth(tokenYacine, { type: 'bearer' }).expect(403);
    });

    await t.test('Rechercher, filtrer et trier les taches', async () => {
      const liste = await api.get('/api/taches').query({ recherche: '[1]', statut: 'doing', projet: projetFiras._id })
        .auth(tokenYacine, { type: 'bearer' }).expect(200);
      assert.equal(liste.body.length, 1);
      const triees = await api.get('/api/taches?tri=deadline&ordre=desc').auth(tokenManager, { type: 'bearer' }).expect(200);
      assert.deepEqual(triees.body.map((element) => element.titre), ['Documentation', 'API [1]']);
      const filtrees = await api.get('/api/taches?statut=todo').auth(tokenManager, { type: 'bearer' }).expect(200);
      assert.equal(filtrees.body.length, 1);
    });

    await t.test('Modifier une tache puis retirer son affectation', async () => {
      const resultat = await api.patch('/api/taches/' + tache._id).auth(tokenFiras, { type: 'bearer' })
        .send({ titre: 'API finale', description: 'Terminee', statut: 'done', deadline: null }).expect(200);
      assert.equal(resultat.body.deadline, null);
      await api.patch('/api/taches/' + tache._id + '/affectation').auth(tokenManager, { type: 'bearer' })
        .send({ utilisateurAssigne: null }).expect(200);
      await api.get('/api/taches/' + tache._id).auth(tokenYacine, { type: 'bearer' }).expect(403);
    });

    await t.test('Rejeter les IDs, JSON et parametres de recherche invalides', async () => {
      for (const route of ['/api/projets', '/api/taches']) {
        await api.get(route + '/mauvais-id').auth(tokenFiras, { type: 'bearer' }).expect(400);
        await api.get(route + '/' + idAbsent).auth(tokenFiras, { type: 'bearer' }).expect(404);
        await api.get(route + '?tri=motDePasse').auth(tokenFiras, { type: 'bearer' }).expect(400);
        await api.get(route + '?ordre=autre').auth(tokenFiras, { type: 'bearer' }).expect(400);
        await api.get(route + '?statut=invalide').auth(tokenFiras, { type: 'bearer' }).expect(400);
        await api.get(route + '?recherche=a&recherche=b').auth(tokenFiras, { type: 'bearer' }).expect(400);
      }
      await api.get('/api/taches?projet=invalide').auth(tokenFiras, { type: 'bearer' }).expect(400);
      await api.post('/api/auth/register').send([]).expect(400);
      await api.post('/api/auth/register').set('Content-Type', 'application/json').send('{').expect(400);
      await api.post('/api/auth/login').expect(400);
      await api.get('/route-inconnue').expect(404);
    });

    await t.test('Supprimer une tache', async () => {
      await api.delete('/api/taches/' + tache._id).auth(tokenFiras, { type: 'bearer' }).expect(200);
      assert.equal(await Tache.findById(tache._id), null);
    });

    await t.test('Supprimer le projet avec ses taches', async () => {
      assert.equal(await Tache.countDocuments({ projet: projetFiras._id }), 1);
      await api.delete('/api/projets/' + projetFiras._id).auth(tokenManager, { type: 'bearer' }).expect(200);
      assert.equal(await Projet.findById(projetFiras._id), null);
      assert.equal(await Tache.countDocuments({ projet: projetFiras._id }), 0);
      assert.notEqual(await Projet.findById(projetYacine._id), null);
    });
  } finally {
    // 7atta ken test yti7 nsakrou el connexion w na7iw el database el wa9tiya.
    await mongoose.disconnect();
    await mongo.stop();
  }
});
