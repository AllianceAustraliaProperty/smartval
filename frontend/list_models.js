const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: 'C:/Users/agniv/Documents/Repositories/smartval/frontend/.env' });
const apiKey = process.env.GEMINI_API_KEY_1;

if (!apiKey) {
  console.log("No API key found in .env");
  process.exit(1);
}

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(res => res.json())
  .then(data => {
    if (data.models) {
      const flashModels = data.models
        .filter(m => m.name.includes('flash'))
        .map(m => m.name);
      console.log("Available flash models:");
      console.log(flashModels.join('\n'));
    } else {
      console.log("Error fetching models:", data);
    }
  })
  .catch(err => console.error("Request failed:", err));
