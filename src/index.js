import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";
import path from "path";
import { fileURLToPath } from "url";

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load environment variables correctly
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log(process.env.PORT);
const PORT = process.env.PORT || 5000;
const MONGO_URI =  "mongodb://localhost:27017/demobargenix";

// process.env.MONGO_URI ||
if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is missing. Check your .env file.");
  process.exit(1);
}

console.log(MONGO_URI);

console.log("🔍 Loaded MongoDB URI:", MONGO_URI ? "✅ Found" : "❌ Not Found");

// ✅ Improved MongoDB Connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  });
