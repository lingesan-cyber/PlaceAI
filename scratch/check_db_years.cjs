const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/placeai');
  console.log('Connected to MongoDB');

  const Student = mongoose.model('Student', new mongoose.Schema({ batch_year: Number }));
  const Placement = mongoose.model('Placement', new mongoose.Schema({ batch_year: Number, year: Number }));
  const BatchYear = mongoose.model('BatchYear', new mongoose.Schema({ year: Number, visible: Boolean }));

  const studentYears = await Student.distinct('batch_year');
  const placementBatchYears = await Placement.distinct('batch_year');
  const placementYears = await Placement.distinct('year');
  const batchYears = await BatchYear.find().lean();

  console.log('Student batch_years in DB:', studentYears);
  console.log('Placement batch_years in DB:', placementBatchYears);
  console.log('Placement years in DB:', placementYears);
  console.log('BatchYear records in DB:', batchYears);

  await mongoose.disconnect();
}

run();
