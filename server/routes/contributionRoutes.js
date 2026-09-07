// routes/contributionRoutes.js
const express = require('express');
const {
    createContribution, createContributionsBulk, getContributions, updateContribution, deleteContribution,
} = require('../controllers/contributionController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', getContributions);

router.post('/', requireAuth, createContribution);
router.post('/bulk', requireAuth, createContributionsBulk);
router.put('/:id', requireAuth, updateContribution);
router.delete('/:id', requireAuth, deleteContribution);

module.exports = router;
