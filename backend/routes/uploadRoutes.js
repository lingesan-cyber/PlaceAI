const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {
  uploadJsonPlacements,
  uploadExcelPlacements
} = require('../controllers/uploadController');

// Ensure backend/uploads/ directory exists for temporary Multer files
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter limits to standard office spreadsheets & JSON files
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      ext === '.json' ||
      ext === '.xlsx' ||
      ext === '.xls' ||
      ext === '.csv'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported formats are: .json, .csv, .xlsx, .xls'));
    }
  }
});

// Endpoint mappings
router.post('/json', upload.single('file'), uploadJsonPlacements);
router.post('/excel', upload.single('file'), uploadExcelPlacements);

module.exports = router;
