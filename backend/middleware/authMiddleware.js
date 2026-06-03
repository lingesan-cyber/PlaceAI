const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the database, excluding password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        return res.json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      return res.json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } else {
    res.status(401);
    return res.json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

module.exports = { protect };
