const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  login: { type: String, required: true, unique: true, trim: true, lowercase: true },
  // el motpasse yet5azen hash w mayarja3ech  m3a el user information 
  motDePasse: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'manager'], default: 'user' },
  dateCreation: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
