package com.solargridlk.mobile.ui.prosumer

import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import android.view.View
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.QrApiClient
import kotlinx.coroutines.launch

class QrDisplayActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_display)

        val reservationId = intent.getStringExtra("reservationId")
        val detail = intent.getStringExtra("detail")   // optional: "NODE-001 · 23 Sep 2026 14:00"

        findViewById<TextView>(R.id.detailText).text = detail ?: ""

        if (reservationId.isNullOrBlank()) {
            findViewById<TextView>(R.id.statusText).text = "No reservation id provided"
            return
        }

        loadQr(reservationId)
    }

    private fun loadQr(reservationId: String) {
        val image = findViewById<ImageView>(R.id.qrImage)
        val loading = findViewById<ProgressBar>(R.id.loading)
        val status = findViewById<TextView>(R.id.statusText)

        loading.visibility = View.VISIBLE
        status.text = ""

        lifecycleScope.launch {
            try {
                val res = QrApiClient.create(this@QrDisplayActivity).getImage(reservationId)
                loading.visibility = View.GONE

                if (res.isSuccessful) {
                    val uri = res.body()?.data
                    if (uri.isNullOrBlank()) {
                        status.text = "No QR available yet — has this booking been approved?"
                        return@launch
                    }
                    // strip "data:image/png;base64," then decode
                    val base64 = uri.substringAfter("base64,", uri)
                    val bytes = Base64.decode(base64, Base64.DEFAULT)
                    val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    if (bmp != null) image.setImageBitmap(bmp)
                    else status.text = "Could not render the QR image"
                } else {
                    status.text = when (res.code()) {
                        401 -> "Session expired — please log in again"
                        404 -> "Booking not found"
                        else -> "Failed to load QR (${res.code()})"
                    }
                }
            } catch (e: Exception) {
                loading.visibility = View.GONE
                status.text = "Network error: ${e.message}"
            }
        }
    }
}