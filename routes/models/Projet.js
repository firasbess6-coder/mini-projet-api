const mongoose = require('mongoose');

const projetSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  // netsahfdhou kenchi ala el id mta3 mola el projet 
  proprietaire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  statut: { type: String, enum: ['en cours', 'termine', 'en pause'], default: 'en cours', required: true },
  dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Projet', projetSchema);
