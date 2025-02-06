require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const genai = new GoogleGenerativeAI('AIzaSyBrjSjw2Y6nbTq182znm7-tzODn-N2cTH0');
const model = genai.getGenerativeModel({ model: "gemini-pro" });
const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // Adjust frontend URL
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 24 * 60 * 60 * 1000 }, // 2 days
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            profilePic: profile.photos[0].value, // Ensure this field is saved
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize & Deserialize User
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// Routes
app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:5173/home", 
    failureRedirect: "http://localhost:5173/login",
  })
);

app.get("/api/auth-status", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

app.post("/api/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.json({ message: "Logged out successfully" });
  });
});

// Connect to MongoDB
mongoose
  .connect("mongodb+srv://saran:saranraj7s@cluster0.3nrdw.mongodb.net/sample")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));



  const responseCache = new Map();
  const CACHE_DURATION = 3600000;
  
  async function fetchSchemeDetails(schemeName) {
    try {
      // First, check our database
      const schemeFromDB = await Scheme.findOne({
        name: { $regex: new RegExp(schemeName, 'i') }
      });
      
      if (schemeFromDB) {
        return schemeFromDB;
      }
  
      // If not in database, check external APIs
      const response = await axios.get(`https://api.mockapi.io/schemes/v1/schemes?name=${encodeURIComponent(schemeName)}`);
      if (!response.data || response.data.length === 0) {
        const npiResponse = await axios.get(
          `https://services.india.gov.in/service/listing?cat=41&ln=en&term=${encodeURIComponent(schemeName)}`
        );
        
        // Store the new scheme in our database if found
        if (npiResponse.data) {
          const newScheme = new Scheme({
            name: schemeName,
            description: npiResponse.data.description || '',
            // Map other fields accordingly
          });
          await newScheme.save();
        }
        
        return npiResponse.data;
      }
      
      // Store the scheme from mockAPI in our database
      const schemeData = response.data[0];
      const newScheme = new Scheme({
        name: schemeData.name,
        description: schemeData.description || '',
        // Map other fields accordingly
      });
      await newScheme.save();
      
      return response.data;
    } catch (error) {
      console.error('Error fetching scheme details:', error);
      return null;
    }
  }
  function generatePrompt(question, schemeDetails) {
    let basePrompt = `As an AI assistant specializing in government schemes and policies, help with the following question: ${question}\n\n`;
    if (schemeDetails) {
      basePrompt += `Here are the specific details about the scheme:\n${JSON.stringify(schemeDetails)}\n\n`;
    }
    basePrompt += `Please provide a clear, conversational response that:
    1. Directly addresses the question using available information
    2. Highlights key benefits and eligibility criteria if applicable
    3. Uses simple, easy-to-understand language
    4. Includes specific examples where helpful
    5. Maintains cultural context and sensitivity
    6. Includes application process and requirements
    7. Provides relevant portal links for application
    If no scheme information is directly relevant, provide a helpful general response based on the available information.`;
    return basePrompt;
  }
  app.post('/ask', async (req, res) => {
    const { question } = req.body; 
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Missing question in request body',
      });
    }
  
    try {
      const cacheKey = question.toLowerCase();
      if (responseCache.has(cacheKey)) {
        const cachedResponse = responseCache.get(cacheKey);
        if (Date.now() - cachedResponse.timestamp < CACHE_DURATION) {
          return res.json(cachedResponse.data);
        }
        responseCache.delete(cacheKey);
      }
  
      const schemeNamePrompt = `Extract only the government scheme name from this question, if any: ${question}`;
      const schemeNameResult = await model.generateContent(schemeNamePrompt);
      const schemeName = schemeNameResult.response.text();
      const schemeDetails = schemeName ? await fetchSchemeDetails(schemeName) : null;
      const prompt = generatePrompt(question, schemeDetails);
      const result = await model.generateContent(prompt);
      const aiResponse = result.response.text();
      const finalResponse = {
        success: true,
        answer: aiResponse,
        schemeDetails: schemeDetails,
        applicationLink: schemeDetails?.applicationLink || 'https://services.india.gov.in'
      };
      responseCache.set(cacheKey, {
        data: finalResponse,
        timestamp: Date.now()
      });
  
      res.json(finalResponse);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate response',
        details: error.message
      });
    }
  });
  app.post('/clear-cache', (req, res) => {
    responseCache.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  });

app.listen(3000, () => console.log("Server running on port 3000"));
