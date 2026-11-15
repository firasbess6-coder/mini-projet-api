function erreurs(erreur, req, res, next) {
  // ken el ghalta jeya mi data li b3athha el user nraj3ou 400 
  if (erreur.name === 'ValidationError' || erreur.name === 'CastError') {
    return res.status(400).json({ message: 'Donnees invalides', details: erreur.message });
  }
  if (erreur.code === 11000) {
    return res.status(409).json({ message: 'Ce login existe deja' });
  }
  if (erreur.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON invalide' });
  }
  if (erreur.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Requete trop volumineuse' });
  }

  console.error(erreur);
  res.status(500).json({ message: 'Erreur du serveur' });
}

module.exports = erreurs;
