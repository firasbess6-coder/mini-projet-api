const mongoose = require("mongoose");

async function connecterDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI est obligatoire dans .env");
  }

  // nestnaew el cnx 9bal mane9blou el request
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connecte");
}

module.exports = connecterDB;
