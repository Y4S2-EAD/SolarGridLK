package com.solargridlk.mobile.ui.auth

import android.content.Intent
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
import com.solargridlk.mobile.ui.backoffice.BackofficeHomeActivity
import com.solargridlk.mobile.ui.gridoperator.GridOperatorHomeActivity
import com.solargridlk.mobile.ui.prosumer.ProsumerHomeActivity
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch

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
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        sessionManager = SessionManager(this)

        initializeViews()
        setupLoginButton()
    }

    private fun initializeViews() {
        usernameInput = findViewById(R.id.usernameInput)
        passwordInput = findViewById(R.id.passwordInput)
        loginButton = findViewById(R.id.loginButton)
        errorText = findViewById(R.id.errorText)
        rememberMeCheckbox = findViewById(R.id.rememberMeCheckbox)
    }

    private fun setupLoginButton() {
        loginButton.setOnClickListener {
            performLogin()
        }
    }

    private fun performLogin() {
        val username = usernameInput.text.toString().trim()
        val password = passwordInput.text.toString()

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

                    if (loginResponse?.success == true && loginResponse.data != null) {
                        handleLoginSuccess(loginResponse.data)
                    } else {
                        showError(loginResponse?.message ?: "Login failed.")
                    }
                } else {
                    when (response.code()) {
                        401 -> showError("Invalid username or password.")
                        else -> showError("Login failed. Please try again.")
                    }
                }

            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Login request failed", exception)
                showError("Unable to connect to the server.")
            } finally {
                loginButton.isEnabled = true
            }
        }
    }

    private fun handleLoginSuccess(loginData: LoginData) {
        sessionManager.saveSession(
            token = loginData.token,
            username = loginData.username,
            role = loginData.role,
            fullName = loginData.fullName,
            expiresAt = loginData.expiresAt
        )

        Log.d("SolarGridAPI", "Session saved for ${loginData.username}, role=${loginData.role}")

        when (loginData.role) {
            "Backoffice" -> {
                val intent = Intent(this, BackofficeHomeActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
            }

            "GridOperator" -> {
                val intent = Intent(this, GridOperatorHomeActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
            }

            "Prosumer" -> {
                val intent = Intent(this, ProsumerHomeActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
            }

            else -> {
                sessionManager.clearSession()
                showError("Unsupported user role.")
            }
        }
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = android.view.View.VISIBLE
    }

    private fun hideError() {
        errorText.text = ""
        errorText.visibility = android.view.View.GONE
    }
}