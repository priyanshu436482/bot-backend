import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env first, then from the local server folder
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so the React client (running on another port like 5173) can access the API
app.use(cors({
  origin: '*', // In production, replace with specific domain
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Check if a valid API key is provided
const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;
const hasValidKey = apiKey && apiKey !== 'your_api_key_here' && apiKey.trim() !== '';

let openai = null;
if (hasValidKey) {
  const options = { apiKey };
  if (baseURL && baseURL.trim() !== '') {
    options.baseURL = baseURL.trim();
    console.log(`🔑 API Key detected. Using custom base URL endpoint: ${baseURL}`);
  } else {
    console.log('🔑 OpenAI API Key detected. Using live OpenAI completion mode.');
  }
  openai = new OpenAI(options);
} else {
  console.log('⚠️ API Key NOT detected or is placeholder. Server will run in premium simulation mode.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: hasValidKey ? (baseURL ? 'custom-endpoint' : 'openai') : 'simulated (missing API key)',
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    endpoint: baseURL || 'default-openai'
  });
});

// Chat endpoint supporting both streaming and standard JSON responses
app.post(['/chat', '/api/chat'], async (req, res) => {
  const { messages, stream = true } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  // Fallback to high-quality interactive streaming simulation if API key is missing
  if (!hasValidKey) {
    return runSimulatedStream(messages, res);
  }

  try {
    if (stream) {
      // Set headers for Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let responseStream;
      try {
        responseStream = await openai.chat.completions.create({
          model: model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        });
      } catch (apiError) {
        console.error('🔴 OpenAI SDK Error, falling back to simulated stream:', apiError.message);
        const alertPrefix = `> ⚠️ **Notice: Live OpenAI API Call failed.** (Reason: *${apiError.message}*)\n>\n> *Auto-falling back to ChatNova simulation mode so you can continue testing this UI! Go ahead and ask me for code, tables, or explanation questions.*\n\n`;
        return runSimulatedStream(messages, res, alertPrefix);
      }

      for await (const chunk of responseStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Regular JSON request
      try {
        const response = await openai.chat.completions.create({
          model: model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });
        const content = response.choices[0]?.message?.content || '';
        res.json({ content });
      } catch (apiError) {
        console.error('🔴 OpenAI SDK Error, falling back to simulated JSON:', apiError.message);
        res.json({ 
          content: `> ⚠️ **Notice: Live OpenAI API Call failed.** (Reason: *${apiError.message}*)\n\nHello! I am simulating a response because your API key returned an error.` 
        });
      }
    }
  } catch (error) {
    console.error('🔴 General Server Error:', error);
    if (stream && res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message || 'An error occurred during OpenAI completion.' });
    }
  }
});

// A high-fidelity interactive simulation response to show off streaming, markdown, lists, tables, and code formatting
function runSimulatedStream(messages, res, prefixText = '') {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userMessage = messages[messages.length - 1]?.content || '';
  let responseText = '';

  const lowerMessage = userMessage.toLowerCase();
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('start')) {
    responseText = `### Hello there! 👋

I am **ChatNova**, running in **developer simulation mode** because your \`.env\` file does not contain a valid \`OPENAI_API_KEY\`. 

To activate my true OpenAI core:
1. Open the \`.env\` file in the project root folder.
2. Insert your actual API key: \`OPENAI_API_KEY=sk-...\`.
3. Restart the server: \`npm run dev\`.

In the meantime, feel free to explore this ultra-premium interface! I can fully simulate:
- 💻 **Syntax Highlighted Code** (Ask me to: *'write code'*)
- 📊 **Markdown Tables & Lists** (Ask me to: *'show a table'*)
- 🎨 **Dynamic Glassmorphism visuals & Speech synthesis**

How can I help you test this gorgeous interface today?`;
  } else if (lowerMessage.includes('code') || lowerMessage.includes('javascript') || lowerMessage.includes('python') || lowerMessage.includes('algorithm') || lowerMessage.includes('write')) {
    responseText = `Here is a complete, production-ready implementation of a **QuickSort** algorithm in JavaScript, complete with a markdown table explaining its complexities!

\`\`\`javascript
/**
 * QuickSort implementation in JavaScript
 * @param {Array} arr - The array to be sorted
 * @returns {Array} - The sorted array
 */
function quickSort(arr) {
  if (arr.length <= 1) {
    return arr;
  }

  // Choosing the middle element as the pivot
  const pivotIndex = Math.floor(arr.length / 2);
  const pivot = arr[pivotIndex];
  const left = [];
  const right = [];

  for (let i = 0; i < arr.length; i++) {
    if (i === pivotIndex) continue;
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }

  return [...quickSort(left), pivot, ...quickSort(right)];
}

// Example usage:
const unsorted = [34, 7, 23, 32, 5, 62];
console.log("Original Array:", unsorted);
console.log("Sorted Array:", quickSort(unsorted));
// Output: [5, 7, 23, 32, 34, 62]
\`\`\`

### Time and Space Complexity

| Complexity Case | Complexity Class | Description |
| :--- | :--- | :--- |
| **Best Case** | $\\mathcal{O}(n \\log n)$ | Occurs when the pivot partition always splits the array exactly in half. |
| **Average Case** | $\\mathcal{O}(n \\log n)$ | The expected runtime over typical randomized inputs. |
| **Worst Case** | $\\mathcal{O}(n^2)$ | Occurs when the pivot is consistently the smallest or largest element. |
| **Space Complexity** | $\\mathcal{O}(\\log n)$ | Relates to the call stack depth required for recursive partitioning. |

Need any other code snippet? I can write Python, HTML/CSS, Rust, and more!`;
  } else if (lowerMessage.includes('table') || lowerMessage.includes('list') || lowerMessage.includes('show')) {
    responseText = `Here is a custom technical comparison of modern UI design frameworks:

| Design System | Creator | Core Strengths | Theme Aesthetics |
| :--- | :--- | :--- | :--- |
| **Material Design** | Google | Grid layouts, clean standardized shadows | Solid colors, clean UI transitions |
| **Tailwind UI** | Tailwind Labs | Highly customizable utility tokens | Modern dark panels, gorgeous gradients |
| **Ant Design** | Alibaba | Massive enterprise component library | High-contrast clean corporate look |
| **Shadcn UI** | Radix / Tailwind | Minimalistic, accessible copy-paste blocks | Sleek high-fidelity dark glassmorphism |

### 🌟 Key Design Trends in 2026
* **Interstellar Glows:** Dark modes built with subtle back-lit drop shadows.
* **Glassmorphism:** Leveraging high CSS \`backdrop-filter\` blur for layered clarity.
* **Bento Grids:** Grouping features in beautiful card clusters of varying size.

Let me know if you would like me to compile more information!`;
  } else {
    responseText = `You asked: *"${userMessage}"*

Here is a comprehensive simulated response designed to showcase the markdown rendering, code styling, speech narration, and ultra-fast streaming capabilities of this application:

### 🚀 Key Features Active Now
1. **Streaming SSE Client:** Your React client is reading standard Server-Sent Events (SSE) in real-time.
2. **Local Storage Memory:** All conversations you create in the sidebar are saved in your browser!
3. **Speech Synthesis:** Click the speaker icon on my messages to hear me speak!
4. **Theme Switcher:** Switch between Cyber Dark (neon glow) and Crystal Light themes using the toggle.

### 💻 System Configuration Check
\`\`\`json
{
  "status": "simulation_active",
  "reason": "Missing or inactive billing for OPENAI_API_KEY",
  "fallback_model": "gpt-4.1-mini (simulated)",
  "features_enabled": [
    "SSE_Streaming",
    "Markdown_Rendering",
    "Syntax_Highlighting",
    "Conversations_History",
    "Speech_Synthesis",
    "Glassmorphism"
  ]
}
\`\`\`

> **Pro Tip:** Insert your actual API key: \`OPENAI_API_KEY=sk-...\` into the \`.env\` file in the project's root folder, restart the server, and I will instantly connect to OpenAI!

What do you think of the glowing neon style of this application?`;
  }

  // Stream the response back in words with custom random delays to mimic a real chat stream
  const fullText = prefixText + responseText;
  const words = fullText.split(' ');
  let index = 0;

  function streamChunk() {
    if (index < words.length) {
      const nextWord = words[index] + (index === words.length - 1 ? '' : ' ');
      res.write(`data: ${JSON.stringify({ content: nextWord })}\n\n`);
      index++;
      const delay = Math.random() * 40 + 15; // Realistic word-by-word streaming speeds
      setTimeout(streamChunk, delay);
    } else {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  streamChunk();
}

app.listen(PORT, () => {
  console.log(`🚀 Express Server is running on http://localhost:${PORT}`);
});

export default app;
