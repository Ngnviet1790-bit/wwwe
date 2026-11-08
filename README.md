# 📱 AI Object Detector & Classifier (Web & Android)

A modern, real-time object detection and image classification application powered by **Google Teachable Machine** and **TensorFlow / TFLite**.

Live Teachable Machine Model URL: [https://teachablemachine.withgoogle.com/models/lIhh7SOKi/](https://teachablemachine.withgoogle.com/models/lIhh7SOKi/)

Detected Classes: **`Class 1`**, **`Class 2`**

---

## 🤖 2 Ways to Run on Android

### Cách 1: Cài đặt trực tiếp dưới dạng Web App (PWA cho Android)

Không cần cài Android Studio hay máy tính! Ứng dụng web đã được tối ưu hoàn toàn cho điện thoại Android:

1. Mở trình duyệt **Google Chrome** trên điện thoại Android của bạn.
2. Truy cập đường link GitHub Pages của dự án:
   👉 **`https://Ngnviet1790-bit.github.io/wwwe/`**
3. Nhấn vào nút menu **`⋮`** ở góc trên bên phải Chrome.
4. Chọn **"Cài đặt ứng dụng"** (Install app) hoặc **"Thêm vào màn hình chính"** (Add to Home screen).
5. Ứng dụng sẽ xuất hiện trên màn hình điện thoại như một app Android thực thụ với:
   - Hỗ trợ camera sau (**Back Camera**) để quét đồ vật xung quanh.
   - Nút chuyển camera trước / sau mượt mà.
   - Hoạt động toàn màn hình (Standalone Fullscreen).
   - Âm thanh đọc tên vật thể khi nhận diện chính xác.

---

### Cách 2: Ứng dụng Android Native với Android Studio (`android/`)

Dự án đã tích hợp sẵn mã nguồn hoàn chỉnh cho ứng dụng Native Android bằng **Kotlin**, **CameraX** và **TensorFlow Lite** trong thư mục `android/`.

#### Cấu trúc thư mục Android:
```text
android/
├── app/
│   ├── build.gradle                          # Cấu hình CameraX & TensorFlow Lite Support
│   └── src/main/
│       ├── AndroidManifest.xml               # Khai báo quyền Camera
│       ├── assets/
│       │   ├── labels.txt                    # Danh sách nhãn (Class 1, Class 2)
│       │   ├── README_MODEL.txt              # Hướng dẫn chi tiết
│       │   └── model.tflite                  # Nơi đặt mô hình TensorFlow Lite (.tflite)
│       ├── java/com/example/objectdetector/
│       │   ├── MainActivity.kt               # Điều khiển CameraX & luồng nhận diện
│       │   └── ClassifierHelper.kt           # Xử lý suy luận TensorFlow Lite
│       └── res/layout/activity_main.xml      # Giao diện ứng dụng Android
├── build.gradle
└── settings.gradle
```

#### Các bước đưa mô hình vào Android Studio:
1. Mở dự án của bạn trên [Google Teachable Machine](https://teachablemachine.withgoogle.com/models/lIhh7SOKi/).
2. Bấm nút **Export Model** ở góc trên cùng.
3. Chọn tab **TensorFlow Lite**:
   - Chọn **Quantized** (khuyên dùng để chạy nhẹ và nhanh trên điện thoại) hoặc **Floating point**.
   - Bấm **Download my model** (file `.zip` sẽ tải về máy).
4. Giải nén file `.zip`, bạn sẽ thấy file `model.tflite` (hoặc `model_unquant.tflite`).
5. Sao chép file đó vào thư mục:
   👉 `android/app/src/main/assets/model.tflite`
6. Mở thư mục `android/` bằng **Android Studio**, bấm **Sync Project with Gradle Files** và nhấn **Run** (chạy trên máy thật Android hoặc máy ảo).

---

## 💻 Chạy thử Web cục bộ trên máy tính

```bash
cd /Users/nguyennamviet/Desktop/aniti
python3 -m http.server 8000
```
Mở trình duyệt: **[http://localhost:8000](http://localhost:8000)**

---

## 🛠️ Công nghệ sử dụng
- **Android Native**: Kotlin, Android CameraX API, TensorFlow Lite Runtime (`org.tensorflow:tensorflow-lite:2.14.0`).
- **Web & PWA**: HTML5, Modern CSS, TensorFlow.js, Google Teachable Machine Image Library, Web App Manifest & Service Worker.
