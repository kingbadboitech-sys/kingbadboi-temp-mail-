const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MAIL_TM_API = 'https://api.mail.tm';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get available domains
app.get('/api/domains', async (req, res) => {
  try {
    const response = await fetch(`${MAIL_TM_API}/domains`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// Create a new account
app.post('/api/accounts', async (req, res) => {
  try {
    const { address, password } = req.body;
    const response = await fetch(`${MAIL_TM_API}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get token (login)
app.post('/api/token', async (req, res) => {
  try {
    const { address, password } = req.body;
    const response = await fetch(`${MAIL_TM_API}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get token' });
  }
});

// Get messages
app.get('/api/messages', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    const page = req.query.page || 1;
    const response = await fetch(`${MAIL_TM_API}/messages?page=${page}`, {
      headers: { 'Authorization': token }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get single message
app.get('/api/messages/:id', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    const response = await fetch(`${MAIL_TM_API}/messages/${req.params.id}`, {
      headers: { 'Authorization': token }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Delete message
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    const response = await fetch(`${MAIL_TM_API}/messages/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });
    res.status(response.status).json({ success: response.ok });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Delete account
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    const response = await fetch(`${MAIL_TM_API}/accounts/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });
    res.status(response.status).json({ success: response.ok });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KingBadBoi TempMail running on port ${PORT}`);
