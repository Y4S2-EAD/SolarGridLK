package com.solargridlk.mobile.ui.gridoperator

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.QrApiClient
import com.solargridlk.mobile.data.model.QrVerifyRequest
import com.solargridlk.mobile.data.model.QrVerifyResponse
import kotlinx.coroutines.launch

class QrScanActivity : AppCompatActivity() {

    private lateinit var scanButton: Button
    private lateinit var resultText: TextView

    // ZXing scanner result: contents = the scanned token, or null if cancelled.
    private val scanLauncher = registerForActivityResult(ScanContract()) { result ->
        if (result.contents != null) {
            verifyToken(result.contents)
        } else {
            resultText.text = "Scan cancelled."
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scan)

        findViewById<ImageButton>(R.id.backButton).setOnClickListener { finish() }

        scanButton = findViewById(R.id.scanButton)
        resultText = findViewById(R.id.resultText)

        scanButton.setOnClickListener { startScan() }

        val tokenInput = findViewById<EditText>(R.id.tokenInput)
        findViewById<Button>(R.id.verifyButton).setOnClickListener {
            val token = tokenInput.text.toString().trim()
            if (token.isEmpty()) {
                resultText.text = "Enter a token first"
            } else {
                verifyToken(token)   // reuses your existing verify path
            }
        }

    }

    private fun startScan() {
        // Launch the ZXing camera scanner (it requests camera permission itself).
        val options = ScanOptions().apply {
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            setPrompt("Scan the booking QR")
            setBeepEnabled(true)
            setOrientationLocked(false)
        }
        scanLauncher.launch(options)
    }

    private fun verifyToken(token: String) {
        // Send the scanned token to /api/qr/verify and show the outcome.
        resultText.text = "Verifying…"

        lifecycleScope.launch {
            try {
                val response = QrApiClient.create(this@QrScanActivity)
                    .verify(QrVerifyRequest(token))

                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    resultText.text = buildString {
                        append("✓ Transfer completed\n\n")
                        append("Prosumer NIC: ${data?.prosumerNic ?: "-"}\n")
                        append("Node: ${data?.nodeId ?: "-"}\n")
                        append("Status: ${data?.status ?: "-"}")
                    }
                } else {
                    // On 4xx the message is in errorBody ({ success, message, data }).
                    val errorJson = response.errorBody()?.string()
                    val message = try {
                        Gson().fromJson(errorJson, QrVerifyResponse::class.java)?.message
                    } catch (e: Exception) {
                        null
                    }
                    resultText.text = "✗ ${message ?: "Verification failed."}"
                }
            } catch (e: Exception) {
                resultText.text = "✗ ${e.message ?: "Network error."}"
            }
        }
    }
}