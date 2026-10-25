# 🎬 Jarvis TV Remote (PWA)

A Progressive Web App (PWA) remote control for **Android TV** and **Google TV** (Chromecast with Google TV, Xiaomi, OnePlus, TCL, Sony, Realme, etc.).

No **Android Studio** or heavy SDKs required! Works directly on any phone, tablet, or desktop browser and installs as a standalone native-feeling app.

---

## ⚡ Quick Start

### 1. Launch the Server
Double-click `start.bat` in this folder, or open a terminal and run:

```bash
cd "C:\Remote agent\jarvis-tv"
node server.js
```

The server starts on port `3000`. It will display your local IP address:
- **On this PC**: `http://localhost:3000`
- **On your Phone**: `http://192.168.x.x:3000` (Make sure your phone is connected to the same Wi-Fi)

---

## 📱 How to Install on Your Phone (PWA)

1. Connect your smartphone to the **same Wi-Fi network** as your PC and TV.
2. Open your mobile browser (Chrome on Android or Safari on iOS).
3. Go to `http://<YOUR-PC-IP>:3000` (e.g. `http://192.168.1.10:3000`).
4. Tap the **"Install"** banner or in your browser menu tap:
   - **Android Chrome**: Menu (⋮) → **"Install app"** or **"Add to Home Screen"**.
   - **iPhone Safari**: Share icon (⬆) → **"Add to Home Screen"**.
5. Jarvis TV Remote will now appear as an app icon on your home screen with full-screen experience and haptic vibration feedback!

---

## 🔗 How to Connect to Your TV

1. On your Android TV / Google TV, go to:
   - **Settings** → **Network & Internet** → Select your connected Wi-Fi.
   - Note down the **IP address** (e.g. `192.168.1.25`).
2. Open Jarvis TV on your browser or phone.
3. Type the TV's IP address into the top connection bar and tap **Connect**.
4. **First-time Pairing**:
   - A 4 or 6-character PIN code will appear on your TV screen.
   - The Jarvis TV web app will pop up a pairing dialog.
   - Type the code and tap **Pair TV**.
5. **Done!** The TV credentials are saved locally in `tv_credentials.json`, so it will automatically reconnect next time.

---

## 🎮 Features & Controls

| Feature | Description |
|---|---|
| **D-Pad** | Directional Up/Down/Left/Right and center **OK** button with radial tactile design |
| **Jarvis Voice Assistant** | Tap the microphone button to give speech commands like *"Open YouTube"*, *"Volume up"*, *"Pause"*, *"Next short"*, etc. |
| **YouTube Shorts Controller** | Dedicated **Next**, **Previous**, and **Pause** buttons configured for YouTube Shorts scrolling |
| **Volume & Playback** | Volume Up/Down, Mute toggle, 10s Rewind/Forward, Play/Pause |
| **Quick App Launchers** | Instant 1-tap launch for YouTube, Netflix, Prime Video, and Disney+ / Hotstar |
| **Numeric Keypad (123)** | Collapsible 0–9 keypad for entering numbers or channels |
| **Haptic Feedback** | Subtle vibration on button presses for physical remote feel on mobile |
| **Offline Capable** | Service Worker caching ensures instant load times |

---

## 🛠️ Architecture

- **Frontend**: Responsive HTML5, CSS3 Glassmorphism, Web App Manifest (`manifest.json`), and Service Worker (`sw.js`).
- **Backend Bridge**: Ultra-lightweight Node.js HTTP + WebSocket server running the official Google TV Remote Protocol v2 (`androidtv-remote`).
- **No Android Studio / Gradle required**: Eliminated several gigabytes of unnecessary native compilation tools.
