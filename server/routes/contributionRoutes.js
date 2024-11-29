// routes/contributionRoutes.js
const express = require('express');
const { createContribution, getContributions, updateContribution, deleteContribution } = require('../controllers/contributionController');
const router = express.Router();

router.post('/', createContribution);
router.get('/', getContributions);
router.put('/:id', updateContribution);
router.delete('/:id', deleteContribution);

module.exports = router;