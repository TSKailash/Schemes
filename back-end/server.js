const express = require('express');
const cors = require('cors');
const connectDB = require('./database');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Connect to database
connectDB();

app.use(
  cors({
    origin: "http://localhost:5173", // Allow requests only from your frontend
    credentials: true, // Allow cookies and authentication headers
  })
);
app.use(express.json());

// Import and use routes
const routes = require('./routes');
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
