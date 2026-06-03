const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getUserProfile,
  updateUserProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.put('/change-password', protect, changePassword);

module.exports = router;
