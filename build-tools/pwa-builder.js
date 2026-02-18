// PWA-centric build system - NO multi-page generation
const fs = require('fs').promises;
const path = require('path');

class PWABuilder {
  constructor(config = {}) {
    this.config = {
      name: 'MX2LM App',
      shortName: 'MX2LM',
      themeColor: '#000000',
      backgroundColor: '#ffffff',
      ...config,
    };
  }

  async generateManifest() {
    const manifest = {
      name: this.config.name,
      short_name: this.config.shortName,
      description: 'MX2LM PWA Application',
      theme_color: this.config.themeColor,
      background_color: this.config.backgroundColor,
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    };

    await fs.writeFile(
      path.join('app', 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    console.log('✅ manifest.json generated');
  }

  async generateServiceWorker() {
    const swContent = `
// MX2LM Service Worker
const CACHE_NAME = 'mx2lm-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Phase token handling
self.addEventListener('message', event => {
  if (event.data.type === 'PHASE_TOKEN_UPDATE') {
    // Handle phase token updates
    console.log('Phase token update:', event.data.payload);
  }
});
`;

    await fs.writeFile(path.join('app', 'sw.js'), swContent.trimStart());
    console.log('✅ sw.js generated');
  }

  async generateIndexHTML() {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.config.name}</title>

  <!-- PWA Essentials -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="${this.config.themeColor}">

  <!-- CSS -->
  <link rel="stylesheet" href="/styles/main.css">

  <!-- Icons -->
  <link rel="icon" href="/icon-192.png">
  <link rel="apple-touch-icon" href="/icon-192.png">
</head>
<body>
  <!-- Single Page Application Container -->
  <div id="app">
    <header class="app-header">
      <h1>${this.config.name}</h1>
      <div class="phase-indicators">
        <span class="phase-tag" data-phase="Pop">[Pop]</span>
        <span class="phase-tag" data-phase="Wo">[Wo]</span>
        <span class="phase-tag" data-phase="Ch'en">[Ch'en]</span>
        <span class="phase-tag" data-phase="Yax">[Yax]</span>
        <span class="phase-tag" data-phase="Sek">[Sek]</span>
        <span class="phase-tag" data-phase="Xul">[Xul]</span>
      </div>
    </header>

    <main class="app-main">
      <!-- Tokenizer Input -->
      <section class="tokenizer-section">
        <h2>Tokenizer Interface</h2>
        <textarea
          id="tokenizer-input"
          placeholder="Enter text with phase tokens like [Pop frontend_expert] → GET /api..."
          rows="6"
        ></textarea>

        <div class="controls">
          <button id="tokenize-btn">Tokenize</button>
          <button id="clear-btn">Clear</button>
        </div>

        <div class="token-output">
          <h3>Tokens:</h3>
          <div id="tokens-display"></div>
        </div>
      </section>

      <!-- Pipeline Visualizer -->
      <section class="pipeline-section">
        <h2>Pipeline Flow</h2>
        <div class="pipeline-flow">
          <div class="pipeline-step" data-step="input">Input</div>
          <div class="pipeline-arrow">→</div>
          <div class="pipeline-step" data-step="processing">Processing</div>
          <div class="pipeline-arrow">→</div>
          <div class="pipeline-step" data-step="output">Output</div>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>MX2LM × legacy2-1.5B Tokenizer PWA</p>
    </footer>
  </div>

  <!-- Service Worker Registration -->
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.error('SW registration failed:', err));
    }

    // Phase Token Handler
    const phaseTokens = {
      Pop: ['shard_processor', 'hive_collaboration', 'frontend_expert'],
      Wo: ['api_request', 'project_spec', 'design_spec'],
      "Ch'en": ['request', 'spec', 'brief'],
      Yax: ['request', 'shard_response', 'hive'],
      Sek: ['route_to_shard', 'process_data', 'send_response'],
    };

    console.log('Phase token catalog loaded', phaseTokens);
  </script>

  <!-- Main App Script -->
  <script src="/app.js"></script>
</body>
</html>
`;

    await fs.writeFile(path.join('app', 'index.html'), htmlContent.trimStart());
    console.log('✅ index.html generated');
  }

  async generateCSS() {
    const cssContent = `
/* MX2LM PWA Styles */
:root {
  --primary-color: #000000;
  --secondary-color: #666666;
  --accent-color: #0066cc;
  --phase-pop: #ff6b6b;
  --phase-wo: #4ecdc4;
  --phase-chen: #45b7d1;
  --phase-yax: #96ceb4;
  --phase-sek: #feca57;
  --phase-xul: #ff9ff3;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--primary-color);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.app-header {
  background: var(--primary-color);
  color: white;
  padding: 1rem;
  text-align: center;
}

.phase-indicators {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.phase-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.phase-tag:hover {
  transform: translateY(-2px);
}

.phase-tag[data-phase="Pop"] { background: var(--phase-pop); }
.phase-tag[data-phase="Wo"] { background: var(--phase-wo); }
.phase-tag[data-phase="Ch'en"] { background: var(--phase-chen); }
.phase-tag[data-phase="Yax"] { background: var(--phase-yax); }
.phase-tag[data-phase="Sek"] { background: var(--phase-sek); }
.phase-tag[data-phase="Xul"] { background: var(--phase-xul); }

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.tokenizer-section, .pipeline-section {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

textarea {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 0.5rem;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 1rem;
  resize: vertical;
}

.controls {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  background: var(--accent-color);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #0052a3;
}

.token-output {
  margin-top: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  font-family: 'Monaco', 'Courier New', monospace;
  min-height: 4rem;
}

.token-output .token {
  display: inline-block;
  margin: 0.2rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  background: #eef2ff;
  color: #1e1e2f;
  font-size: 0.9rem;
}

.token-output .phase-token {
  background: var(--phase-pop);
  color: #1b0b0b;
}

.token-output .pipeline-token {
  background: #dff7ff;
  color: #003b55;
}

.token-output .pipeline-operator {
  background: #ffeaa7;
  color: #5f3b00;
}

.token-output .structural-anchor {
  background: #e8d7ff;
  color: #3c1a7a;
}

.token-output .http-method {
  background: #d6f9d2;
  color: #1e4d12;
}

.pipeline-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.pipeline-step {
  padding: 1rem 2rem;
  background: var(--accent-color);
  color: white;
  border-radius: 0.5rem;
  font-weight: 600;
}

.pipeline-arrow {
  font-size: 2rem;
  color: var(--accent-color);
}

.app-footer {
  text-align: center;
  padding: 2rem;
  color: var(--secondary-color);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .app-main {
    padding: 1rem;
  }

  .tokenizer-section, .pipeline-section {
    padding: 1rem;
  }

  .pipeline-flow {
    flex-direction: column;
    gap: 1rem;
  }

  .pipeline-arrow {
    transform: rotate(90deg);
  }
}
`;

    await fs.writeFile(path.join('app', 'styles', 'main.css'), cssContent.trimStart());
    console.log('✅ CSS generated');
  }

  async buildAll() {
    console.log('🚀 Building MX2LM PWA...');

    // Create directories if they don't exist
    await fs.mkdir('app/styles', { recursive: true });
    await fs.mkdir('build-tools', { recursive: true });

    // Generate PWA essentials
    await this.generateManifest();
    await this.generateServiceWorker();
    await this.generateIndexHTML();

    // Generate basic CSS
    await this.generateCSS();

    console.log('✨ PWA build complete!');
  }
}

if (require.main === module) {
  const builder = new PWABuilder();
  builder.buildAll().catch(error => {
    console.error('Build failed:', error);
    process.exitCode = 1;
  });
}

module.exports = PWABuilder;
