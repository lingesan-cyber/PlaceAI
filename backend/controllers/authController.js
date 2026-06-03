const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const roleAvatars = {
  overall: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  director: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  officer: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  training: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face',
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please enter all required fields');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    const assignedRole = role || 'overall';
    const avatar = roleAvatars[assignedRole] || roleAvatars.overall;

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      avatar
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please enter email and password');
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    // req.user has already been populated in the protect middleware (excluding password)
    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged-in user details
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update currently logged-in user details
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { name, email, avatar } = req.body;

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;

    if (email && email.toLowerCase() !== user.email) {
      // Validate uniqueness of the new email
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        res.status(400);
        throw new Error('Email address is already in use by another account');
      }
      user.email = email.toLowerCase();
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400);
      throw new Error('Please fill in all fields');
    }

    if (newPassword !== confirmPassword) {
      res.status(400);
      throw new Error('Passwords do not match');
    }

    if (newPassword === currentPassword) {
      res.status(400);
      throw new Error('New password cannot be the same as current password');
    }

    // Password strength verification
    if (newPassword.length < 8) {
      res.status(400);
      throw new Error('New password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(newPassword)) {
      res.status(400);
      throw new Error('New password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
      res.status(400);
      throw new Error('New password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      res.status(400);
      throw new Error('New password must contain at least one number');
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Check if current password is correct
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(401);
      throw new Error('Incorrect current password');
    }

    // Update user password - will trigger pre('save') hash hook
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getUserProfile,
  updateUserProfile,
  changePassword
};
