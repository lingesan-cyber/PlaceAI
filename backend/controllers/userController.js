const User = require('../models/User');

const roleAvatars = {
  director: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  officer: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  training: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face',
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user
// @route   POST /api/users
// @access  Private
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, avatar } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    const assignedAvatar = avatar || roleAvatars[role] || roleAvatars.director;

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      avatar: assignedAvatar,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { name, email, role, avatar, isActive } = req.body;

    if (name) user.name = name;
    if (role) user.role = role;
    if (avatar !== undefined) user.avatar = avatar;
    if (isActive !== undefined) user.isActive = isActive;

    if (email && email.toLowerCase() !== user.email) {
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
      message: 'User updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        isActive: updatedUser.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user
// @route   PATCH /api/users/:id/deactivate
// @access  Private
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully',
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate user
// @route   PATCH /api/users/:id/activate
// @access  Private
const activateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user.isActive = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User account activated successfully',
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  activateUser
};
