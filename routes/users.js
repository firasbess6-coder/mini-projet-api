const express = require('express');
const User = require('../models/User');
const { authentifier, managerSeulement } = require('../middleware/auth');

const router = express.Router();

//el manager yestha9 lista mta3 el users bich ya5tar chkoun ya3tih el token 
router.get('/', authentifier, managerSeulement, async (req, res) => {
  const utilisateurs = await User.find().select('nom login role').sort({ nom: 1 });
  res.json(utilisateurs);
});

module.exports = router;
