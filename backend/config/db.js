const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/medistock";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("MongoDB Connected Successfully!");
  } catch (err) {
    if (process.env.NODE_ENV !== "production" && uri !== "mongodb://127.0.0.1:27017/medistock") {
      console.warn("Could not connect to configured MONGO_URI, falling back to local MongoDB...");
      await mongoose.connect("mongodb://127.0.0.1:27017/medistock", { serverSelectionTimeoutMS: 5000 });
      console.log("Connected to local MongoDB (mongodb://127.0.0.1:27017/medistock)!");
      return;
    }
    throw err;
  }
};

module.exports = connectDB;
