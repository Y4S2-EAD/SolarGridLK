export const inputClassName =
    "w-full box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

// Old NIC: 123456789V. New NIC: 123456789012.
export const sriLankanNicPattern = /^(\d{9}[Vv]|\d{12})$/;
export const sriLankanMobilePattern = /^0\d{9}$/;
export const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const profileValidationMessage = ({ fullName, email, phoneNumber }) => {
    if (!fullName.trim()) {
        return "Full name is required.";
    }

    if (email.trim() && !emailPattern.test(email.trim())) {
        return "Enter a valid email address, such as name@gmail.com.";
    }

    if (phoneNumber.trim() && !sriLankanMobilePattern.test(phoneNumber.trim())) {
        return "Enter a 10-digit mobile number starting with 0.";
    }

    return "";
};
