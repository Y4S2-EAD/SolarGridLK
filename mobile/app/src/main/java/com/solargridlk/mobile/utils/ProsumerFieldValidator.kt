/*
 * File: ProsumerFieldValidator.kt
 * Description: Client-side prosumer field checks. The NIC, email, and phone
 * rules match the web registration form.
 */
package com.solargridlk.mobile.utils

object ProsumerFieldValidator {

    // Old NIC: 123456789V. New NIC: 123456789012.
    private val sriLankanNicPattern = Regex("^(\\d{9}[Vv]|\\d{12})$")
    private val sriLankanMobilePattern = Regex("^0\\d{9}$")
    private val emailPattern = Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

    fun registrationError(
        nic: String,
        fullName: String,
        email: String,
        phoneNumber: String,
        password: String,
        confirmPassword: String
    ): String? {
        // Reject the form before the API call when a field breaks the shared rules.
        if (nic.isEmpty()) {
            return "NIC is required."
        }

        if (!sriLankanNicPattern.matches(nic)) {
            return "Enter a valid Sri Lankan NIC. Use 9 digits followed by V, or 12 digits."
        }

        if (fullName.isEmpty()) {
            return "Full name is required."
        }

        if (email.isNotEmpty() && !emailPattern.matches(email)) {
            return "Enter a valid email address, such as name@gmail.com."
        }

        if (phoneNumber.isNotEmpty() && !sriLankanMobilePattern.matches(phoneNumber)) {
            return "Enter a 10-digit mobile number starting with 0."
        }

        if (password.isEmpty()) {
            return "Password is required."
        }

        if (confirmPassword.isEmpty()) {
            return "Please confirm your password."
        }

        if (password != confirmPassword) {
            return "Passwords do not match."
        }

        return null
    }

    fun profileError(
        fullName: String,
        email: String,
        phoneNumber: String
    ): String? {
        // Match the web profile rules. Email and phone may be left blank.
        if (fullName.isEmpty()) {
            return "Full name is required."
        }

        if (email.isNotEmpty() && !emailPattern.matches(email)) {
            return "Enter a valid email address, such as name@gmail.com."
        }

        if (phoneNumber.isNotEmpty() && !sriLankanMobilePattern.matches(phoneNumber)) {
            return "Enter a 10-digit mobile number starting with 0."
        }

        return null
    }

    fun passwordChangeError(
        newPassword: String,
        confirmPassword: String
    ): String? {
        // Registration only requires a non-empty password, plus a matching confirmation.
        if (newPassword.isEmpty()) {
            return "Password is required."
        }

        if (confirmPassword.isEmpty()) {
            return "Please confirm your password."
        }

        if (newPassword != confirmPassword) {
            return "Passwords do not match."
        }

        return null
    }
}
