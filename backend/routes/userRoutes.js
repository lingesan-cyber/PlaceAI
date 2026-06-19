const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

router.patch('/:id/activate', activateUser);
router.patch('/:id/deactivate', deactivateUser);

module.exports = router;
