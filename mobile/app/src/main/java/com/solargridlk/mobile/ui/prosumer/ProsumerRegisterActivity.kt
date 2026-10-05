/*
 * File: ProsumerRegisterActivity.kt
 * Description: Collects a new prosumer account and posts it to the public
 * registration endpoint. It does not create a session or store the password.
 */
package com.solargridlk.mobile.ui.prosumer

import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.repository.ProsumerRepository
import com.solargridlk.mobile.utils.ProsumerFieldValidator
import kotlinx.coroutines.launch
import org.json.JSONObject

class ProsumerRegisterActivity : AppCompatActivity() {

    private lateinit var nicInput: EditText
    private lateinit var fullNameInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var confirmPasswordInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var addressInput: EditText
    private lateinit var registerButton: Button
    private lateinit var errorText: TextView
    private lateinit var progressBar: ProgressBar

    private val prosumerRepository by lazy {
        ProsumerRepository(RetrofitClient.prosumerApi)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Show the registration form and wire its actions.
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_register)

        initializeViews()
        setupRegisterButton()
        setupBackToLogin()
    }

    private fun initializeViews() {
        // Bind the registration form controls.
        nicInput = findViewById(R.id.nicInput)
        fullNameInput = findViewById(R.id.fullNameInput)
        passwordInput = findViewById(R.id.passwordInput)
        confirmPasswordInput = findViewById(R.id.confirmPasswordInput)
        emailInput = findViewById(R.id.emailInput)
        phoneInput = findViewById(R.id.phoneInput)
        addressInput = findViewById(R.id.addressInput)
        registerButton = findViewById(R.id.registerButton)
        errorText = findViewById(R.id.errorText)
        progressBar = findViewById(R.id.progressBar)
    }

    private fun setupRegisterButton() {
        // Start validation and registration when Register is pressed.
        registerButton.setOnClickListener {
            performRegistration()
        }
    }

    private fun setupBackToLogin() {
        // Return to the existing login screen without creating a session.
        findViewById<TextView>(R.id.backToLoginText).setOnClickListener {
            finish()
        }
    }

    private fun performRegistration() {
        // Validate the form, then post a new prosumer account.
        val nic = nicInput.text.toString().trim().uppercase()
        val fullName = fullNameInput.text.toString().trim()
        val password = passwordInput.text.toString()
        val confirmPassword = confirmPasswordInput.text.toString()
        val email = emailInput.text.toString().trim()
        val phoneNumber = phoneInput.text.toString().trim()
        val address = addressInput.text.toString().trim()

        hideError()

        val validationError = ProsumerFieldValidator.registrationError(
            nic = nic,
            fullName = fullName,
            email = email,
            phoneNumber = phoneNumber,
            password = password,
            confirmPassword = confirmPassword
        )

        if (validationError != null) {
            showError(validationError)
            return
        }

        registerButton.isEnabled = false
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = prosumerRepository.register(
                    nic = nic,
                    password = password,
                    fullName = fullName,
                    email = email,
                    phoneNumber = phoneNumber,
                    address = address
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    showSuccessDialog(
                        response.body()?.message ?: "Prosumer registered successfully."
                    )
                } else {
                    val rawError = response.errorBody()?.string()
                    val fallback = response.body()?.message
                        ?: "Registration failed. Please try again."
                    showError(parseErrorMessage(rawError, fallback))
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Prosumer registration failed", exception)
                showError("Unable to connect to the server.")
            } finally {
                registerButton.isEnabled = true
                showLoading(false)
            }
        }
    }

    private fun parseErrorMessage(rawJson: String?, fallbackMessage: String): String {
        // Read the backend message field from an error response.
        if (!rawJson.isNullOrBlank()) {
            try {
                val message = JSONObject(rawJson).optString("message", "")
                if (message.isNotBlank()) {
                    return message
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Could not read registration error", exception)
            }
        }
        return fallbackMessage
    }

    private fun showSuccessDialog(message: String) {
        // Tell the user the account was created, then return to login.
        AlertDialog.Builder(this)
            .setTitle("Registration Successful")
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton("OK") { _, _ ->
                finish()
            }
            .show()
    }

    private fun showLoading(isLoading: Boolean) {
        // Toggle the progress indicator while the request is running.
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun showError(message: String) {
        // Display the error banner with the given message.
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private fun hideError() {
        // Hide the error banner and clear its text.
        errorText.text = ""
        errorText.visibility = View.GONE
    }
}
