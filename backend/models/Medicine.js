const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: String, required: true, trim: true },
  batchNumber: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  expiryDate: { type: Date, required: true },
  unit: { type: String, default: "units", trim: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
}, { timestamps: true });

module.exports = mongoose.model("Medicine", medicineSchema);
