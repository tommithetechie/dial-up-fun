// Web Audio API V.90 modem emulation & Win95 integration

// DOM Elements
const logonModal = document.getElementById('logon-modal');
const loadingContainer = document.getElementById('loading-container');
const btnConnect = document.getElementById('btn-connect');
const btnAbort = document.getElementById('btn-abort');
const statusText = document.getElementById('status-text');

// State
let audioCtx = null;
let activeSetouts = [];
let isConnecting = false;

// Fixed params
const speedRatio = 0.6;
const dtmfDur = 0.08 * speedRatio;
const dtmfSpace = 0.06 * speedRatio;
const answerFreq = 2100;
const staticVol = 0.6;

// DTMF mapping
const dtmfFrequencies = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '0': [941, 1336]
};

// Update status text
function updateStatus(text) {
    statusText.innerHTML = text;
}

// Sequence callback execution
function schedule(fn, delayMs) {
    if (delayMs < 0) delayMs = 0;
    const id = setTimeout(fn, delayMs);
    activeSetouts.push(id);
    return id;
}

function clearSequence() {
    activeSetouts.forEach(clearTimeout);
    activeSetouts = [];
}

// Create and schedule oscillator
function createOscillator(freq, type, startTime, duration, gainValue = 0.1) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Anti-click envelope
    const rampTime = 0.01;
    const tStart = startTime;
    const tEnd = startTime + duration;

    gainNode.gain.setValueAtTime(0, tStart);
    gainNode.gain.linearRampToValueAtTime(gainValue, tStart + rampTime);
    gainNode.gain.setValueAtTime(gainValue, Math.max(tStart + rampTime, tEnd - rampTime));
    gainNode.gain.linearRampToValueAtTime(0, tEnd);

    // Connect chain
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(tStart);
    osc.stop(tEnd + 0.05);

    return { osc, gainNode };
}

// Generate band-passed white noise
function generateWhiteNoise(startTime, duration, peakGain) {
    if (!audioCtx) return;

    const bufferSize = audioCtx.sampleRate * duration;
    // Single channel of random floats
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // Add slightly resonant filter acting on the noise to mimic data static
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800; // mid-high frequency static 
    filter.Q.value = 0.5;

    const gainNode = audioCtx.createGain();
    // Gain envelope
    gainNode.gain.setValueCurveAtTime([0, peakGain, peakGain, 0], startTime, duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseSource.start(startTime);
    return noiseSource;
}

// Main V.90 visual & audio routine
function startConnection() {
    if (isConnecting) return;
    isConnecting = true;

    // Show loader UI
    logonModal.classList.add('hidden');
    loadingContainer.classList.remove('hidden');

    btnAbort.disabled = false;

    // AudioContext init
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // Resume context
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // Timeline scheduling
    let t = audioCtx.currentTime + 0.1;

    // P1: Dial Tone
    schedule(() => updateStatus("INITIALIZING LINE..."), 0);

    // US dial tone
    createOscillator(350, 'sine', t, 2.0, 0.1);
    createOscillator(440, 'sine', t, 2.0, 0.1);
    t += 2.2;

    // P2: DTMF tones
    schedule(() => updateStatus("DIALING ISP..."), (t - audioCtx.currentTime) * 1000);
    const phoneNumber = "5550199";

    for (let i = 0; i < phoneNumber.length; i++) {
        const digit = phoneNumber[i];
        const freqs = dtmfFrequencies[digit];
        createOscillator(freqs[0], 'sine', t, dtmfDur, 0.15);
        createOscillator(freqs[1], 'sine', t, dtmfDur, 0.15);
        t += dtmfDur + dtmfSpace;
    }

    t += 0.4;

    // Ringback
    schedule(() => updateStatus("WAITING FOR ANSWER..."), (t - audioCtx.currentTime) * 1000);
    for (let i = 0; i < 2; i++) {
        // US ringback
        createOscillator(440, 'sine', t, 2.0, 0.1);
        createOscillator(480, 'sine', t, 2.0, 0.1);
        t += 3.5;
    }

    // P3: Answer Squeal
    schedule(() => updateStatus("NEGOTIATING PARAMETERS..."), (t - audioCtx.currentTime) * 1000);

    createOscillator(answerFreq, 'sine', t, 2.8, 0.15);
    createOscillator(answerFreq + 50, 'sine', t + 1.0, 1.8, 0.05); // Phasing
    t += 3.0;

    // P4: Handshakes & Noise
    schedule(() => updateStatus("ESTABLISHING CARRIER..."), (t - audioCtx.currentTime) * 1000);

    // White noise
    generateWhiteNoise(t, 8.0, staticVol * 0.4);

    // Oscillate bauds
    for (let i = 0; i < 25; i++) {
        const f = 1500 + (Math.random() * 1000);
        const dur = 0.05 + (Math.random() * 0.15);
        createOscillator(f, 'square', t + (i * 0.3), dur, staticVol * 0.06);
    }

    for (let i = 0; i < 10; i++) {
        const f2 = 800 + (Math.random() * 500);
        createOscillator(f2, 'triangle', t + 2 + (i * 0.5), 0.2, staticVol * 0.08);
    }
    t += 8.5;

    // Sequence end
    schedule(() => {
        updateStatus("CONNECTED @ 56,000 BPS");
        endConnection(true);
        setTimeout(() => {
            loadingContainer.classList.add('hidden');
            document.getElementById('workspace-container').classList.remove('hidden');
        }, 2000);
    }, (t - audioCtx.currentTime) * 1000);
}

function endConnection(successfullyCompleted = false) {
    isConnecting = false;
    btnAbort.disabled = true;

    if (!successfullyCompleted) {
        updateStatus("CONNECTION ABORTED.");
        // Reshow modal on abort
        setTimeout(() => {
            logonModal.classList.remove('hidden');
            loadingContainer.classList.add('hidden');
        }, 1500);
    }

    if (audioCtx && audioCtx.state !== 'closed') {
        try {
            audioCtx.close().catch(console.error);
        } catch (e) {
            console.error(e);
        }
    }
    audioCtx = null;
    clearSequence();
}

btnConnect.addEventListener('click', startConnection);
btnAbort.addEventListener('click', () => endConnection(false));

