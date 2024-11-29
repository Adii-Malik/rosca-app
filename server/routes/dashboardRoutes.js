// routes/dashboardRoutes.js
const express = require('express');
const { getDashbaord } = require('../controllers/dashboardController');
const router = express.Router();

router.get('/', getDashbaord);

module.exports = router;