const mongoose = require('mongoose');
const HRContact = require('../models/HRContact');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/placeai');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed initial HR contacts if none exist
    try {
      const count = await HRContact.countDocuments();
      if (count === 0) {
        console.log('Seeding initial HR contacts...');
        await HRContact.create([
          {
            hr_name: 'BHEL Talent Acquisition Head',
            company_name: 'BHEL',
            email: 'ta-head@bhel.com',
            phone: '+91 98400000',
            designation: 'Talent Acquisition Head',
            notes: '• Initial corporate communication log logged.',
            batch_year: 2024
          },
          {
            hr_name: 'Tata Elxsi Talent Acquisition Head',
            company_name: 'Tata Elxsi',
            email: 'ta-head@tataelxsi.com',
            phone: '+91 98400001',
            designation: 'Talent Acquisition Head',
            notes: '• Campus recruitment drive finalized.',
            batch_year: 2024
          },
          {
            hr_name: 'Infosys Lead Recruiter',
            company_name: 'Infosys',
            email: 'ta-lead@infosys.com',
            phone: '+91 98400002',
            designation: 'Lead Recruiter',
            notes: '• Pre-placement talk details shared.',
            batch_year: 2025
          },
          {
            hr_name: 'Wipro Recruitment Manager',
            company_name: 'Wipro',
            email: 'manager@wipro.com',
            phone: '+91 98400003',
            designation: 'Recruitment Manager',
            notes: '• Syllabus and cutoff criteria communicated.',
            batch_year: 2026
          }
        ]);
        console.log('HR contacts seeded successfully!');
      }
    } catch (err) {
      console.error('Error seeding HR contacts:', err.message);
    }
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
