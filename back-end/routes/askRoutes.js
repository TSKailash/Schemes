const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const Scheme = require('../Scheme');

require('dotenv').config();

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genai.getGenerativeModel({ model: "gemini-pro" });

const responseCache = new Map();
const CACHE_DURATION = 3600000;

async function fetchSchemeDetails(schemeName) {
  try {
    const schemeFromDB = await Scheme.findOne({
      name: { $regex: new RegExp(schemeName, 'i') }
    });

    if (schemeFromDB) return schemeFromDB;

    const response = await axios.get(`https://api.mockapi.io/schemes/v1/schemes?name=${encodeURIComponent(schemeName)}`);
    
    if (!response.data || response.data.length === 0) {
      const npiResponse = await axios.get(
        `https://services.india.gov.in/service/listing?cat=41&ln=en&term=${encodeURIComponent(schemeName)}`
      );

      if (npiResponse.data) {
        const newScheme = new Scheme({
          name: schemeName,
          description: npiResponse.data.description || '',
          applicationLink: `https://services.india.gov.in/service/details?scheme=${encodeURIComponent(schemeName)}`
        });
        await newScheme.save();
      }

      return npiResponse.data;
    }

    const schemeData = response.data[0];
    const newScheme = new Scheme({
      name: schemeData.name,
      description: schemeData.description || '',
      applicationLink: schemeData.applicationLink || `https://services.india.gov.in/service/details?scheme=${encodeURIComponent(schemeData.name)}`
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

function formatResponseWithLinks(response, applicationLink) {
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

  const formattedResponse = response.replace(urlRegex, (url) => {
    const displayUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
    return `[${displayUrl}](${url})`;
  });

  if (applicationLink && !formattedResponse.includes(applicationLink)) {
    return `${formattedResponse}\n\n**Application Link:** [Apply Here](${applicationLink})`;
  }

  return formattedResponse;
}

router.post('/ask', async (req, res) => {
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
    const schemeName = schemeNameResult.response.text().trim();
    const schemeDetails = schemeName ? await fetchSchemeDetails(schemeName) : null;
    const prompt = generatePrompt(question, schemeDetails);
    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();
    
    const applicationLink = schemeDetails?.applicationLink || 'https://services.india.gov.in';
    const formattedResponse = formatResponseWithLinks(aiResponse, applicationLink);

    const finalResponse = {
      success: true,
      answer: formattedResponse,
      schemeDetails: schemeDetails,
      applicationLink: applicationLink
    };

    responseCache.set(cacheKey, {
      data: finalResponse,
      timestamp: Date.now()
    });

    res.json(finalResponse);
  } catch (error) {
    console.error('Detailed Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      details: error.message || 'Unknown error occurred',
      errorStack: error.stack
    });
  }
});

router.post('/clear-cache', (req, res) => {
  responseCache.clear();
  res.json({ success: true, message: 'Cache cleared successfully' });
});

module.exports = router;
