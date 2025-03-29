import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { JSONDATA_LIMIT, URLDATA_LIMIT } from "./constants.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import axios from "axios";

const app = express();

// Use CORS with specific origin (example: localhost during development)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',  // Replace with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow credentials (cookies, Authorization headers)
}));

app.use(express.json({ limit: JSONDATA_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: URLDATA_LIMIT }));
app.use(express.static("public"));
app.use(cookieParser());

// Example route
app.get("/api/v1", (req, res) => {
  res.send("<h1>API is working</h1>");
});

// Additional routes
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.get('/auth', (req, res) => {
  const { shop } = req.query;
  if (!shop) {
    return res.status(400).json({ error: "Missing shop parameter" });
  }

  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${process.env.SHOPIFY_SCOPES}` +
    `&redirect_uri=${process.env.SHOPIFY_REDIRECT_URI}` +
    `&state=randomSecureString`;

  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) {
    return res.status(400).json({ error: "Missing shop or code parameter" });
  }

  try {
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code: code,
    });

    const accessToken = response.data.access_token;
    console.log("Access Token:", accessToken);

    res.json({ success: true, message: "App installed successfully", accessToken });
  } catch (error) {
    console.error("Error getting access token:", error);
    res.status(500).json({ error: "Failed to get access token" });
  }
});

// Routes
import userRouter from "./routes/user.route.js";
import shopifyRouter from "./routes/shopify.route.js";
import bargainingRouter from "./routes/bargaining.route.js";
import companyRouter from "./routes/company.route.js";

app.use("/users", userRouter);
app.use("/company", companyRouter);
app.use("/shopify", shopifyRouter);
app.use("/bargaining", bargainingRouter);

app.use(errorMiddleware);

export default app;
