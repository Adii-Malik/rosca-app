// routes/archiveRoutes.js
const express = require('express');
const { getArchive, getDrawReplay } = require('../controllers/archiveController');
const router = express.Router();

// Public, like the dashboard: members can look back at past committees.
router.get('/', getArchive);
router.get('/draws/:id/replay', getDrawReplay);

module.exports = router;
