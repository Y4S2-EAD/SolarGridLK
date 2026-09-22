package com.solargridlk.mobile

import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.LoginRequest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize the main activity and test API connectivity.
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        testLogin()
    }

    private fun testLogin() {
        // Send a test login request to the ASP.NET API.
        lifecycleScope.launch {

            try {
                val response =
                    RetrofitClient.authApi.login(
                        LoginRequest(
                            username = "",
                            password = ""
                        )
                    )

                Log.d(
                    "SolarGridAPI",
                    "HTTP Status: ${response.code()}"
                )

                Log.d(
                    "SolarGridAPI",
                    "Response: ${response.body()}"
                )

            } catch (exception: Exception) {

                Log.e(
                    "SolarGridAPI",
                    "API request failed",
                    exception
                )
            }
        }
    }
}