const express = require('express');
const router = express.Router();
const {
  getHRContacts,
  createHRContact,
  updateHRContact,
  deleteHRContact
} = require('../controllers/hrContactController');

router.route('/')
  .get(getHRContacts)
  .post(createHRContact);

router.route('/:id')
  .put(updateHRContact)
  .delete(deleteHRContact);

module.exports = router;
