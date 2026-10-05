package com.solargridlk.mobile.ui.auth

import android.content.Intent
import android.os.Bundle
import android.text.InputFilter
import android.text.InputType
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.LoginData
import com.solargridlk.mobile.data.repository.AuthRepository
import com.solargridlk.mobile.ui.backoffice.BackofficeHomeActivity
import com.solargridlk.mobile.ui.gridoperator.GridOperatorHomeActivity
import com.solargridlk.mobile.ui.prosumer.ProsumerHomeActivity
import com.solargridlk.mobile.ui.prosumer.ProsumerRegisterActivity
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch
import org.json.JSONObject

class LoginActivity : AppCompatActivity() {

    private lateinit var usernameInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var errorText: TextView
    private lateinit var rememberMeCheckbox: CheckBox
    private lateinit var sessionManager: SessionManager
    private lateinit var loginSubtitle: TextView
    private lateinit var identityLabel: TextView
    private lateinit var nicHelpText: TextView
    private lateinit var staffModeButton: TextView
    private lateinit var prosumerModeButton: TextView
    private lateinit var staffOptionsRow: LinearLayout
    private lateinit var showPasswordText: TextView
    private lateinit var loginProgress: ProgressBar

    private var prosumerMode = false
    private var passwordVisible = false

    private val authRepository by lazy {
        AuthRepository(RetrofitClient.authApi)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        sessionManager = SessionManager(this)

        initializeViews()
        setupLoginButton()
        setupRegisterLink()
        setupModeSwitch()
        setupPasswordToggle()
        showStaffMode()
    }

    private fun setupModeSwitch() {
        // Switch between staff login and prosumer login without mixing the requests.
        staffModeButton.setOnClickListener { showStaffMode() }
        prosumerModeButton.setOnClickListener { showProsumerMode() }
    }

    private fun showStaffMode() {
        // Show the existing staff username form and clear fields so credentials are not reused.
        prosumerMode = false
        loginSubtitle.text = "Enter your operator credentials to continue."
        identityLabel.text = "Username"
        usernameInput.hint = "Username"
        usernameInput.inputType = InputType.TYPE_CLASS_TEXT
        usernameInput.filters = emptyArray()
        nicHelpText.visibility = View.GONE
        staffOptionsRow.visibility = View.VISIBLE
        loginButton.text = "Sign in"
        applyModeStyle(staffSelected = true)
        clearCredentials()
        hideError()
    }

    private fun showProsumerMode() {
        // Show NIC login. This path calls prosumer-login, not staff login.
        prosumerMode = true
        loginSubtitle.text = "Sign in with the NIC and password you registered."
        identityLabel.text = "NIC"
        usernameInput.hint = "123456789V or 123456789012"
        usernameInput.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
        usernameInput.filters = arrayOf(InputFilter.LengthFilter(12))
        nicHelpText.visibility = View.VISIBLE
        staffOptionsRow.visibility = View.GONE
        loginButton.text = "Sign in"
        applyModeStyle(staffSelected = false)
        clearCredentials()
        hideError()
    }

    private fun applyModeStyle(staffSelected: Boolean) {
        // Highlight the selected account type with the existing button colors.
        val selectedBackground = R.drawable.bg_button_amber
        val idleBackground = R.drawable.bg_button_outline
        val selectedColor = ContextCompat.getColor(this, R.color.bg_base)
        val idleColor = ContextCompat.getColor(this, R.color.text_muted)

        staffModeButton.setBackgroundResource(if (staffSelected) selectedBackground else idleBackground)
        prosumerModeButton.setBackgroundResource(if (staffSelected) idleBackground else selectedBackground)
        staffModeButton.setTextColor(if (staffSelected) selectedColor else idleColor)
        prosumerModeButton.setTextColor(if (staffSelected) idleColor else selectedColor)
    }

    private fun clearCredentials() {
        // Drop typed values when the account type changes.
        usernameInput.text.clear()
        passwordInput.text.clear()
        if (passwordVisible) {
            togglePasswordVisibility()
        }
    }

    private fun setupPasswordToggle() {
        // Show or hide the password without changing what is submitted.
        showPasswordText.setOnClickListener {
            togglePasswordVisibility()
        }
    }

    private fun togglePasswordVisibility() {
        // Switch the password field between hidden and visible text.
        passwordVisible = !passwordVisible
        val typeface = passwordInput.typeface
        val selection = passwordInput.selectionEnd
        passwordInput.inputType = if (passwordVisible) {
            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        } else {
            InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        passwordInput.typeface = typeface
        if (selection >= 0) {
            passwordInput.setSelection(selection)
        }
        showPasswordText.text = if (passwordVisible) "Hide" else "Show"
    }

    private fun setupRegisterLink() {
        // Open prosumer registration. Staff login is left unchanged.
        findViewById<TextView>(R.id.registerProsumerText).setOnClickListener {
            startActivity(Intent(this, ProsumerRegisterActivity::class.java))
        }
    }

    private fun initializeViews() {
        usernameInput = findViewById(R.id.usernameInput)
        passwordInput = findViewById(R.id.passwordInput)
        loginButton = findViewById(R.id.loginButton)
        errorText = findViewById(R.id.errorText)
        rememberMeCheckbox = findViewById(R.id.rememberMeCheckbox)
        loginSubtitle = findViewById(R.id.loginSubtitle)
        identityLabel = findViewById(R.id.identityLabel)
        nicHelpText = findViewById(R.id.nicHelpText)
        staffModeButton = findViewById(R.id.staffModeButton)
        prosumerModeButton = findViewById(R.id.prosumerModeButton)
        staffOptionsRow = findViewById(R.id.staffOptionsRow)
        showPasswordText = findViewById(R.id.showPasswordText)
        loginProgress = findViewById(R.id.loginProgress)
    }

    private fun setupLoginButton() {
        loginButton.setOnClickListener {
            if (prosumerMode) {
                performProsumerLogin()
            } else {
                performLogin()
            }
        }
    }

    private fun performProsumerLogin() {
        // Validate the NIC form, then call the prosumer login endpoint.
        val nic = usernameInput.text.toString().trim().uppercase()
        val password = passwordInput.text.toString()

        hideError()

        if (nic.isEmpty()) {
            showError("Please enter your NIC.")
            return
        }

        if (password.isEmpty()) {
            showError("Please enter your password.")
            return
        }

        loginButton.isEnabled = false
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = authRepository.prosumerLogin(
                    nic = nic,
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
                    val rawError = response.errorBody()?.string()
                    showError(parseErrorMessage(rawError, "Login failed. Please try again."))
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Prosumer login request failed", exception)
                showError("Unable to connect to the server.")
            } finally {
                loginButton.isEnabled = true
                showLoading(false)
            }
        }
    }

    private fun parseErrorMessage(rawJson: String?, fallbackMessage: String): String {
        // Read the backend message from an error response.
        if (!rawJson.isNullOrBlank()) {
            try {
                val message = JSONObject(rawJson).optString("message", "")
                if (message.isNotBlank()) {
                    return message
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Could not read prosumer login error", exception)
            }
        }
        return fallbackMessage
    }

    private fun showLoading(isLoading: Boolean) {
        // Toggle the progress indicator while prosumer login is running.
        loginProgress.visibility = if (isLoading) View.VISIBLE else View.GONE
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