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
    private lateinit var roleText: TextView
    private lateinit var logoutButton: Button
    private lateinit var scanVerifyButton: Button
    private lateinit var microgridNodesButton: Button
    private lateinit var nearbyNodesButton: Button
    private lateinit var checkReservationsButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_grid_operator_home)

        sessionManager = SessionManager(this)
        if (!sessionManager.isLoggedIn() || sessionManager.getRole() != "GridOperator") {
            openLogin()
            return
        }

        initializeViews()
        displayUserInformation()
        setupButtons()
    }

    private fun initializeViews() {
        welcomeText = findViewById(R.id.welcomeText)
        roleText = findViewById(R.id.roleText)
        logoutButton = findViewById(R.id.logoutButton)
        scanVerifyButton = findViewById(R.id.scanVerifyButton)
        microgridNodesButton = findViewById(R.id.microgridNodesButton)
        nearbyNodesButton = findViewById(R.id.nearbyNodesButton)
        checkReservationsButton = findViewById(R.id.checkReservationsButton)
    }

    private fun displayUserInformation() {
        val fullName = sessionManager.getFullName()
        val username = sessionManager.getUsername()
        welcomeText.text = "Welcome, ${fullName ?: "Grid Operator"}"
        roleText.text = "Role: Grid Operator • ID: ${username ?: "-"}"
    }

    private fun setupButtons() {
        checkReservationsButton.setOnClickListener {
            startActivity(Intent(this, GridOperatorReservationsActivity::class.java))
        }

        scanVerifyButton.setOnClickListener {
            startActivity(Intent(this, QrScanActivity::class.java))
        }

        nearbyNodesButton.setOnClickListener {
            startActivity(Intent(this, NodesMapActivity::class.java))
        }

        microgridNodesButton.setOnClickListener {
            startActivity(Intent(this, NodeOperationsActivity::class.java))
        }

        logoutButton.setOnClickListener {
            sessionManager.clearSession()
            openLogin()
        }
    }

    private fun openLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
