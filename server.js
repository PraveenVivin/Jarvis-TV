const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { AndroidRemote, RemoteKeyCode, RemoteDirection } = require('androidtv-remote');

const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'tv_credentials.json');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// TV State
let activeRemote = null;
let tvState = {
  connected: false,
  pairing: false,
  ip: '',
  powered: null,
  volume: { level: 0, maximum: 100, muted: false },
  currentApp: '',
  error: null
};

// Load saved config & credentials
function loadSavedConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Could not parse credentials file:', err.message);
  }
  return { lastIp: '', certs: {} };
}

function saveConfig(ip, cert) {
  try {
    const config = loadSavedConfig();
    config.lastIp = ip;
    if (cert && cert.key && cert.cert) {
      if (!config.certs) config.certs = {};
      config.certs[ip] = cert;
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`Saved credentials for ${ip}`);
  } catch (err) {
    console.error('Failed to save credentials:', err.message);
  }
}

// Broadcast TV state to all connected PWA WebSockets
function broadcastState() {
  const payload = JSON.stringify({ type: 'state', data: tvState });
  for (const client of wss.clients) {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  }
}

// Broadcast an event (like secret required)
function broadcastEvent(eventType, data = {}) {
  const payload = JSON.stringify({ type: eventType, data });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

// Initialize TV Connection
async function connectToTv(ip) {
  if (!ip) throw new Error('IP address is required');

  // If already connected to this IP, no need to reconnect
  if (activeRemote && tvState.connected && tvState.ip === ip) {
    return { status: 'already_connected', ip };
  }

  // Disconnect existing
  if (activeRemote) {
    try {
      activeRemote.stop();
    } catch (_) {}
    activeRemote = null;
  }

  tvState.ip = ip;
  tvState.connected = false;
  tvState.pairing = false;
  tvState.error = null;
  broadcastState();

  const savedConfig = loadSavedConfig();
  const savedCert = savedConfig.certs ? savedConfig.certs[ip] : null;

  const options = {
    pairing_port: 6467,
    remote_port: 6466,
    name: 'Jarvis TV Remote',
    cert: (savedCert && savedCert.key) ? savedCert : {}
  };

  console.log(`Connecting to Android TV at ${ip}... (Has cached cert: ${!!savedCert})`);

  const remote = new AndroidRemote(ip, options);
  activeRemote = remote;

  remote.on('secret', () => {
    console.log(`[PAIRING] TV requested pairing PIN code!`);
    tvState.pairing = true;
    tvState.connected = false;
    broadcastState();
    broadcastEvent('secret_required', { ip });
  });

  remote.on('powered', (powered) => {
    console.log(`TV Power state: ${powered}`);
    tvState.powered = powered;
    broadcastState();
  });

  remote.on('volume', (volume) => {
    console.log(`TV Volume: ${volume.level}/${volume.maximum} (Muted: ${volume.muted})`);
    tvState.volume = volume;
    broadcastState();
  });

  remote.on('current_app', (currentApp) => {
    console.log(`Current App on TV: ${currentApp}`);
    tvState.currentApp = currentApp;
    broadcastState();
  });

  remote.on('ready', () => {
    console.log(`✅ Connected successfully to Android TV at ${ip}!`);
    tvState.connected = true;
    tvState.pairing = false;
    tvState.error = null;

    try {
      const cert = remote.getCertificate();
      if (cert && cert.key) {
        saveConfig(ip, cert);
      }
    } catch (e) {
      console.warn('Could not extract cert:', e.message);
    }

    broadcastState();
    broadcastEvent('connected', { ip });
  });

  remote.on('error', (err) => {
    console.error(`Android TV Remote error:`, err);
    tvState.error = err.message || String(err);
    broadcastState();
  });

  try {
    await remote.start();
    return { status: 'started', ip };
  } catch (err) {
    console.error('Failed to start Android Remote:', err.message);
    tvState.connected = false;
    tvState.error = err.message;
    broadcastState();
    throw err;
  }
}

// Key code mapping
const KEY_MAP = {
  up: RemoteKeyCode.KEYCODE_DPAD_UP,
  down: RemoteKeyCode.KEYCODE_DPAD_DOWN,
  left: RemoteKeyCode.KEYCODE_DPAD_LEFT,
  right: RemoteKeyCode.KEYCODE_DPAD_RIGHT,
  ok: RemoteKeyCode.KEYCODE_DPAD_CENTER,
  enter: RemoteKeyCode.KEYCODE_DPAD_CENTER,
  select: RemoteKeyCode.KEYCODE_DPAD_CENTER,
  back: RemoteKeyCode.KEYCODE_BACK,
  home: RemoteKeyCode.KEYCODE_HOME,
  menu: RemoteKeyCode.KEYCODE_MENU,
  settings: RemoteKeyCode.KEYCODE_SETTINGS,
  volup: RemoteKeyCode.KEYCODE_VOLUME_UP,
  voldown: RemoteKeyCode.KEYCODE_VOLUME_DOWN,
  mute: RemoteKeyCode.KEYCODE_MUTE,
  power: RemoteKeyCode.KEYCODE_POWER,
  play: RemoteKeyCode.KEYCODE_MEDIA_PLAY_PAUSE,
  pause: RemoteKeyCode.KEYCODE_MEDIA_PLAY_PAUSE,
  playpause: RemoteKeyCode.KEYCODE_MEDIA_PLAY_PAUSE,
  next: RemoteKeyCode.KEYCODE_MEDIA_NEXT,
  nextshort: RemoteKeyCode.KEYCODE_DPAD_DOWN, // For YouTube Shorts, down advances next!
  prevshort: RemoteKeyCode.KEYCODE_DPAD_UP,   // For YouTube Shorts, up goes prev!
  prev: RemoteKeyCode.KEYCODE_MEDIA_PREVIOUS,
  rewind: RemoteKeyCode.KEYCODE_MEDIA_REWIND,
  fastforward: RemoteKeyCode.KEYCODE_MEDIA_FAST_FORWARD,
  input: RemoteKeyCode.KEYCODE_TV_INPUT,
  0: RemoteKeyCode.KEYCODE_0,
  1: RemoteKeyCode.KEYCODE_1,
  2: RemoteKeyCode.KEYCODE_2,
  3: RemoteKeyCode.KEYCODE_3,
  4: RemoteKeyCode.KEYCODE_4,
  5: RemoteKeyCode.KEYCODE_5,
  6: RemoteKeyCode.KEYCODE_6,
  7: RemoteKeyCode.KEYCODE_7,
  8: RemoteKeyCode.KEYCODE_8,
  9: RemoteKeyCode.KEYCODE_9
};

const APP_LINKS = {
  youtube: 'https://www.youtube.com',
  netflix: 'https://www.netflix.com/title',
  prime: 'https://app.primevideo.com',
  hotstar: 'https://www.hotstar.com',
  disney: 'https://www.disneyplus.com',
  spotify: 'spotify:'
};

// API Endpoints
app.get('/api/status', (req, res) => {
  const saved = loadSavedConfig();
  res.json({
    ...tvState,
    savedIp: saved.lastIp || ''
  });
});

app.post('/api/connect', async (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP is required' });
  }
  try {
    const result = await connectToTv(ip.trim());
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Connection failed' });
  }
});

app.post('/api/pair', (req, res) => {
  const { code } = req.body;
  if (!activeRemote || !tvState.pairing) {
    return res.status(400).json({ error: 'Not currently waiting for pairing code' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }
  try {
    console.log(`Sending pairing PIN code: ${code}`);
    activeRemote.sendCode(code.trim());
    res.json({ success: true, message: 'Code submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to send pairing code' });
  }
});

app.post('/api/command', (req, res) => {
  const { command } = req.body;
  if (!activeRemote || !tvState.connected) {
    return res.status(400).json({ error: 'TV not connected' });
  }

  const cmd = (command || '').toLowerCase().trim();
  const keyCode = KEY_MAP[cmd];

  if (!keyCode) {
    return res.status(400).json({ error: `Unknown command: ${command}` });
  }

  try {
    activeRemote.sendKey(keyCode, RemoteDirection.SHORT);
    res.json({ success: true, command: cmd, keyCode });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to send key' });
  }
});

app.post('/api/app', (req, res) => {
  const { app: appName } = req.body;
  if (!activeRemote || !tvState.connected) {
    return res.status(400).json({ error: 'TV not connected' });
  }

  const key = (appName || '').toLowerCase().trim();
  const link = APP_LINKS[key] || key;

  try {
    activeRemote.sendAppLink(link);
    res.json({ success: true, app: key, link });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to open app' });
  }
});

app.post('/api/disconnect', (req, res) => {
  if (activeRemote) {
    try {
      activeRemote.stop();
    } catch (_) {}
    activeRemote = null;
  }
  tvState.connected = false;
  tvState.pairing = false;
  broadcastState();
  res.json({ success: true });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  const saved = loadSavedConfig();
  ws.send(JSON.stringify({
    type: 'state',
    data: { ...tvState, savedIp: saved.lastIp || '' }
  }));

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.action === 'command' && data.command) {
        const keyCode = KEY_MAP[data.command.toLowerCase()];
        if (keyCode && activeRemote && tvState.connected) {
          activeRemote.sendKey(keyCode, RemoteDirection.SHORT);
        }
      }
    } catch (_) {}
  });
});

// Helper to get local network IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`\n======================================================`);
  console.log(`🎬 Jarvis TV Remote - PWA Server is Running!`);
  console.log(`💻 Local:   http://localhost:${PORT}`);
  console.log(`📱 Mobile:  http://${localIp}:${PORT}`);
  console.log(`======================================================\n`);

  // Auto-connect to last IP if saved
  const saved = loadSavedConfig();
  if (saved.lastIp && saved.certs && saved.certs[saved.lastIp]) {
    console.log(`Found previously paired TV at ${saved.lastIp}. Auto-connecting...`);
    connectToTv(saved.lastIp).catch((err) => {
      console.log(`Auto-connect notice: TV at ${saved.lastIp} might be off or on a different network.`);
    });
  }
});
