const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const genai = new GoogleGenerativeAI('AIzaSyBrjSjw2Y6nbTq182znm7-tzODn-N2cTH0');
const model = genai.getGenerativeModel({ model: "gemini-pro" });

app.use(cors());
app.use(express.json());
const responseCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function fetchSchemeDetails(schemeName) {
  try {
    const response = await axios.get(`https://api.mockapi.io/schemes/v1/schemes?name=${encodeURIComponent(schemeName)}`);
    
    // Fallback to National Portal of India's scheme database
    if (!response.data || response.data.length === 0) {
      const npiResponse = await axios.get(
        `https://services.india.gov.in/service/listing?cat=41&ln=en&term=${encodeURIComponent(schemeName)}`
      );
      return npiResponse.data;
    }
    
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



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});