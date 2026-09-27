package com.solargridlk.mobile

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.solargridlk.mobile.ui.auth.LoginActivity
import com.solargridlk.mobile.ui.backoffice.BackofficeHomeActivity
import com.solargridlk.mobile.ui.gridoperator.GridOperatorHomeActivity
import com.solargridlk.mobile.utils.SessionManager

class MainActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        // Check the existing session before routing the user.
        super.onCreate(savedInstanceState)

        sessionManager = SessionManager(this)

        routeUser()
    }

    private fun routeUser() {
        // Route the user according to the saved authentication session.
        if (!sessionManager.isLoggedIn()) {
            openLogin()
            return
        }

        when (sessionManager.getRole()) {

            "Backoffice" -> {
                openBackofficeHome()
            }

            "GridOperator" -> {
                openGridOperatorHome()
            }

            else -> {
                sessionManager.clearSession()
                openLogin()
            }
        }
    }

    private fun openLogin() {
        // Open the login screen when no valid session exists.
        val intent = Intent(
            this,
            LoginActivity::class.java
        )

        startActivity(intent)
        finish()
    }

    private fun openBackofficeHome() {
        // Open the Backoffice home screen for a Backoffice user.
        val intent = Intent(
            this,
            BackofficeHomeActivity::class.java
        )

        startActivity(intent)
        finish()
    }

    private fun openGridOperatorHome() {
        // Open the Grid Operator home screen for a Grid Operator user.
        val intent = Intent(
            this,
            GridOperatorHomeActivity::class.java
        )

        startActivity(intent)
        finish()
    }
}