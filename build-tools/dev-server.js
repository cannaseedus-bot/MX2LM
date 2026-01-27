// Simple dev server for PWA testing
const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

const extractPhase = text => {
  const match = text.match(/\[(Pop|Wo|Ch'en|Yax|Sek|Xul)\b/);
  return match ? match[1] : null;
};

// Serve static files
app.use(express.static('app'));

// Tokenizer API endpoint
app.post('/api/tokenize', express.json(), async (req, res) => {
  try {
    const { text } = req.body;

    // Simulate tokenization (replace with actual Qwen tokenizer)
    const tokens = text.split(/\s+/).filter(Boolean).map(token => ({
      token,
      length: token.length,
      isSpecial: token.startsWith('[') && token.endsWith(']'),
    }));

    res.json({
      success: true,
      tokens,
      phase: extractPhase(text),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PWA manifest endpoint
app.get('/manifest.json', async (req, res) => {
  try {
    const manifest = await fs.readFile(
      path.join('app', 'manifest.json'),
      'utf-8'
    );
    res.setHeader('Content-Type', 'application/json');
    res.send(manifest);
  } catch (error) {
    res.status(404).send('Manifest not found');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MX2LM PWA dev server running at http://localhost:${PORT}`);
  console.log(`📱 Service Worker: http://localhost:${PORT}/sw.js`);
  console.log(`📄 Manifest: http://localhost:${PORT}/manifest.json`);
});
