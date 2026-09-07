// routes/committeeRoutes.js
const express = require('express');
const {
    createCommittee, getCommittees, getCommittee, updateCommittee, deleteCommittee, setCommitteeStatus,
} = require('../controllers/committeeController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', getCommittees);
router.get('/:id', getCommittee);

router.post('/', requireAuth, createCommittee);
router.put('/:id', requireAuth, updateCommittee);
router.patch('/:id/status', requireAuth, setCommitteeStatus);
router.delete('/:id', requireAuth, deleteCommittee);

module.exports = router;
