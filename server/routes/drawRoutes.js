// routes/drawRoutes.js
const express = require('express');
const { createDrawRecord, getDrawRecords, deleteDrawRecord, awardRound } = require('../controllers/drawController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', getDrawRecords);

router.post('/', requireAuth, createDrawRecord);
router.post('/award', requireAuth, awardRound);
router.delete('/:id', requireAuth, deleteDrawRecord);

module.exports = router;
