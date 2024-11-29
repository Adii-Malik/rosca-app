// /routes/drawRoutes.js
const express = require('express');
const { createDrawRecord, getDrawRecords, deleteDrawRecord } = require('../controllers/drawController');

const router = express.Router();

router.post('/', createDrawRecord);
router.get('/', getDrawRecords);
router.delete('/:id', deleteDrawRecord);

module.exports = router;