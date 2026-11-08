package com.example.objectdetector

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.example.objectdetector.databinding.ActivityMainBinding
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var cameraExecutor: ExecutorService
    private var classifierHelper: ClassifierHelper? = null

    private var lensFacing = CameraSelector.LENS_FACING_BACK

    private val requestPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                startCamera()
            } else {
                Toast.makeText(this, "Camera permission is required to detect objects", Toast.LENGTH_LONG).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        classifierHelper = ClassifierHelper(this)
        cameraExecutor = Executors.newSingleThreadExecutor()

        setupUI()
        checkPermissionsAndStart()
    }

    private fun setupUI() {
        if (!classifierHelper!!.isModelLoaded()) {
            binding.modelStatusText.text = "Model file missing in assets (place model.tflite in assets/)"
            binding.modelStatusDot.setBackgroundResource(R.drawable.dot_red)
        } else {
            binding.modelStatusText.text = "Model Ready (2 Classes)"
            binding.modelStatusDot.setBackgroundResource(R.drawable.dot_green)
        }

        binding.btnFlipCamera.setOnClickListener {
            lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
                CameraSelector.LENS_FACING_FRONT
            } else {
                CameraSelector.LENS_FACING_BACK
            }
            startCamera()
        }
    }

    private fun checkPermissionsAndStart() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.viewFinder.surfaceProvider)
            }

            val imageAnalyzer = ImageAnalysis.Builder()
                .setTargetResolution(android.util.Size(640, 480))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor) { imageProxy ->
                        processImageProxy(imageProxy)
                    }
                }

            val cameraSelector = CameraSelector.Builder().requireLensFacing(lensFacing).build()

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageAnalyzer)
            } catch (exc: Exception) {
                exc.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun processImageProxy(imageProxy: ImageProxy) {
        val bitmap = imageProxyToBitmap(imageProxy)
        imageProxy.close()

        if (bitmap != null && classifierHelper != null && classifierHelper!!.isModelLoaded()) {
            val startTime = System.currentTimeMillis()
            val results = classifierHelper!!.classify(bitmap)
            val latency = System.currentTimeMillis() - startTime

            runOnUiThread {
                updateResultsUI(results, latency)
            }
        }
    }

    private fun updateResultsUI(results: List<RecognitionResult>, latencyMs: Long) {
        binding.txtLatency.text = "${latencyMs}ms"

        if (results.isNotEmpty()) {
            val top = results[0]
            val percent = (top.confidence * 100).toInt()
            binding.txtHeroLabel.text = top.label
            binding.txtHeroPercent.text = "${percent}%"
            binding.progressHero.progress = percent

            // Update Class 1 & Class 2 breakdown
            results.forEach { item ->
                val p = (item.confidence * 100).toInt()
                if (item.label.contains("1", ignoreCase = true) || item.label == "Class 1") {
                    binding.txtClass1Percent.text = "${p}%"
                    binding.progressClass1.progress = p
                } else if (item.label.contains("2", ignoreCase = true) || item.label == "Class 2") {
                    binding.txtClass2Percent.text = "${p}%"
                    binding.progressClass2.progress = p
                }
            }
        }
    }

    private fun imageProxyToBitmap(image: ImageProxy): Bitmap? {
        val planes = image.planes
        val yBuffer = planes[0].buffer
        val uBuffer = planes[1].buffer
        val vBuffer = planes[2].buffer

        val ySize = yBuffer.remaining()
        val uSize = uBuffer.remaining()
        val vSize = vBuffer.remaining()

        val nv21 = ByteArray(ySize + uSize + vSize)
        yBuffer.get(nv21, 0, ySize)
        vBuffer.get(nv21, ySize, vSize)
        uBuffer.get(nv21, ySize + vSize, uSize)

        val yuvImage = YuvImage(nv21, ImageFormat.NV21, image.width, image.height, null)
        val out = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, image.width, image.height), 80, out)
        val imageBytes = out.toByteArray()
        return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        classifierHelper?.close()
    }
}
