/**
 * 420 MIXTAPE (VOL. 1) - AUTONOMOUS WEB PLAYER
 * Built for Twitch Panels & Standalone Embed
 * KIRTSOY Ecosystem
 */

let tracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffled = false;
let isRepeating = false;
let isMuted = false;
let previousVolume = 0.85;

// DOM Elements
const audio = document.getElementById('audio-engine');
const vinylDisk = document.getElementById('vinyl-disk');
const coverImg = document.getElementById('cover-img');
const trackIndexEl = document.getElementById('track-index');
const trackTitleEl = document.getElementById('track-title');
const timeCurrentEl = document.getElementById('time-current');
const timeTotalEl = document.getElementById('time-total');
const progressWrapper = document.getElementById('progress-wrapper');
const progressFill = document.getElementById('progress-bar-fill');
const progressThumb = document.getElementById('progress-thumb');
const playPauseBtn = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('icon-play');
const pauseIcon = document.getElementById('icon-pause');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const shuffleBtn = document.getElementById('btn-shuffle');
const repeatBtn = document.getElementById('btn-repeat');
const muteBtn = document.getElementById('btn-mute');
const volOnIcon = document.getElementById('icon-vol-on');
const volOffIcon = document.getElementById('icon-vol-off');
const volumeSlider = document.getElementById('volume-slider');
const tracksContainer = document.getElementById('tracks-container');
const tabPlayerBtn = document.getElementById('tab-player-btn');
const tabTracksBtn = document.getElementById('tab-tracks-btn');
const viewPlayer = document.getElementById('view-player');
const viewTracks = document.getElementById('view-tracks');
const visualizerCanvas = document.getElementById('visualizer-canvas');
const canvasCtx = visualizerCanvas.getContext('2d');

// Web Audio API Frequency Analyser
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let freqData = null;
let isAudioContextSetup = false;

function setupAudioAnalyser() {
    if (isAudioContextSetup) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        audioCtx = new AudioCtx();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Produces 32 frequency bins
        analyser.smoothingTimeConstant = 0.78; // Smooth, punchy response

        audio.crossOrigin = "anonymous";
        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        freqData = new Uint8Array(analyser.frequencyBinCount);
        isAudioContextSetup = true;
    } catch (e) {
        console.warn('Web Audio API analyser note:', e);
    }
}

// Format seconds into MM:SS
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Initialize Application
async function init() {
    try {
        const response = await fetch('tracks.json');
        tracks = await response.json();
    } catch (e) {
        console.error('Failed to load tracks.json, using fallback:', e);
    }

    renderTracklist();

    // Restore volume
    const savedVol = localStorage.getItem('kirtsoy_player_vol');
    if (savedVol !== null) {
        audio.volume = parseFloat(savedVol);
        volumeSlider.value = savedVol;
    } else {
        audio.volume = 0.85;
    }

    // Restore last track
    const savedTrack = localStorage.getItem('kirtsoy_player_track');
    if (savedTrack !== null && tracks[parseInt(savedTrack)]) {
        currentTrackIndex = parseInt(savedTrack);
    }

    loadTrack(currentTrackIndex, false);
    setupEvents();
}

// Render Tracklist in View 2
function renderTracklist() {
    tracksContainer.innerHTML = '';
    tracks.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = `track-item ${index === currentTrackIndex ? 'active' : ''}`;
        item.dataset.index = index;

        item.innerHTML = `
            <span class="item-num">${track.id}</span>
            <div class="item-info">
                <div class="item-title">${track.title}</div>
            </div>
            ${index === currentTrackIndex && isPlaying ? `
                <div class="equalizer-icon">
                    <span class="eq-bar"></span>
                    <span class="eq-bar"></span>
                    <span class="eq-bar"></span>
                </div>
            ` : ''}
            <span class="item-dur">${track.durationStr}</span>
        `;

        item.addEventListener('click', () => {
            currentTrackIndex = index;
            loadTrack(currentTrackIndex, true);
            switchTab('player');
        });

        tracksContainer.appendChild(item);
    });
}

// Notification Toast Helper
let toastTimer = null;
function showToast(msg, duration = 6000) {
    const toast = document.getElementById('player-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    if (duration > 0) {
        toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, duration);
    }
}

function hideToast() {
    const toast = document.getElementById('player-toast');
    if (toast) toast.classList.add('hidden');
    if (toastTimer) clearTimeout(toastTimer);
}

// Base path resolution:
// In Twitch Extension iframe or panel.html, stream from GitHub Pages CDN.
// Otherwise (localhost with local audio), use relative 'audio/'.
function getAudioBaseUrl() {
    if (window.AUDIO_BASE_URL) return window.AUDIO_BASE_URL;

    const urlParams = new URLSearchParams(window.location.search);
    const cdnParam = urlParams.get('cdn');
    if (cdnParam) return cdnParam.endsWith('/') ? cdnParam : cdnParam + '/';

    const isTwitchExt = window.location.hostname.includes('twitch.tv') ||
                        window.location.hostname.includes('ext-twitch.tv') ||
                        window.location.pathname.endsWith('panel.html');

    if (isTwitchExt) {
        return 'https://kirtsoy.github.io/twitch_music_panel/audio/';
    }
    return 'audio/';
}

// Load track by index
function loadTrack(index, autoplay = false) {
    if (!tracks || tracks.length === 0) return;
    const track = tracks[index];
    if (!track) return;

    const audioBase = getAudioBaseUrl();
    audio.src = `${audioBase}${encodeURIComponent(track.file)}`;
    trackTitleEl.textContent = track.title;
    trackIndexEl.textContent = `TRACK ${track.id} / ${tracks.length}`;
    timeCurrentEl.textContent = '0:00';
    timeTotalEl.textContent = track.durationStr;
    progressFill.style.width = '0%';
    progressThumb.style.left = '0%';

    localStorage.setItem('kirtsoy_player_track', index.toString());
    renderTracklist();

    if (autoplay) {
        play();
    }
}

// Play playback
function play() {
    setupAudioAnalyser();
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    audio.play().then(() => {
        isPlaying = true;
        updatePlayStateUI();
        startVisualizer();
        hideToast();
    }).catch(err => {
        console.warn('Playback error or user gesture required:', err);
        showToast('Кликните ▶ для запуска аудио (требуется взаимодействие)');
    });
}

// Pause playback
function pause() {
    audio.pause();
    isPlaying = false;
    updatePlayStateUI();
    stopVisualizer();
}

// Toggle Play/Pause
function togglePlayPause() {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
}

// Update UI according to playback state
function updatePlayStateUI() {
    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        vinylDisk.classList.add('spinning');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        vinylDisk.classList.remove('spinning');
    }
    renderTracklist();
}

// Next track
function nextTrack() {
    if (tracks.length === 0) return;
    if (isShuffled) {
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * tracks.length);
        } while (tracks.length > 1 && nextIndex === currentTrackIndex);
        currentTrackIndex = nextIndex;
    } else {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    }
    loadTrack(currentTrackIndex, true);
}

// Previous track
function prevTrack() {
    if (tracks.length === 0) return;
    if (audio.currentTime > 3) {
        // Restart current track if played > 3 seconds
        audio.currentTime = 0;
        return;
    }
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrackIndex, true);
}

// Smooth Visualizer Loop (100% reliable across all origins & Twitch iframes)
let animFrameId = null;

function startVisualizer() {
    if (animFrameId) return;
    renderVisualizerLoop();
}

function stopVisualizer() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    if (canvasCtx && visualizerCanvas) {
        canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
}

function renderVisualizerLoop() {
    if (!isPlaying) {
        stopVisualizer();
        return;
    }
    animFrameId = requestAnimationFrame(renderVisualizerLoop);
    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    canvasCtx.clearRect(0, 0, width, height);

    let hasRealData = false;
    if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        for (let j = 0; j < freqData.length; j++) {
            if (freqData[j] > 0) {
                hasRealData = true;
                break;
            }
        }
    }

    const barCount = 24;
    const barWidth = Math.floor(width / barCount) - 2;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
        let normalizedVal = 0;

        if (hasRealData && freqData) {
            // Map 24 bars to frequency bins (0..31), giving strong weight to bass and vocal mids
            const binIdx = Math.min(Math.floor((i / barCount) * (freqData.length - 2)), freqData.length - 1);
            // Non-linear perceptual scaling (boost quieter nuances, compress peaks)
            const raw = freqData[binIdx] / 255;
            normalizedVal = Math.pow(raw, 0.85);
        } else {
            // Fallback organic breathing rhythm if AudioContext is waiting or cross-origin restricted
            const t = Date.now() * 0.005 + i * 0.35;
            normalizedVal = (Math.sin(t) * 0.28 + Math.cos(t * 1.6) * 0.2 + 0.38);
        }

        const barHeight = Math.max(3, Math.floor(normalizedVal * height * 0.95));

        // High-energy neon green to lime gradient
        const gradient = canvasCtx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#1db954');
        gradient.addColorStop(0.65, '#4dff00');
        gradient.addColorStop(1, '#a6ff00');

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);

        // Crisp white studio peak cap
        if (barHeight > 5) {
            canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            canvasCtx.fillRect(x, height - barHeight, barWidth, 1.5);
        }

        x += barWidth + 2;
    }
}

// Switch between Player and Tracklist tabs
function switchTab(tab) {
    if (tab === 'player') {
        tabPlayerBtn.classList.add('active');
        tabTracksBtn.classList.remove('active');
        viewPlayer.classList.add('active');
        viewTracks.classList.remove('active');
    } else {
        tabTracksBtn.classList.add('active');
        tabPlayerBtn.classList.remove('active');
        viewTracks.classList.add('active');
        viewPlayer.classList.remove('active');
    }
}

// Event Listeners
function setupEvents() {
    // Play/Pause Button
    playPauseBtn.addEventListener('click', togglePlayPause);

    // Prev / Next
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);

    // Shuffle
    shuffleBtn.addEventListener('click', () => {
        isShuffled = !isShuffled;
        shuffleBtn.classList.toggle('active', isShuffled);
    });

    // Repeat
    repeatBtn.addEventListener('click', () => {
        isRepeating = !isRepeating;
        repeatBtn.classList.toggle('active', isRepeating);
    });

    // Audio time update
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const current = audio.currentTime;
        const total = audio.duration;
        const percent = (current / total) * 100;

        timeCurrentEl.textContent = formatTime(current);
        progressFill.style.width = `${percent}%`;
        progressThumb.style.left = `${percent}%`;
    });

    // Audio loaded metadata
    audio.addEventListener('loadedmetadata', () => {
        timeTotalEl.textContent = formatTime(audio.duration);
    });

    // Track ended
    audio.addEventListener('ended', () => {
        if (isRepeating) {
            audio.currentTime = 0;
            play();
        } else {
            nextTrack();
        }
    });

    // Audio error detection (e.g. CSP blocked, network issue)
    audio.addEventListener('error', () => {
        console.error('Audio load error on:', audio.src, audio.error);
        let msg = 'Ошибка загрузки аудио';
        if (audio.error) {
            if (audio.error.code === 4) {
                msg = '⚠️ Добавьте https://kirtsoy.github.io в Twitch Console (Вкладка Возможности)';
            } else if (audio.error.code === 2) {
                msg = '⚠️ Ошибка соединения с аудио-сервером';
            }
        }
        showToast(msg, 9000);
    });

    // Progress bar seeking (click & drag)
    function seek(e) {
        const rect = progressWrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        let percent = Math.max(0, Math.min(1, clickX / width));
        if (audio.duration) {
            audio.currentTime = percent * audio.duration;
        }
    }

    progressWrapper.addEventListener('click', seek);

    let isDragging = false;
    progressWrapper.addEventListener('mousedown', (e) => {
        isDragging = true;
        seek(e);
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) seek(e);
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Volume Slider
    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        audio.volume = val;
        isMuted = val === 0;
        updateVolumeUI(val);
        localStorage.setItem('kirtsoy_player_vol', val.toString());
    });

    // Mute Button
    muteBtn.addEventListener('click', () => {
        if (isMuted) {
            audio.volume = previousVolume > 0 ? previousVolume : 0.85;
            volumeSlider.value = audio.volume;
            isMuted = false;
        } else {
            previousVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
            isMuted = true;
        }
        updateVolumeUI(audio.volume);
    });

    function updateVolumeUI(val) {
        if (val === 0) {
            volOnIcon.classList.add('hidden');
            volOffIcon.classList.remove('hidden');
        } else {
            volOnIcon.classList.remove('hidden');
            volOffIcon.classList.add('hidden');
        }
    }

    // Tabs
    tabPlayerBtn.addEventListener('click', () => switchTab('player'));
    tabTracksBtn.addEventListener('click', () => switchTab('tracks'));

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        // Space: Play/Pause
        if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlayPause();
        }
        // Arrow Right: Seek forward 5s
        if (e.code === 'ArrowRight' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
        }
        // Arrow Left: Seek backward 5s
        if (e.code === 'ArrowLeft' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            audio.currentTime = Math.max(0, audio.currentTime - 5);
        }
    });
}

// Start player on load
document.addEventListener('DOMContentLoaded', init);
