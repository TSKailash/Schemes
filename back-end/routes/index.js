const express = require('express');
const router = express.Router();
const askRoutes = require('./askRoutes');

router.use('/', askRoutes);

module.exports = router;
