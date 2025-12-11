
/**
 * Express server for Commander AI (Ollama backend).
 * Accepts POST /api/stream { message, mode } and streams SSE tokens returned by Ollama.
 */
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const Database = require('better-sqlite3');

dotenv.config();
const { ollamaHost, model } = require('./config');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

// Simple local SQLite DB for chat history
const dbPath = path.resolve(__dirname, 'chat_history.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.prepare(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT,
  content TEXT,
  createdAt TEXT
)`).run();

function saveMessage(role, content) {
  const stmt = db.prepare('INSERT INTO messages (role, content, createdAt) VALUES (?, ?, ?)');
  stmt.run(role, content, new Date().toISOString());
}

app.get('/api/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM messages ORDER BY id ASC').all();
  res.json(rows);
});

// SSE streaming endpoint that proxies to Ollama local API and forwards token chunks
app.post('/api/stream', async (req, res) => {
  try {
    const { message, mode } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Build prompt wrapper based on mode
    let systemPrompt = '';
    if (mode === 'robotic') systemPrompt = 'You are a robotic assistant. Reply tersely.';
    else if (mode === 'strict') systemPrompt = 'You are strict and formal.';
    else systemPrompt = 'You are friendly and helpful.';

    // Ollama generate API: POST /api/generate with model & prompt
    const url = `${ollamaHost}/api/generate`;
    const payload = {
      model: model,
      prompt: `${systemPrompt}\nUser: ${message}\nAssistant:`,
      stream: true,
      // You can add other generation options as needed
    };

    // Forward request to Ollama and stream response body as SSE
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      res.write(`data: ${JSON.stringify({ error: 'ollama error', details: txt })}\n\n`);
      return res.end();
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let doneReading = false;
    let buffer = '';

    while (!doneReading) {
      const { value, done } = await reader.read();
      doneReading = done;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        // Ollama may send newline-delimited JSON or text; forward raw chunks as tokens.
        // We'll emit each chunk as a token event.
        res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
      }
    }

    // finalize
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    // save history
    saveMessage('user', message);
    // Note: assistant full text isn't reassembled here; client collects tokens.
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: 'server error' })}\n\n`);
    res.end();
  }
});

// Static serving client build for production
const clientBuild = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Commander AI server (Ollama) running on http://localhost:${PORT}`);
  console.log(`Ollama host: ${ollamaHost}, model: ${model}`);
});
