// models/Scheme.js
const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  eligibilityCriteria: {
    type: [String],
    default: []
  },
  benefits: {
    type: [String],
    default: []
  },
  applicationProcess: {
    type: String
  },
  applicationLink: {
    type: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Scheme', schemeSchema);