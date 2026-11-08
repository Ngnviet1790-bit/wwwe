# 👁️ AI Object Detector & Classifier

A modern, responsive, real-time object detector and image classification web application powered by **Google Teachable Machine** and **TensorFlow.js**.

Live Model URL: [https://teachablemachine.withgoogle.com/models/lIhh7SOKi/](https://teachablemachine.withgoogle.com/models/lIhh7SOKi/)

---

## ✨ Features

- 📹 **Live Webcam Detection**: Real-time object recognition directly in your browser with camera flip/mirror toggles and scanning laser animation.
- 🖼️ **Image Drag & Drop / Upload**: Classify images from your device (JPG, PNG, WEBP, GIF) with instant prediction.
- 📊 **Real-time Probability Breakdown**:
  - Dominant detection card with high-confidence badge.
  - Interactive probability distribution bars for all trained classes (`Class 1`, `Class 2`).
- 🔊 **Voice Feedback (Text-to-Speech)**: Optional voice announcement when a recognized object is detected with high confidence.
- 📸 **Snapshot Capture & Gallery**: Save detection moments with confidence scores and timestamps, with 1-click image download.
- ⚡ **Performance Telemetry**: Live FPS (Frames Per Second) and inference latency counter (ms).
- 💾 **Dual Model Sources**:
  - Connects directly to cloud-hosted Teachable Machine model.
  - Includes offline local model files in the `model/` directory as an automatic fallback.

---

## 🚀 How to Run Locally

### Option 1: Quick Local Server (Recommended for Camera Access)

Modern browsers require a secure context (HTTPS or `localhost`) for webcam access. You can start a local server in 1 line using Python:

```bash
cd /Users/nguyennamviet/Desktop/aniti
python3 -m http.server 8000
```

Then open your browser and go to:
👉 **[http://localhost:8000](http://localhost:8000)**

### Option 2: Open Directly

You can also simply double-click [index.html](file:///Users/nguyennamviet/Desktop/aniti/index.html) in your browser. (Note: Image upload works in all modes; some browsers may require localhost for webcam permissions).

---

## 🌐 Deploy to GitHub Pages (Free Web Hosting)

To make your web app accessible to anyone on the internet:

1. Open your repository on GitHub: **[https://github.com/Ngnviet1790-bit/wwwe](https://github.com/Ngnviet1790-bit/wwwe)**
2. Go to **Settings** > **Pages** (in the left sidebar).
3. Under **Branch**, select `main` and folder `/ (root)`.
4. Click **Save**.
5. After about 1 minute, your website will be live at:
   👉 **`https://Ngnviet1790-bit.github.io/wwwe/`**

---

## 📂 Project Structure

```text
├── index.html           # Main user interface & semantic layout
├── style.css            # Dark glassmorphic design & responsive animations
├── app.js               # Model loading, webcam controller, prediction & TTS
├── model/               # Bundled local model files
│   ├── model.json
│   ├── metadata.json
│   └── model.weights.bin
└── README.md            # Documentation & setup guide
```

---

## 🛠️ Built With

- [TensorFlow.js](https://www.tensorflow.org/js)
- [Google Teachable Machine](https://teachablemachine.withgoogle.com/)
- Vanilla HTML5 / Modern CSS / Vanilla JavaScript (No heavy build tools required)
