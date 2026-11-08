========================================================================
HOW TO ADD YOUR TEACHABLE MACHINE MODEL FOR ANDROID (.tflite)
========================================================================

1. Open your project in Google Teachable Machine:
   https://teachablemachine.withgoogle.com/

2. Click "Export Model" in the top bar.

3. Click the "TensorFlow Lite" tab.

4. Select "Quantized" (recommended for faster mobile inference) 
   or "Floating point".

5. Click "Download my model". A zip file will be downloaded.

6. Extract the zip file:
   - Copy "model_unquant.tflite" or "model.tflite" into this folder:
     android/app/src/main/assets/model.tflite
   - (labels.txt is already provided in this folder: Class 1, Class 2).

7. Open the `android/` directory in Android Studio, sync Gradle, and run!
