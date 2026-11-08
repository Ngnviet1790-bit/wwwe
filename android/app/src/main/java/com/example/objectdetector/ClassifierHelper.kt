package com.example.objectdetector

import android.content.Context
import android.graphics.Bitmap
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.support.common.FileUtil
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

data class RecognitionResult(
    val label: String,
    val confidence: Float
)

class ClassifierHelper(private val context: Context) {

    private var interpreter: Interpreter? = null
    private var labels: List<String> = emptyList()

    private val inputImageWidth = 224
    private val inputImageHeight = 224
    private val modelInputSize = 4 * inputImageWidth * inputImageHeight * 3 // Float32 (4 bytes) * 224 * 224 * 3 (RGB)

    init {
        setupClassifier()
    }

    private fun setupClassifier() {
        try {
            // Load labels
            labels = FileUtil.loadLabels(context, "labels.txt")

            // Try loading model.tflite or model_unquant.tflite
            val modelBuffer = try {
                loadModelFile("model.tflite")
            } catch (e: Exception) {
                try {
                    loadModelFile("model_unquant.tflite")
                } catch (e2: Exception) {
                    null
                }
            }

            if (modelBuffer != null) {
                val options = Interpreter.Options().apply {
                    setNumThreads(4)
                }
                interpreter = Interpreter(modelBuffer, options)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun loadModelFile(fileName: String): MappedByteBuffer {
        val fileDescriptor = context.assets.openFd(fileName)
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = fileDescriptor.startOffset
        val declaredLength = fileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    fun isModelLoaded(): Boolean = interpreter != null

    fun classify(bitmap: Bitmap): List<RecognitionResult> {
        val interp = interpreter ?: return emptyList()

        // Resize bitmap to model input size (224x224)
        val resizedBitmap = Bitmap.createScaledBitmap(bitmap, inputImageWidth, inputImageHeight, true)
        val byteBuffer = convertBitmapToByteBuffer(resizedBitmap)

        // Output buffer: shape [1, numLabels]
        val output = Array(1) { FloatArray(labels.size) }
        interp.run(byteBuffer, output)

        val probabilities = output[0]
        val results = mutableListOf<RecognitionResult>()

        for (i in labels.indices) {
            val score = if (i < probabilities.size) probabilities[i] else 0f
            results.add(RecognitionResult(labels[i], score))
        }

        // Return sorted descending by confidence
        return results.sortedByDescending { it.confidence }
    }

    private fun convertBitmapToByteBuffer(bitmap: Bitmap): ByteBuffer {
        val byteBuffer = ByteBuffer.allocateDirect(modelInputSize)
        byteBuffer.order(ByteOrder.nativeOrder())

        val intValues = IntArray(inputImageWidth * inputImageHeight)
        bitmap.getPixels(intValues, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        var pixel = 0
        for (i in 0 until inputImageWidth) {
            for (j in 0 until inputImageHeight) {
                val value = intValues[pixel++]
                // Teachable Machine floating-point normalization: (pixel - 127.5) / 127.5
                byteBuffer.putFloat((((value shr 16) and 0xFF) - 127.5f) / 127.5f) // R
                byteBuffer.putFloat((((value shr 8) and 0xFF) - 127.5f) / 127.5f)  // G
                byteBuffer.putFloat(((value and 0xFF) - 127.5f) / 127.5f)         // B
            }
        }
        return byteBuffer
    }

    fun close() {
        interpreter?.close()
        interpreter = null
    }
}
