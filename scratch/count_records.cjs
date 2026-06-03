const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/placeai');
  console.log('Connected to MongoDB');

  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
  const Placement = mongoose.model('Placement', new mongoose.Schema({}, { strict: false }));
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }));

  const studentCount = await Student.countDocuments();
  const placementCount = await Placement.countDocuments();
  const companyCount = await Company.countDocuments();

  console.log('Total Students:', studentCount);
  console.log('Total Placements:', placementCount);
  console.log('Total Companies:', companyCount);

  // Let's print some sample companies
  const sampleCompanies = await Company.find({}).limit(5).lean();
  console.log('Sample Companies:', sampleCompanies);

  // Let's count companies by status or batch
  const companyStatuses = await Company.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  console.log('Company Statuses:', companyStatuses);

  await mongoose.disconnect();
}

run();
