/**
 * AI Object Detector & Classifier
 * Powered by Google Teachable Machine & TensorFlow.js
 * Model: https://teachablemachine.withgoogle.com/models/lIhh7SOKi/
 */

(function () {
  'use strict';

  // --- Configuration & State ---
  const DEFAULT_MODEL_URL = "https://teachablemachine.withgoogle.com/models/lIhh7SOKi/";
  const LOCAL_MODEL_URL = "./model/";

  const state = {
    model: null,
    maxPredictions: 0,
    labels: [],
    webcam: null,
    isWebcamRunning: false,
    currentTab: 'webcam', // 'webcam' | 'upload'
    isMirrored: true,
    voiceEnabled: false,
    threshold: 0.50,
    animationFrameId: null,
    lastFrameTime: performance.now(),
    frameCount: 0,
    fps: 0,
    lastSpokenClass: null,
    lastSpokenTime: 0,
    snapshots: []
  };

  // --- DOM Elements ---
  const el = {
    // Status & Settings
    modelStatusPill: document.getElementById('model-status-pill'),
    modelStatusText: document.getElementById('model-status-text'),
    toggleSettingsBtn: document.getElementById('toggle-settings-btn'),
    settingsDrawer: document.getElementById('settings-drawer'),
    modelUrlInput: document.getElementById('model-url-input'),
    reloadModelBtn: document.getElementById('reload-model-btn'),
    useLocalModelBtn: document.getElementById('use-local-model-btn'),
    thresholdSlider: document.getElementById('threshold-slider'),
    thresholdVal: document.getElementById('threshold-val'),

    // Tabs & Viewport
    tabButtons: document.querySelectorAll('.tab-btn'),
    webcamView: document.getElementById('webcam-view'),
    uploadView: document.getElementById('upload-view'),
    webcamContainer: document.getElementById('webcam-container'),
    webcamPlaceholder: document.getElementById('webcam-placeholder'),
    scanBeam: document.getElementById('scan-beam'),
    ttsToggleBtn: document.getElementById('tts-toggle-btn'),
    ttsIcon: document.getElementById('tts-icon'),
    flipCameraBtn: document.getElementById('flip-camera-btn'),

    // Upload / Dropzone
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    dropzonePrompt: document.getElementById('dropzone-prompt'),
    previewContainer: document.getElementById('preview-container'),
    uploadedImg: document.getElementById('uploaded-image-element'),
    selectNewImageBtn: document.getElementById('select-new-image-btn'),
    uploadControls: document.getElementById('upload-controls'),

    // Bottom Controls
    webcamControls: document.getElementById('webcam-controls'),
    startWebcamBtn: document.getElementById('start-webcam-btn'),
    stopWebcamBtn: document.getElementById('stop-webcam-btn'),
    captureSnapshotBtn: document.getElementById('capture-snapshot-btn'),

    // Overlay
    detectionOverlay: document.getElementById('detection-overlay'),
    overlayLabel: document.getElementById('overlay-label'),
    overlayConfidence: document.getElementById('overlay-confidence'),

    // Results & Telemetry
    fpsCounter: document.getElementById('fps-counter'),
    latencyCounter: document.getElementById('latency-counter'),
    heroClassName: document.getElementById('hero-class-name'),
    heroConfidence: document.getElementById('hero-confidence'),
    heroBarFill: document.getElementById('hero-bar-fill'),
    classCount: document.getElementById('class-count'),
    classesList: document.getElementById('classes-list'),

    // Model Specs
    metaModelName: document.getElementById('meta-model-name'),
    metaClassesList: document.getElementById('meta-classes-list'),

    // Gallery
    galleryGrid: document.getElementById('gallery-grid'),
    galleryEmpty: document.getElementById('gallery-empty'),
    snapshotCount: document.getElementById('snapshot-count'),
    clearSnapshotsBtn: document.getElementById('clear-snapshots-btn')
  };

  // --- Initialize App ---
  async function init() {
    setupEventListeners();
    await loadModel(DEFAULT_MODEL_URL);
  }

  // --- Model Loading ---
  async function loadModel(baseUrl) {
    updateStatus('loading', 'Loading model...');
    try {
      const sanitizedUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const modelURL = sanitizedUrl + 'model.json';
      const metadataURL = sanitizedUrl + 'metadata.json';

      // Load using Teachable Machine Image library
      state.model = await window.tmImage.load(modelURL, metadataURL);
      state.maxPredictions = state.model.getTotalClasses();

      // Retrieve class labels
      state.labels = [];
      for (let i = 0; i < state.maxPredictions; i++) {
        state.labels.push(state.model.getClassLabels ? state.model.getClassLabels()[i] : `Class ${i + 1}`);
      }

      updateStatus('ready', 'Model Ready');
      updateModelMetadata();
      renderInitialClassBars();
    } catch (err) {
      console.warn("Primary model URL failed, attempting local fallback...", err);
      if (baseUrl !== LOCAL_MODEL_URL) {
        try {
          await loadModel(LOCAL_MODEL_URL);
          el.modelUrlInput.value = LOCAL_MODEL_URL;
          return;
        } catch (localErr) {
          console.error("Local fallback also failed:", localErr);
        }
      }
      updateStatus('error', 'Failed to load model');
      alert(`Could not load model from "${baseUrl}". Please check the URL or try local model.`);
    }
  }

  function updateStatus(status, text) {
    el.modelStatusPill.className = `status-pill ${status}`;
    el.modelStatusText.textContent = text;
  }

  function updateModelMetadata() {
    el.classCount.textContent = `${state.maxPredictions} Classes`;
    el.metaClassesList.textContent = state.labels.join(', ');
  }

  function renderInitialClassBars() {
    el.classesList.innerHTML = '';
    state.labels.forEach((label, idx) => {
      const item = document.createElement('div');
      item.className = 'class-item';
      item.id = `class-item-${idx}`;
      item.innerHTML = `
        <div class="class-meta">
          <span class="class-title">${escapeHtml(label)}</span>
          <span class="class-percent" id="class-percent-${idx}">0%</span>
        </div>
        <div class="class-bar-bg">
          <div class="class-bar-val" id="class-bar-${idx}" style="width: 0%"></div>
        </div>
      `;
      el.classesList.appendChild(item);
    });
  }

  // --- Webcam Handler ---
  async function startWebcam() {
    if (!state.model) {
      alert("Please wait for the model to finish loading.");
      return;
    }

    try {
      el.startWebcamBtn.disabled = true;
      el.startWebcamBtn.textContent = "Connecting...";

      // Teachable Machine Webcam helper (width, height, flip)
      const width = 480;
      const height = 360;
      state.webcam = new window.tmImage.Webcam(width, height, state.isMirrored);
      await state.webcam.setup({ facingMode: "user" });
      await state.webcam.play();

      // UI switches
      el.webcamPlaceholder.classList.add('hidden');
      el.webcamContainer.classList.toggle('mirrored', state.isMirrored);

      // Clean container and insert webcam canvas
      const oldCanvas = el.webcamContainer.querySelector('canvas');
      if (oldCanvas) oldCanvas.remove();
      el.webcamContainer.appendChild(state.webcam.canvas);

      state.isWebcamRunning = true;
      el.scanBeam.classList.add('active');
      el.startWebcamBtn.classList.add('hidden');
      el.stopWebcamBtn.classList.remove('hidden');
      el.startWebcamBtn.disabled = false;
      el.startWebcamBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg> Start Camera
      `;
      el.captureSnapshotBtn.disabled = false;

      // Start detection loop
      state.lastFrameTime = performance.now();
      state.frameCount = 0;
      state.animationFrameId = window.requestAnimationFrame(webcamLoop);
    } catch (err) {
      console.error("Camera access error:", err);
      el.startWebcamBtn.disabled = false;
      el.startWebcamBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg> Start Camera
      `;
      alert("Unable to access camera. Please check your browser permissions.");
    }
  }

  function stopWebcam() {
    if (state.animationFrameId) {
      window.cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }

    if (state.webcam) {
      state.webcam.stop();
      state.webcam = null;
    }

    state.isWebcamRunning = false;
    el.scanBeam.classList.remove('active');
    el.stopWebcamBtn.classList.add('hidden');
    el.startWebcamBtn.classList.remove('hidden');
    el.captureSnapshotBtn.disabled = true;

    // Reset telemetry
    el.fpsCounter.textContent = '0';
    el.latencyCounter.textContent = '0ms';
  }

  async function webcamLoop(timestamp) {
    if (!state.isWebcamRunning || !state.webcam) return;

    state.webcam.update();

    // Compute FPS
    state.frameCount++;
    if (timestamp - state.lastFrameTime >= 1000) {
      state.fps = Math.round((state.frameCount * 1000) / (timestamp - state.lastFrameTime));
      el.fpsCounter.textContent = state.fps;
      state.frameCount = 0;
      state.lastFrameTime = timestamp;
    }

    // Run prediction
    const startTime = performance.now();
    await predict(state.webcam.canvas);
    const latency = Math.round(performance.now() - startTime);
    el.latencyCounter.textContent = `${latency}ms`;

    state.animationFrameId = window.requestAnimationFrame(webcamLoop);
  }

  // --- Prediction Engine ---
  async function predict(inputElement) {
    if (!state.model) return;

    try {
      const predictions = await state.model.predict(inputElement);
      processPredictions(predictions);
    } catch (err) {
      console.error("Prediction error:", err);
    }
  }

  function processPredictions(predictions) {
    let topClass = null;
    let maxProb = -1;

    // Update each class bar
    predictions.forEach((pred, idx) => {
      const prob = pred.probability;
      const percent = Math.round(prob * 100);

      const percentEl = document.getElementById(`class-percent-${idx}`);
      const barEl = document.getElementById(`class-bar-${idx}`);
      const itemEl = document.getElementById(`class-item-${idx}`);

      if (percentEl) percentEl.textContent = `${percent}%`;
      if (barEl) barEl.style.width = `${percent}%`;

      if (prob > maxProb) {
        maxProb = prob;
        topClass = pred.className;
      }

      if (itemEl) {
        itemEl.classList.toggle('top-match', false);
      }
    });

    const isAboveThreshold = maxProb >= state.threshold;
    const topIdx = predictions.findIndex(p => p.className === topClass);

    if (topIdx !== -1) {
      const activeItem = document.getElementById(`class-item-${topIdx}`);
      if (activeItem) activeItem.classList.add('top-match');
    }

    if (isAboveThreshold && topClass) {
      const topPercent = Math.round(maxProb * 100);
      el.heroClassName.textContent = topClass;
      el.heroConfidence.textContent = `${topPercent}%`;
      el.heroBarFill.style.width = `${topPercent}%`;

      el.overlayLabel.textContent = topClass;
      el.overlayConfidence.textContent = `${topPercent}%`;
      el.detectionOverlay.style.opacity = '1';

      // Voice feedback if enabled
      speakPrediction(topClass, maxProb);
    } else {
      el.heroClassName.textContent = "Uncertain / Noise";
      el.heroConfidence.textContent = `${Math.round(maxProb * 100)}%`;
      el.heroBarFill.style.width = `${Math.round(maxProb * 100)}%`;

      el.overlayLabel.textContent = "Scanning...";
      el.overlayConfidence.textContent = `${Math.round(maxProb * 100)}%`;
    }
  }

  // --- Voice Feedback (TTS) ---
  function speakPrediction(className, probability) {
    if (!state.voiceEnabled || probability < 0.75) return;
    if (!('speechSynthesis' in window)) return;

    const now = Date.now();
    // Throttle voice to avoid spamming: every 3 seconds or on class change
    if (className === state.lastSpokenClass && (now - state.lastSpokenTime < 3000)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(className);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    state.lastSpokenClass = className;
    state.lastSpokenTime = now;
  }

  // --- Image Upload & Dropzone Handler ---
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, WEBP, GIF).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      el.uploadedImg.src = e.target.result;
      el.uploadedImg.onload = async () => {
        el.dropzonePrompt.classList.add('hidden');
        el.previewContainer.classList.remove('hidden');
        el.uploadControls.classList.remove('hidden');

        // Immediately predict on image
        const startTime = performance.now();
        await predict(el.uploadedImg);
        const latency = Math.round(performance.now() - startTime);
        el.latencyCounter.textContent = `${latency}ms`;
        el.fpsCounter.textContent = 'N/A';
      };
    };
    reader.readAsDataURL(file);
  }

  // --- Snapshots & Gallery ---
  function captureSnapshot() {
    let sourceCanvas = null;

    if (state.currentTab === 'webcam' && state.webcam) {
      sourceCanvas = state.webcam.canvas;
    } else if (state.currentTab === 'upload' && el.uploadedImg.src) {
      // Draw image to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = el.uploadedImg.naturalWidth || 300;
      canvas.height = el.uploadedImg.naturalHeight || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(el.uploadedImg, 0, 0);
      sourceCanvas = canvas;
    }

    if (!sourceCanvas) return;

    const dataUrl = sourceCanvas.toDataURL('image/jpeg', 0.85);
    const label = el.heroClassName.textContent;
    const confidence = el.heroConfidence.textContent;
    const time = new Date().toLocaleTimeString();

    const snapshot = {
      id: Date.now(),
      dataUrl,
      label,
      confidence,
      time
    };

    state.snapshots.unshift(snapshot);
    renderGallery();
  }

  function renderGallery() {
    el.snapshotCount.textContent = `${state.snapshots.length} saved`;

    if (state.snapshots.length === 0) {
      el.galleryEmpty.style.display = 'block';
      el.clearSnapshotsBtn.style.display = 'none';
      el.galleryGrid.innerHTML = '';
      el.galleryGrid.appendChild(el.galleryEmpty);
      return;
    }

    el.galleryEmpty.style.display = 'none';
    el.clearSnapshotsBtn.style.display = 'inline-flex';
    el.galleryGrid.innerHTML = '';

    state.snapshots.forEach(item => {
      const card = document.createElement('div');
      card.className = 'snapshot-item';
      card.innerHTML = `
        <img src="${item.dataUrl}" alt="${escapeHtml(item.label)}" class="snapshot-thumb">
        <div class="snapshot-info">
          <div class="snapshot-top-row">
            <span class="snapshot-label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
            <span class="snapshot-score">${item.confidence}</span>
          </div>
          <div class="snapshot-bottom-row">
            <span>${item.time}</span>
            <a href="${item.dataUrl}" download="detection-${item.id}.jpg" class="snapshot-action-btn" title="Download">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          </div>
        </div>
      `;
      el.galleryGrid.appendChild(card);
    });
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Tab switching
    el.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        el.tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.currentTab = targetTab;
        if (targetTab === 'webcam') {
          el.webcamView.classList.add('active');
          el.uploadView.classList.remove('active');
          el.webcamControls.classList.remove('hidden');
          el.uploadControls.classList.add('hidden');
          el.flipCameraBtn.style.display = 'inline-flex';
        } else {
          stopWebcam();
          el.webcamView.classList.remove('active');
          el.uploadView.classList.add('active');
          el.webcamControls.classList.add('hidden');
          el.flipCameraBtn.style.display = 'none';

          if (el.uploadedImg.src) {
            el.uploadControls.classList.remove('hidden');
            el.captureSnapshotBtn.disabled = false;
          }
        }
      });
    });

    // Webcam Controls
    el.startWebcamBtn.addEventListener('click', startWebcam);
    el.stopWebcamBtn.addEventListener('click', stopWebcam);

    // Flip / Mirror Camera
    el.flipCameraBtn.addEventListener('click', () => {
      state.isMirrored = !state.isMirrored;
      el.webcamContainer.classList.toggle('mirrored', state.isMirrored);
    });

    // TTS Voice Feedback
    el.ttsToggleBtn.addEventListener('click', () => {
      state.voiceEnabled = !state.voiceEnabled;
      el.ttsToggleBtn.classList.toggle('active', state.voiceEnabled);
      el.ttsToggleBtn.querySelector('.btn-text').textContent = state.voiceEnabled ? "Voice On" : "Voice Off";
    });

    // Snapshot
    el.captureSnapshotBtn.addEventListener('click', captureSnapshot);
    el.clearSnapshotsBtn.addEventListener('click', () => {
      state.snapshots = [];
      renderGallery();
    });

    // Dropzone / File Picker
    el.dropzone.addEventListener('click', (e) => {
      if (e.target !== el.selectNewImageBtn) {
        el.fileInput.click();
      }
    });

    el.selectNewImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.fileInput.click();
    });

    el.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });

    el.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropzone.classList.add('dragover');
    });

    el.dropzone.addEventListener('dragleave', () => {
      el.dropzone.classList.remove('dragover');
    });

    el.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    // Settings Drawer
    el.toggleSettingsBtn.addEventListener('click', () => {
      el.settingsDrawer.classList.toggle('hidden');
    });

    el.reloadModelBtn.addEventListener('click', () => {
      const url = el.modelUrlInput.value.trim();
      if (url) {
        stopWebcam();
        loadModel(url);
      }
    });

    el.useLocalModelBtn.addEventListener('click', () => {
      el.modelUrlInput.value = LOCAL_MODEL_URL;
      stopWebcam();
      loadModel(LOCAL_MODEL_URL);
    });

    el.thresholdSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.threshold = val / 100;
      el.thresholdVal.textContent = `${val}%`;
    });
  }

  // --- Utility ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on page load
  window.addEventListener('DOMContentLoaded', init);
})();
