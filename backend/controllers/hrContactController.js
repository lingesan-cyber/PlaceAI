const HRContact = require('../models/HRContact');

/**
 * @desc    Get all HR contacts (optional filtering by batch_year)
 * @route   GET /api/hr-contacts
 * @access  Public
 */
const getHRContacts = async (req, res, next) => {
  try {
    const { year, batch_year } = req.query;
    const filter = {};

    // Support both 'year' and 'batch_year' parameters
    const selectedYear = year || batch_year;
    if (selectedYear && String(selectedYear).trim().toLowerCase() !== 'all') {
      const numericYear = Number(selectedYear);
      if (!isNaN(numericYear)) {
        filter.batch_year = numericYear;
      }
    }

    const contacts = await HRContact.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'HR contacts retrieved successfully',
      data: contacts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new HR contact
 * @route   POST /api/hr-contacts
 * @access  Public
 */
const createHRContact = async (req, res, next) => {
  try {
    const { company_name, hr_name, email, phone, designation, notes, batch_year } = req.body;

    if (!company_name || !hr_name || !email) {
      res.status(400);
      throw new Error('Company name, HR name, and email are required fields');
    }

    if (!batch_year) {
      res.status(400);
      throw new Error('Batch year is required');
    }

    const numericYear = Number(batch_year);
    if (isNaN(numericYear) || numericYear < 2000) {
      res.status(400);
      throw new Error('Batch year must be a valid academic year >= 2000');
    }

    const contact = await HRContact.create({
      company_name: company_name.trim(),
      hr_name: hr_name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '',
      designation: designation ? designation.trim() : 'Talent Acquisition Head',
      notes: notes ? notes.trim() : '',
      batch_year: numericYear
    });

    res.status(201).json({
      success: true,
      message: 'HR contact created successfully',
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing HR contact
 * @route   PUT /api/hr-contacts/:id
 * @access  Public
 */
const updateHRContact = async (req, res, next) => {
  try {
    const { company_name, hr_name, email, phone, designation, notes, batch_year } = req.body;

    const contact = await HRContact.findById(req.params.id);
    if (!contact) {
      res.status(404);
      throw new Error(`HR contact with ID '${req.params.id}' not found`);
    }

    if (company_name !== undefined) contact.company_name = company_name.trim();
    if (hr_name !== undefined) contact.hr_name = hr_name.trim();
    if (email !== undefined) contact.email = email.trim();
    if (phone !== undefined) contact.phone = phone.trim();
    if (designation !== undefined) contact.designation = designation.trim();
    if (notes !== undefined) contact.notes = notes.trim();
    
    if (batch_year !== undefined) {
      const numericYear = Number(batch_year);
      if (isNaN(numericYear) || numericYear < 2000) {
        res.status(400);
        throw new Error('Batch year must be a valid academic year >= 2000');
      }
      contact.batch_year = numericYear;
    }

    await contact.save();

    res.status(200).json({
      success: true,
      message: 'HR contact updated successfully',
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an HR contact
 * @route   DELETE /api/hr-contacts/:id
 * @access  Public
 */
const deleteHRContact = async (req, res, next) => {
  try {
    const contact = await HRContact.findByIdAndDelete(req.params.id);

    if (!contact) {
      res.status(404);
      throw new Error(`HR contact with ID '${req.params.id}' not found`);
    }

    res.status(200).json({
      success: true,
      message: 'HR contact deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHRContacts,
  createHRContact,
  updateHRContact,
  deleteHRContact
};
