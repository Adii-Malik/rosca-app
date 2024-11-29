// routes/committeeRoutes.js
const express = require('express');
const { createCommittee, getCommittees, getCommittee, updateCommittee, deleteCommittee } = require('../controllers/committeeController');
const router = express.Router();

router.post('/', createCommittee);
router.get('/', getCommittees);
router.get('/:id', getCommittee);
router.put('/:id', updateCommittee);
router.delete('/:id', deleteCommittee);

module.exports = router;