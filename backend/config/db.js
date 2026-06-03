const mongoose = require('mongoose');
const HRContact = require('../models/HRContact');
const TrainingDetail = require('../models/TrainingDetail');
const User = require('../models/User');
const Department = require('../models/Department');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/placeai');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed initial users if none exist
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('Seeding initial demo users...');
        await User.create([
          {
            name: 'Global Administrator',
            email: 'admin@placement.edu',
            password: 'password',
            role: 'overall',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
          },
          {
            name: 'Dr. Sarah Jenkins (Director)',
            email: 'director@placement.edu',
            password: 'password',
            role: 'director',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
          },
          {
            name: 'Mr. Rajesh Kumar (Placement Officer)',
            email: 'officer@placement.edu',
            password: 'password',
            role: 'officer',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
          },
          {
            name: 'Prof. Amit Sharma (Training Head)',
            email: 'training@placement.edu',
            password: 'password',
            role: 'training',
            avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face'
          }
        ]);
        console.log('Demo users seeded successfully!');
      }
    } catch (err) {
      console.error('Error seeding demo users:', err.message);
    }

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

    // Seed initial departments if none exist
    try {
      const deptCount = await Department.countDocuments();
      if (deptCount === 0) {
        console.log('Seeding initial departments...');
        const defaultDepts = ['CSE', 'IT', 'ADS', 'ECE', 'EEE', 'MECH', 'MECHATRONICS', 'CIVIL', 'FT'];
        await Department.create(
          defaultDepts.map(dept => ({
            department_code: dept,
            department_name: dept,
            active: true,
            is_active: true,
            created_from: 'seed'
          }))
        );
        console.log('Departments seeded successfully!');
      }
    } catch (err) {
      console.error('Error seeding departments:', err.message);
    }

    // Seed initial training details if none exist
    try {
      const trainingCount = await TrainingDetail.countDocuments();
      if (trainingCount === 0) {
        console.log('Seeding initial training details...');
        await TrainingDetail.create([
          {
            reg_no: '1920100001',
            name: 'Harsh Raj',
            department: 'CSE',
            aptitude_score: 82,
            coding_score: 91,
            communication_score: 75,
            mock_interview_score: 80,
            attendance: 92
          },
          {
            reg_no: '1920100002',
            name: 'Priya Sharma',
            department: 'CSE',
            aptitude_score: 90,
            coding_score: 95,
            communication_score: 85,
            mock_interview_score: 90,
            attendance: 95
          },
          {
            reg_no: '1920100003',
            name: 'Amit Verma',
            department: 'ECE',
            aptitude_score: 65,
            coding_score: 55,
            communication_score: 60,
            mock_interview_score: 65,
            attendance: 78
          },
          {
            reg_no: '1920100004',
            name: 'Rohan Das',
            department: 'ME',
            aptitude_score: 45,
            coding_score: 40,
            communication_score: 50,
            mock_interview_score: 55,
            attendance: 68
          },
          {
            reg_no: '1920100005',
            name: 'Sneha Reddy',
            department: 'IT',
            aptitude_score: 85,
            coding_score: 80,
            communication_score: 90,
            mock_interview_score: 85,
            attendance: 90
          },
          {
            reg_no: '1920100006',
            name: 'Vikram Singh',
            department: 'CE',
            aptitude_score: 58,
            coding_score: 48,
            communication_score: 62,
            mock_interview_score: 58,
            attendance: 72
          },
          {
            reg_no: '1920100007',
            name: 'Ananya Sen',
            department: 'IT',
            aptitude_score: 88,
            coding_score: 92,
            communication_score: 80,
            mock_interview_score: 88,
            attendance: 94
          },
          {
            reg_no: '1920100008',
            name: 'Arjun Nair',
            department: 'ECE',
            aptitude_score: 72,
            coding_score: 75,
            communication_score: 70,
            mock_interview_score: 75,
            attendance: 84
          },
          {
            reg_no: '1920100009',
            name: 'Divya Patel',
            department: 'CSE',
            aptitude_score: 80,
            coding_score: 85,
            communication_score: 82,
            mock_interview_score: 80,
            attendance: 88
          },
          {
            reg_no: '1920100010',
            name: 'Manoj Kumar',
            department: 'ME',
            aptitude_score: 62,
            coding_score: 58,
            communication_score: 65,
            mock_interview_score: 60,
            attendance: 80
          }
        ]);
        console.log('Training details seeded successfully!');
      }
    } catch (err) {
      console.error('Error seeding training details:', err.message);
    }

  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
