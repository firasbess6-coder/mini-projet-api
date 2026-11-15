function rechercheValide(query, champsTri, statuts) {
  // houni man9blouch arrays wala objects ka ma3loumet mta3 el bahth 
  for (const champ of ['recherche', 'statut', 'tri', 'ordre', 'projet']) {
    if (query[champ] !== undefined && typeof query[champ] !== 'string') return false;
  }
  if (query.recherche !== undefined && query.recherche.length > 100) return false;
  if (query.statut !== undefined && !statuts.includes(query.statut)) return false;
  if (query.tri !== undefined && !champsTri.includes(query.tri)) return false;
  if (query.ordre !== undefined && !['asc', 'desc'].includes(query.ordre)) return false;
  return true;
}

function texteRecherche(texte) {
  // ken el user yekteb no9ta wala 9awes nfatchou 3lehoum kifma houma 
  const texteSimple = texte.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(texteSimple, 'i');
}

function ordreTri(query) {
  const champ = query.tri || 'dateCreation';
  const ordre = query.ordre === 'asc' ? 1 : -1;
  return { [champ]: ordre, _id: ordre };
}

module.exports = { rechercheValide, texteRecherche, ordreTri };
