// routes/userRoutes.js
const express = require('express');
const { createUser, getUsers, getUser, updateUser, deleteUser } = require('../controllers/userController');
const router = express.Router();

router.post('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;