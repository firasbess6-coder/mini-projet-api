require('dotenv').config({ quiet: true });
const app = require('./app');
const connecterDB = require('./config/db');

const port = process.env.PORT || 3000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET doit contenir au moins 32 caracteres dans .env');
  process.exit(1);
}

// ken database met5demech nwa9fou el serveur w nchoufo el 5alta 
connecterDB()
  .then(() => {
    app.listen(port, () => {
      console.log('Serveur sur http://localhost:' + port);
    });
  })
  .catch((erreur) => {
    console.error(erreur.message);
    process.exit(1);
  });
