const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  contactPerson: { type: String, trim: true, default: "" },
  email: { type: String, lowercase: true, trim: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  address: { type: String, trim: true, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Supplier", supplierSchema);
