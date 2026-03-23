# dial-up-fun

A lil retro **AOL / Windows 95–style dial-up sign-on screen** you can run right in the browser. Click **Connect** to play a timed “dial → DTMF tones → ringback → handshake/static → connected” sequence, then it reveals an AOL-inspired “workspace” UI.

Live site: https://tommithetechie.github.io/dial-up-fun/

---

## What this project does

- Renders a **Win95-style “Log On” modal** with a **Connect** button.
- Shows a **retro loading sequence** with:
  - Status text updates (e.g., *INITIALIZING LINE…*, *DIALING ISP…*, *WAITING FOR ANSWER…*, etc.)
  - A three-panel “activity” animation (CSS keyframes cycling frames)
  - A **Stop or Abort** button
- Generates classic dial-up-esque audio in real time using the **Web Audio API**:
  - US dial tone (350 Hz + 440 Hz)
  - DTMF digits (hard-coded number)
  - Ringback (440 Hz + 480 Hz)
  - “Answer” tone + phasing
  - Filtered noise + random oscillators to mimic handshake/static
- After the sequence completes, it reveals an **AOL workspace mock** (toolbar, channel list, content feed, buddy list window).

---

## Tech used

- **HTML**: single-page structure (`index.html`)
- **CSS**: all styling + layout + animations (`styles.css`)
  - Win95-ish borders, title bars, buttons
  - Responsive layout adjustments for smaller screens
- **Vanilla JavaScript** (`script.js`)
  - DOM state toggling via a `.hidden` utility class
  - Timed sequencing via `setTimeout`
  - Audio synthesis with **Web Audio API** (`AudioContext`, oscillators, gain nodes, buffer source noise, biquad filter)

No build step, no frameworks—just static files that work great with GitHub Pages.

---

## Open it on GitHub Pages

### Option A: Use the hosted link (recommended)
Open: https://tommithetechie.github.io/dial-up-fun/

### Option B: Run locally
1. Clone the repo:
   ```bash
   git clone https://github.com/tommithetechie/dial-up-fun.git
   cd dial-up-fun
   ```
2. Open `index.html` in your browser **or** run a quick local server (best for consistency):
   ```bash
   # any of these work
   python -m http.server 8000
   # or
   npx serve .
   ```
3. Visit:
   - http://localhost:8000 (if using Python)
   - The URL printed by `serve` (if using npx)

---

## Notable design choices / implementation notes

- **Audio starts only on user interaction**: the sequence is triggered by clicking **Connect**, which allows the `AudioContext` to start in a user gesture (important for modern autoplay restrictions).
- **Timeline-based audio scheduling**: tones and noise are scheduled against `audioCtx.currentTime` to keep the dial-up sequence consistent.
- **Click-reduction envelope**: the oscillator helper ramps gain in/out briefly to reduce audible clicks when tones start/stop.
- **Abort handling**:
  - Cancels scheduled UI timeouts
  - Closes the `AudioContext`
  - Resets the UI back to the logon modal when aborted mid-sequence
- **Pixel/retro look without images**:
  - The “emblem” and the animated panels are built with **inline SVG**
  - “Win95” depth effect is done with light/dark border pairs and inset shadows
- **Typography**:
  - Uses Google Fonts import for `Press Start 2P` to push the retro vibe, with classic fallbacks like `MS Sans Serif`.

---

## Project structure

- `index.html` — UI markup (logon modal, loader, AOL workspace)
- `styles.css` — all visual styling + animations + responsive rules
- `script.js` — interaction + audio synthesis + sequencing logic

---

## Disclaimer

This is a nostalgia/retro UI + sound effect project. It is not affiliated with AOL, Microsoft, or any ISP.
