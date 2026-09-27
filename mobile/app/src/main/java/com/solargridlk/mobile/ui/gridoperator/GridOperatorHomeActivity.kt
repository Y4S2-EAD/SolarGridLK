package com.solargridlk.mobile.ui.gridoperator

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.solargridlk.mobile.R
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.utils.SessionManager

class GridOperatorHomeActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

    private lateinit var welcomeText: TextView
    private lateinit var logoutButton: Button
    private lateinit var scanVerifyButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        // Initialize the Grid Operator home screen.
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_grid_operator_home)

        sessionManager = SessionManager(this)

        initializeViews()
        displayUserInformation()
        setupLogoutButton()
        setupScanButton()

        findViewById<Button>(R.id.nearbyNodesButton).setOnClickListener {
            startActivity(Intent(this, NodesMapActivity::class.java))
        }
    }

    private fun initializeViews() {
        // Connect the activity variables with the XML controls.
        welcomeText = findViewById(R.id.welcomeText)
        logoutButton = findViewById(R.id.logoutButton)
        scanVerifyButton = findViewById(R.id.scanVerifyButton)
    }

    private fun displayUserInformation() {
        // Display the authenticated Grid Operator's name.
        val fullName = sessionManager.getFullName()

        welcomeText.text =
            "Welcome, ${fullName ?: "Grid Operator"}"
    }

    private fun setupScanButton() {
        // Open the QR scan & verify screen.
        scanVerifyButton.setOnClickListener {
            startActivity(Intent(this, QrScanActivity::class.java))
        }
    }

    private fun setupLogoutButton() {
        // Clear the session and return to the login screen.
        logoutButton.setOnClickListener {
            sessionManager.clearSession()

            val intent = Intent(
                this,
                LoginActivity::class.java
            )

            intent.flags =
                Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TASK

            startActivity(intent)
            finish()
        }
    }
}