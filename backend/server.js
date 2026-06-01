const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

// Import REST Route Routers
const placementRoutes = require('./routes/placementRoutes');
const studentRoutes = require('./routes/studentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const yearRoutes = require('./routes/yearRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const hrContactRoutes = require('./routes/hrContactRoutes');

// Load environment configurations
dotenv.config();

// Establish Mongoose Database Connection pool
connectDB();

const app = express();

// Global Middlewares
app.use(cors({
  origin: '*', // Allow full access for front-end integrations
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PlaceAI API service is running normally',
    timestamp: new Date()
  });
});

// RESTful Route Mounts
app.use('/api/placements', placementRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/hr-contacts', hrContactRoutes);

// Unmatched Route Catchment
app.use(notFound);

// Standard Exception Handling Formatter
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`PlaceAI Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
