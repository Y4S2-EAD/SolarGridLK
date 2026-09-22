package com.solargridlk.mobile.ui.auth

import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.LoginData
import com.solargridlk.mobile.data.repository.AuthRepository
import kotlinx.coroutines.launch
import com.solargridlk.mobile.utils.SessionManager

class LoginActivity : AppCompatActivity() {

    private lateinit var usernameInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var errorText: TextView
    private lateinit var rememberMeCheckbox: CheckBox
    private lateinit var sessionManager: SessionManager

    private val authRepository by lazy {
        AuthRepository(RetrofitClient.authApi)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize the login screen and its controls.
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_login)

        sessionManager = SessionManager(this)

        initializeViews()
        setupLoginButton()
    }

    private fun initializeViews() {
        // Connect Kotlin variables with the XML login controls.
        usernameInput = findViewById(R.id.usernameInput)
        passwordInput = findViewById(R.id.passwordInput)
        loginButton = findViewById(R.id.loginButton)
        errorText = findViewById(R.id.errorText)
        rememberMeCheckbox = findViewById(R.id.rememberMeCheckbox)
    }

    private fun setupLoginButton() {
        // Start the login request when the user presses Login.
        loginButton.setOnClickListener {
            performLogin()
        }
    }

    private fun performLogin() {
        // Validate the entered credentials before calling the API.
        val username =
            usernameInput.text.toString().trim()

        val password =
            passwordInput.text.toString()

        hideError()

        if (username.isEmpty()) {
            showError("Please enter your username.")
            return
        }

        if (password.isEmpty()) {
            showError("Please enter your password.")
            return
        }

        loginButton.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = authRepository.login(
                    username = username,
                    password = password
                )

                if (response.isSuccessful) {
                    val loginResponse = response.body()

                    if (loginResponse?.success == true &&
                        loginResponse.data != null
                    ) {
                        handleLoginSuccess(
                            loginResponse.data
                        )
                    } else {
                        showError(
                            loginResponse?.message
                                ?: "Login failed."
                        )
                    }
                } else {
                    when (response.code()) {
                        401 -> {
                            showError(
                                "Invalid username or password."
                            )
                        }

                        else -> {
                            showError(
                                "Login failed. Please try again."
                            )
                        }
                    }
                }

            } catch (exception: Exception) {
                // Log the network failure while showing a safe message to the user.
                android.util.Log.e(
                    "SolarGridAPI",
                    "Login request failed",
                    exception
                )

                showError(
                    "Unable to connect to the server."
                )
            } finally {
                loginButton.isEnabled = true
            }
        }
    }

    private fun handleLoginSuccess(loginData: LoginData) {
        // Save the authenticated user's session after successful login.
        sessionManager.saveSession(
            token = loginData.token,
            username = loginData.username,
            role = loginData.role,
            fullName = loginData.fullName,
            expiresAt = loginData.expiresAt
        )

        Log.d(
            "SolarGridAPI",
            "Session saved for ${loginData.username}, role=${loginData.role}"
        )

        when (loginData.role) {
            "Backoffice" -> {
                showError("Backoffice login successful.")
            }

            "GridOperator" -> {
                showError("Grid Operator login successful.")
            }

            else -> {
                showError("Unsupported user role.")
            }
        }
    }

    private fun showError(message: String) {
        // Display the login error message to the user.
        errorText.text = message
        errorText.visibility = android.view.View.VISIBLE
    }


    private fun hideError() {
        // Hide the login error banner before a new login attempt.
        errorText.text = ""
        errorText.visibility = android.view.View.GONE
    }
}