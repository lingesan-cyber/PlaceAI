const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/placeai');
  console.log('Connected to MongoDB');

  const Student = mongoose.model('Student', new mongoose.Schema({ batch_year: Number, name: String, reg_no: String }));
  const Placement = mongoose.model('Placement', new mongoose.Schema({ batch_year: Number, year: Number, name: String, company: String }));

  const students2027 = await Student.find({ batch_year: 2027 }).limit(5).lean();
  const placements2027 = await Placement.find({ $or: [{ batch_year: 2027 }, { year: 2027 }] }).limit(5).lean();

  console.log('Sample 2027 Students in MongoDB:', students2027);
  console.log('Sample 2027 Placements in MongoDB:', placements2027);

  await mongoose.disconnect();
}

run();
