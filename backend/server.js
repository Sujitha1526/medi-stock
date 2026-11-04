const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

if (process.argv.includes("--local-db")) {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/medistock";
}

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: "1mb" }));

const User = require("./models/User");
const Medicine = require("./models/Medicine");
const Supplier = require("./models/Supplier");
const Sale = require("./models/Sale");

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });

const authenticate = asyncRoute(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Sign in to continue." });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
  req.user = await User.findById(payload.id).select("-password");
  if (!req.user) return res.status(401).json({ message: "Account not found." });
  next();
});

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required." });
  next();
};

app.get("/", (_req, res) => res.json({ message: "MediStock API is running." }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/auth/setup-status", asyncRoute(async (_req, res) => {
  res.json({ needsSetup: (await User.countDocuments()) === 0 });
}));

app.post("/api/auth/setup", asyncRoute(async (req, res) => {
  if (await User.countDocuments()) return res.status(409).json({ message: "Initial setup is already complete." });
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required." });
  }
  const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password, role: "admin" });
  res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase().trim() }).select("+password");
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) {
    return res.status(401).json({ message: "The email or password is incorrect." });
  }
  res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}));

app.get("/api/auth/me", authenticate, (req, res) => res.json({ user: req.user }));
app.post("/api/auth/staff", authenticate, adminOnly, asyncRoute(async (req, res) => {
  const { name, email, password, role = "staff" } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8 || !["admin", "staff"].includes(role)) {
    return res.status(400).json({ message: "Provide a name, valid role, email, and password of at least 8 characters." });
  }
  const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password, role });
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}));
app.get("/api/auth/staff", authenticate, adminOnly, asyncRoute(async (_req, res) => {
  const staff = await User.find().select("name email role createdAt").sort({ name: 1 });
  res.json({ staff });
}));

app.use("/api", authenticate);

app.get("/api/medicines", asyncRoute(async (req, res) => {
  const { search = "", category, status } = req.query;
  const filter = {};
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } }, { brand: { $regex: search, $options: "i" } },
    { sku: { $regex: search, $options: "i" } }, { category: { $regex: search, $options: "i" } },
  ];
  if (category && category !== "All categories") filter.category = category;
  if (status === "Low stock") filter.$expr = { $lte: ["$quantity", "$lowStockThreshold"] };
  if (status === "Expiring soon") filter.expiryDate = { $lte: new Date(Date.now() + 90 * 86400000), $gte: new Date() };
  const medicines = await Medicine.find(filter).populate("supplier", "name").sort({ updatedAt: -1 });
  res.json({ medicines });
}));

app.post("/api/medicines", asyncRoute(async (req, res) => {
  const medicine = await Medicine.create(req.body);
  res.status(201).json({ medicine });
}));

app.put("/api/medicines/:id", asyncRoute(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!medicine) return res.status(404).json({ message: "Medicine not found." });
  res.json({ medicine });
}));

app.delete("/api/medicines/:id", asyncRoute(async (req, res) => {
  const medicine = await Medicine.findByIdAndDelete(req.params.id);
  if (!medicine) return res.status(404).json({ message: "Medicine not found." });
  res.json({ message: "Medicine deleted." });
}));

app.get("/api/suppliers", asyncRoute(async (_req, res) => {
  res.json({ suppliers: await Supplier.find().sort({ name: 1 }) });
}));
app.post("/api/suppliers", asyncRoute(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ supplier });
}));
app.put("/api/suppliers/:id", asyncRoute(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!supplier) return res.status(404).json({ message: "Supplier not found." });
  res.json({ supplier });
}));
app.delete("/api/suppliers/:id", asyncRoute(async (req, res) => {
  if (await Medicine.exists({ supplier: req.params.id })) {
    return res.status(409).json({ message: "This supplier is linked to inventory and cannot be deleted yet." });
  }
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) return res.status(404).json({ message: "Supplier not found." });
  res.json({ message: "Supplier deleted." });
}));

app.get("/api/sales", asyncRoute(async (req, res) => {
  const { from, to, search = "" } = req.query;
  const filter = {};
  if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
  if (search) filter.$or = [
    { invoiceNumber: { $regex: search, $options: "i" } }, { customerName: { $regex: search, $options: "i" } },
  ];
  res.json({ sales: await Sale.find(filter).populate("soldBy", "name").sort({ createdAt: -1 }).limit(200) });
}));

app.post("/api/sales", asyncRoute(async (req, res) => {
  const { items, customerName = "Walk-in customer", discount = 0, paymentMethod = "Cash" } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Add at least one medicine to the bill." });
  if (!["Cash", "Card", "UPI"].includes(paymentMethod)) return res.status(400).json({ message: "Choose a valid payment method." });
  const quantities = new Map();
  for (const item of items) {
    if (!mongoose.isValidObjectId(item.medicine) || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) {
      return res.status(400).json({ message: "Each bill item needs a valid medicine and quantity." });
    }
    quantities.set(String(item.medicine), (quantities.get(String(item.medicine)) || 0) + Number(item.quantity));
  }
  const snapshots = [];
  let total = 0;
  const saleItems = [];
  try {
    for (const [id, quantity] of quantities) {
      const medicine = await Medicine.findOneAndUpdate(
        { _id: id, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: false },
      );
      if (!medicine) throw new Error("STOCK");
      snapshots.push({ id, quantity });
      total += medicine.sellingPrice * quantity;
      saleItems.push({ medicine: medicine._id, medicineName: medicine.name, sku: medicine.sku, quantity, unitPrice: medicine.sellingPrice });
    }
    const safeDiscount = Number(discount);
    if (!Number.isFinite(safeDiscount) || safeDiscount < 0 || safeDiscount > total) throw new Error("DISCOUNT");
    const sale = await Sale.create({
      invoiceNumber: `MS-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90 + 10)}`,
      customerName: String(customerName).trim() || "Walk-in customer",
      items: saleItems, subtotal: total, discount: safeDiscount, total: total - safeDiscount,
      paymentMethod, soldBy: req.user._id,
    });
    res.status(201).json({ sale });
  } catch (error) {
    await Promise.all(snapshots.map(({ id, quantity }) => Medicine.updateOne({ _id: id }, { $inc: { quantity } })));
    if (error.message === "STOCK") return res.status(409).json({ message: "A medicine does not have enough stock for this bill." });
    if (error.message === "DISCOUNT") return res.status(400).json({ message: "Discount must be between zero and the bill subtotal." });
    throw error;
  }
}));

app.get("/api/dashboard", asyncRoute(async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const soon = new Date(now.getTime() + 90 * 86400000);
  const [inventory, lowStock, expiring, monthSales, recentSales, topMedicines] = await Promise.all([
    Medicine.countDocuments(),
    Medicine.countDocuments({ $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }),
    Medicine.countDocuments({ expiryDate: { $gte: now, $lte: soon } }),
    Sale.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]),
    Sale.find().populate("soldBy", "name").sort({ createdAt: -1 }).limit(6),
    Sale.aggregate([
      { $unwind: "$items" }, { $group: { _id: "$items.medicineName", units: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
      { $sort: { units: -1 } }, { $limit: 5 },
    ]),
  ]);
  const chartFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const salesByMonth = await Sale.aggregate([
    { $match: { createdAt: { $gte: chartFrom } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);
  const lowStockItems = await Medicine.find({ $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }).sort({ quantity: 1 }).limit(5).select("name quantity lowStockThreshold unit");
  const expiringItems = await Medicine.find({ expiryDate: { $gte: now, $lte: soon } }).sort({ expiryDate: 1 }).limit(5).select("name expiryDate quantity");
  const month = monthSales[0] || { revenue: 0, orders: 0 };
  res.json({
    stats: { inventory, lowStock, expiring, revenue: month.revenue, orders: month.orders },
    salesByMonth, recentSales, topMedicines, lowStockItems, expiringItems,
  });
}));

app.get("/api/reports", asyncRoute(async (req, res) => {
  const end = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : new Date();
  const start = req.query.from ? new Date(req.query.from) : new Date(end.getFullYear(), end.getMonth() - 5, 1);
  const [summary, salesByDay, topMedicines] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 }, averageOrder: { $avg: "$total" } } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } }, { $unwind: "$items" },
      { $group: { _id: "$items.medicineName", units: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } },
      { $sort: { revenue: -1 } }, { $limit: 10 },
    ]),
  ]);
  res.json({ summary: summary[0] || { revenue: 0, orders: 0, averageOrder: 0 }, salesByDay, topMedicines });
}));

app.use((err, _req, res, _next) => {
  if (err.code === 11000) return res.status(409).json({ message: "A record with that email, SKU, or name already exists." });
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid record identifier." });
  console.error(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be set in the backend environment.");
    await connectDB();
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`MediStock API listening on port ${port}`));
  } catch (error) {
    console.error("Unable to start MediStock API:", error.message);
    process.exitCode = 1;
  }
};

if (require.main === module) startServer();
module.exports = app;
