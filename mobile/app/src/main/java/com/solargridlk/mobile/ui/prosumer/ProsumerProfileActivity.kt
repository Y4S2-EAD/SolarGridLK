/*
 * File: ProsumerProfileActivity.kt
 * Description: Loads and updates the signed-in prosumer profile, changes the
 * password, and submits a deactivation request. NIC comes from the session.
 */
package com.solargridlk.mobile.ui.prosumer

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.solargridlk.mobile.R
import com.solargridlk.mobile.data.api.RetrofitClient
import com.solargridlk.mobile.data.model.ProsumerData
import com.solargridlk.mobile.data.repository.ProsumerRepository
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.utils.ProsumerFieldValidator
import com.solargridlk.mobile.utils.SessionManager
import kotlinx.coroutines.launch
import org.json.JSONObject

class ProsumerProfileActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var nicInput: EditText
    private lateinit var fullNameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var addressInput: EditText
    private lateinit var statusText: TextView
    private lateinit var saveButton: Button
    private lateinit var changePasswordButton: Button
    private lateinit var deactivateButton: Button
    private lateinit var errorText: TextView
    private lateinit var retryText: TextView
    private lateinit var progressBar: ProgressBar

    private val prosumerRepository by lazy {
        ProsumerRepository(RetrofitClient.getAuthenticatedProsumerApi(this))
    }

    private var accountStatus: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        // Open the profile for the signed-in prosumer only.
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_profile)

        sessionManager = SessionManager(this)
        if (!sessionManager.isLoggedIn() || sessionManager.getRole() != "Prosumer") {
            openLogin()
            return
        }

        initializeViews()
        findViewById<ImageButton>(R.id.backButton).setOnClickListener { finish() }
        retryText.setOnClickListener { loadProfile() }
        saveButton.setOnClickListener { saveProfile() }
        changePasswordButton.setOnClickListener { showChangePasswordDialog() }
        deactivateButton.setOnClickListener { confirmDeactivation() }

        loadProfile()
    }

    private fun initializeViews() {
        // Bind the profile form.
        nicInput = findViewById(R.id.nicInput)
        fullNameInput = findViewById(R.id.fullNameInput)
        emailInput = findViewById(R.id.emailInput)
        phoneInput = findViewById(R.id.phoneInput)
        addressInput = findViewById(R.id.addressInput)
        statusText = findViewById(R.id.statusText)
        saveButton = findViewById(R.id.saveButton)
        changePasswordButton = findViewById(R.id.changePasswordButton)
        deactivateButton = findViewById(R.id.deactivateButton)
        errorText = findViewById(R.id.errorText)
        retryText = findViewById(R.id.retryText)
        progressBar = findViewById(R.id.progressBar)
    }

    private fun loadProfile() {
        // Load the profile for the NIC stored in the session.
        val nic = sessionManager.getUsername()?.trim().orEmpty()
        if (nic.isEmpty()) {
            openLogin()
            return
        }

        hideError()
        setFormEnabled(false)
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = prosumerRepository.getProfile(nic)
                if (response.code() == 401) {
                    handleSessionExpired()
                    return@launch
                }

                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    bindProfile(response.body()!!.data!!)
                } else {
                    val rawError = response.errorBody()?.string()
                    showError(parseErrorMessage(rawError, response.code(), "Unable to load your profile."))
                    retryText.visibility = View.VISIBLE
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Prosumer profile load failed", exception)
                showError("Unable to connect to the server.")
                retryText.visibility = View.VISIBLE
            } finally {
                showLoading(false)
            }
        }
    }

    private fun bindProfile(profile: ProsumerData) {
        // Fill the form from the server response.
        nicInput.setText(profile.nic.orEmpty())
        fullNameInput.setText(profile.fullName.orEmpty())
        emailInput.setText(profile.email.orEmpty())
        phoneInput.setText(profile.phoneNumber.orEmpty())
        addressInput.setText(profile.address.orEmpty())
        accountStatus = profile.status.orEmpty()
        statusText.text = if (accountStatus.isBlank()) "Unknown" else accountStatus
        statusText.setTextColor(
            ContextCompat.getColor(
                this,
                if (accountStatus.equals("Active", ignoreCase = true)) R.color.success else R.color.error
            )
        )

        val editable = accountStatus.equals("Active", ignoreCase = true)
        setFormEnabled(editable)
        deactivateButton.isEnabled = editable
        retryText.visibility = View.GONE
        if (!profile.fullName.isNullOrBlank()) {
            sessionManager.updateFullName(profile.fullName)
        }
    }

    private fun saveProfile() {
        // Validate the form, then save it for the signed-in NIC.
        val nic = sessionManager.getUsername()?.trim().orEmpty()
        val fullName = fullNameInput.text.toString().trim()
        val email = emailInput.text.toString().trim()
        val phoneNumber = phoneInput.text.toString().trim()
        val address = addressInput.text.toString().trim()

        hideError()
        val validationError = ProsumerFieldValidator.profileError(fullName, email, phoneNumber)
        if (validationError != null) {
            showError(validationError)
            return
        }

        saveButton.isEnabled = false
        showLoading(true)

        lifecycleScope.launch {
            try {
                val response = prosumerRepository.updateProfile(
                    nic = nic,
                    fullName = fullName,
                    email = email,
                    phoneNumber = phoneNumber,
                    address = address
                )
                if (response.code() == 401) {
                    handleSessionExpired()
                    return@launch
                }

                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    bindProfile(response.body()!!.data!!)
                    showSuccess("Profile updated", response.body()?.message ?: "Prosumer updated successfully.")
                } else {
                    val rawError = response.errorBody()?.string()
                    showError(parseErrorMessage(rawError, response.code(), "Unable to update your profile."))
                    setFormEnabled(accountStatus.equals("Active", ignoreCase = true))
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Prosumer profile update failed", exception)
                showError("Unable to connect to the server.")
                setFormEnabled(accountStatus.equals("Active", ignoreCase = true))
            } finally {
                showLoading(false)
            }
        }
    }

    private fun showChangePasswordDialog() {
        // Collect a new password and send only that field to the profile update API.
        val view = layoutInflater.inflate(R.layout.dialog_change_password, null)
        val newPasswordInput = view.findViewById<EditText>(R.id.newPasswordInput)
        val confirmPasswordInput = view.findViewById<EditText>(R.id.confirmPasswordInput)
        val dialogError = view.findViewById<TextView>(R.id.dialogErrorText)
        val dialog = AlertDialog.Builder(this)
            .setTitle("Change password")
            .setView(view)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Update", null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val newPassword = newPasswordInput.text.toString()
                val confirmPassword = confirmPasswordInput.text.toString()
                val validationError = ProsumerFieldValidator.passwordChangeError(newPassword, confirmPassword)
                if (validationError != null) {
                    dialogError.text = validationError
                    dialogError.visibility = View.VISIBLE
                    return@setOnClickListener
                }
                dialogError.visibility = View.GONE
                submitPasswordChange(dialog, dialogError, newPassword)
            }
        }
        dialog.show()
    }

    private fun submitPasswordChange(
        dialog: AlertDialog,
        dialogError: TextView,
        newPassword: String
    ) {
        // Hashing happens on the server. The password is not stored locally.
        val nic = sessionManager.getUsername()?.trim().orEmpty()
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = false

        lifecycleScope.launch {
            try {
                val response = prosumerRepository.changePassword(nic, newPassword)
                if (response.code() == 401) {
                    dialog.dismiss()
                    handleSessionExpired()
                    return@launch
                }

                if (response.isSuccessful && response.body()?.success == true) {
                    dialog.dismiss()
                    showSuccess("Password updated", "Your password has been changed.")
                } else {
                    val rawError = response.errorBody()?.string()
                    dialogError.text = parseErrorMessage(rawError, response.code(), "Unable to change your password.")
                    dialogError.visibility = View.VISIBLE
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Prosumer password change failed", exception)
                dialogError.text = "Unable to connect to the server."
                dialogError.visibility = View.VISIBLE
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true
            }
        }
    }

    private fun confirmDeactivation() {
        // Explain the consequence before asking for the current password.
        AlertDialog.Builder(this)
            .setTitle("Deactivate account?")
            .setMessage("Your account will become deactivated. You will not be able to sign in until Backoffice reactivates it.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Deactivate") { _, _ ->
                showDeactivationPasswordDialog()
            }
            .show()
    }

    private fun showDeactivationPasswordDialog() {
        // Confirm the current password required by the deactivation endpoint.
        val view = layoutInflater.inflate(R.layout.dialog_deactivate_account, null)
        val passwordInput = view.findViewById<EditText>(R.id.currentPasswordInput)
        val dialogError = view.findViewById<TextView>(R.id.dialogErrorText)
        val dialog = AlertDialog.Builder(this)
            .setTitle("Confirm deactivation")
            .setView(view)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Deactivate", null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val password = passwordInput.text.toString()
                if (password.isEmpty()) {
                    dialogError.text = "Password is required."
                    dialogError.visibility = View.VISIBLE
                    return@setOnClickListener
                }
                dialogError.visibility = View.GONE
                submitDeactivation(dialog, dialogError, password)
            }
        }
        dialog.show()
    }

    private fun submitDeactivation(
        dialog: AlertDialog,
        dialogError: TextView,
        password: String
    ) {
        // Deactivate this account, then clear the session and return to login.
        val nic = sessionManager.getUsername()?.trim().orEmpty()
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = false

        lifecycleScope.launch {
            try {
                val response = prosumerRepository.requestDeactivation(nic, password)
                if (response.code() == 401) {
                    dialog.dismiss()
                    handleSessionExpired()
                    return@launch
                }

                if (response.isSuccessful && response.body()?.success == true) {
                    dialog.dismiss()
                    sessionManager.clearSession()
                    AlertDialog.Builder(this@ProsumerProfileActivity)
                        .setTitle("Account deactivated")
                        .setMessage("Your account is deactivated. Sign in again after Backoffice reactivates it.")
                        .setCancelable(false)
                        .setPositiveButton("OK") { _, _ ->
                            openLogin()
                        }
                        .show()
                } else {
                    val rawError = response.errorBody()?.string()
                    dialogError.text = parseErrorMessage(
                        rawError,
                        response.code(),
                        "Unable to deactivate your account."
                    )
                    dialogError.visibility = View.VISIBLE
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Prosumer deactivation failed", exception)
                dialogError.text = "Unable to connect to the server."
                dialogError.visibility = View.VISIBLE
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true
            }
        }
    }

    private fun parseErrorMessage(rawJson: String?, responseCode: Int, fallbackMessage: String): String {
        // Read the backend message. 401 and 403 have fixed wording when the body has none.
        if (!rawJson.isNullOrBlank()) {
            try {
                val message = JSONObject(rawJson).optString("message", "")
                if (message.isNotBlank()) {
                    return message
                }
            } catch (exception: Exception) {
                Log.e("SolarGridAPI", "Could not read prosumer profile error", exception)
            }
        }
        return when (responseCode) {
            401 -> "Session expired. Please log in again."
            403 -> "You can only access your own prosumer account."
            404 -> "Prosumer not found."
            else -> fallbackMessage
        }
    }

    private fun handleSessionExpired() {
        // Drop an invalid token and return to login.
        sessionManager.clearSession()
        openLogin()
    }

    private fun openLogin() {
        // Leave the profile and show the existing login screen.
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun setFormEnabled(enabled: Boolean) {
        // Lock the form while loading or when the account is deactivated.
        fullNameInput.isEnabled = enabled
        emailInput.isEnabled = enabled
        phoneInput.isEnabled = enabled
        addressInput.isEnabled = enabled
        saveButton.isEnabled = enabled
        changePasswordButton.isEnabled = enabled
    }

    private fun showLoading(isLoading: Boolean) {
        // Toggle the progress indicator.
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }

    private fun showError(message: String) {
        // Display the error banner.
        errorText.text = message
        errorText.visibility = View.VISIBLE
    }

    private fun hideError() {
        // Hide the error banner.
        errorText.text = ""
        errorText.visibility = View.GONE
        retryText.visibility = View.GONE
    }

    private fun showSuccess(title: String, message: String) {
        // Confirm a completed profile action.
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }
}
