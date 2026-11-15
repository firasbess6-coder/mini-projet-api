const mongoose = require('mongoose');

const tacheSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  // el statu lezem tkon  wehed mi tletha values khw 
  statut: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo', required: true },
  deadline: { type: Date, default: null },
  projet: { type: mongoose.Schema.Types.ObjectId, ref: 'Projet', required: true },
  utilisateurAssigne: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tache', tacheSchema);
