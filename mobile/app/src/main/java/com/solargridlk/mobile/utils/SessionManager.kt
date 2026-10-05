package com.solargridlk.mobile.utils

import android.content.Context

class SessionManager(context: Context) {

    private val preferences = context.getSharedPreferences(
        "solar_grid_session",
        Context.MODE_PRIVATE
    )

    fun saveSession(
        token: String,
        username: String,
        role: String,
        fullName: String,
        expiresAt: String
    ) {
        // Save the authenticated user session locally using token key solarGridToken.
        preferences.edit()
            .putString("solarGridToken", token)
            .putString("token", token)
            .putString("username", username)
            .putString("role", role)
            .putString("fullName", fullName)
            .putString("expiresAt", expiresAt)
            .putBoolean("isLoggedIn", true)
            .apply()
    }

    fun getToken(): String? {
        // Return the stored JWT token.
        return preferences.getString("solarGridToken", null)
            ?: preferences.getString("token", null)
    }

    fun getUsername(): String? {
        // Return the stored username / staff ID.
        return preferences.getString("username", null)
    }

    fun getRole(): String? {
        // Return the stored user role.
        return preferences.getString("role", null)
    }

    fun getFullName(): String? {
        // Return the stored user's full name.
        return preferences.getString("fullName", null)
    }

    fun updateFullName(fullName: String) {
        // Keep the signed-in display name in step with a profile save.
        preferences.edit()
            .putString("fullName", fullName)
            .apply()
    }

    fun getExpiresAt(): String? {
        // Return the stored token expiration time.
        return preferences.getString("expiresAt", null)
    }

    fun isLoggedIn(): Boolean {
        // Check whether an authenticated session exists.
        return preferences.getBoolean("isLoggedIn", false)
    }

    fun clearSession() {
        // Remove all locally stored authentication information.
        preferences.edit().clear().apply()
    }
}