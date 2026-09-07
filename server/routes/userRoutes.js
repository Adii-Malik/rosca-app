// routes/userRoutes.js
const express = require('express');
const { createUser, getUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', getUsers);
router.get('/:id', getUser);

router.post('/', requireAuth, createUser);
router.put('/:id', requireAuth, updateUser);
router.delete('/:id', requireAuth, deleteUser);

module.exports = router;
