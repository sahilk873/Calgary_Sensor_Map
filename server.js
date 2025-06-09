import express from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
}

if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    console.error('Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is required');
    process.exit(1);
}

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Set up EJS for template rendering
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve homepage
app.get('/', (req, res) => {
    res.render('index', {
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    });
});

// Serve map page
app.get('/map', (req, res) => {
    res.render('map', {
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    });
});

// Create a mock sensors.json endpoint
app.get('/sensors.json', (req, res) => {
    // Read the sensors data from the JSON file
    const sensorsPath = join(__dirname, 'public', 'data', 'sensors.json');
    try {
        const sensorsData = JSON.parse(fs.readFileSync(sensorsPath, 'utf8'));
        res.json(sensorsData);
    } catch (error) {
        console.error('Error reading sensors data:', error);
        res.status(500).json({ error: 'Failed to load sensors data' });
    }
});

// Store chat histories (in memory - would use a database in production)
const chatHistories = new Map();

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sensor, context, chatId } = req.body;

        if (!message || !sensor) {
            return res.status(400).json({ error: 'Message and sensor data are required.' });
        }

        // Get or initialize chat history
        if (!chatHistories.has(chatId)) {
            chatHistories.set(chatId, [
                { 
                    role: "system", 
                    content: `You're a friendly local expert having a casual conversation about the ${sensor.name}. 
                             
                             About this sensor:
                             ${sensor.description.toLowerCase()}
                             It collects ${sensor.data_collected.join(', ')}.
                             
                             Key points to naturally weave into conversation:
                             - Installation: Been here since ${sensor.install_date}
                             - Maintenance: Last checked on ${sensor.last_maintenance}
                             - Privacy: ${sensor.privacy_policy}
                             
                             Conversation style:
                             - Be warm and approachable, like chatting with a friendly neighbor
                             - Use natural language and conversational tone
                             - Feel free to use casual phrases and friendly expressions
                             - Respond directly to questions with personal touches
                             - If listing points, keep them conversational and flowing
                             - Make the technology feel approachable and beneficial to daily life
                             
                             Remember: You're having a friendly chat, not giving a presentation. Make the user 
                             feel comfortable asking questions while being reassuring about data privacy.`
                }
            ]);
        }

        const chatHistory = chatHistories.get(chatId);
        chatHistory.push({ role: "user", content: message });

        // Keep only last 10 messages to prevent context from getting too long
        const recentMessages = chatHistory.slice(-10);
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: recentMessages,
            temperature: 0.7,  // Increased for more natural variation
            max_tokens: 200
        });

        const assistantMessage = completion.choices[0].message;
        
        // Light formatting to preserve natural flow while ensuring readability
        let cleanedResponse = assistantMessage.content
            // Keep single line breaks for natural pauses
            .replace(/\n{3,}/g, '\n\n')
            // Convert any formal bullet points to more natural dashes
            .replace(/[•*]/g, '-')
            // Ensure proper spacing after punctuation
            .replace(/([.!?])\s*(\w)/g, '$1 $2')
            // Remove any markdown formatting
            .replace(/[\*\_\`]/g, '')
            // Clean up extra whitespace while preserving paragraph breaks
            .trim()
            .replace(/\s+\n/g, '\n')
            .replace(/\n\s+/g, '\n');

        chatHistory.push(assistantMessage);

        res.json({ response: cleanedResponse });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: error.message || 'Failed to generate response' });
    }
});

// Cleanup chat histories periodically (every hour)
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    chatHistories.forEach((history, chatId) => {
        if (history.lastAccessed < oneHourAgo) {
            chatHistories.delete(chatId);
        }
    });
}, 60 * 60 * 1000);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
    console.log('Google Maps API Key configured:', !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}); 