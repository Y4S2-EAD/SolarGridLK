import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProsumer, getProsumerByNic, reactivateProsumer } from "../api/prosumerApi";
import ProsumerDeactivatePanel from "./ProsumerDeactivatePanel";
import {
    inputClassName,
    profileValidationMessage,
    sriLankanNicPattern,
} from "./prosumerValidation";

const emptyForm = {
    nic: "",
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    password: "",
};

const actionButtonClass =
    "text-xs text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-2.5 py-1.5 transition-colors";

const ProsumerManagementPage = () => {
    const navigate = useNavigate();
    const submittingRef = useRef(false);
    const lookupRef = useRef(false);
    const nicFieldRef = useRef(null);

    const [nicInput, setNicInput] = useState("");
    const [searchedNic, setSearchedNic] = useState("");
    const [prosumer, setProsumer] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState(emptyForm);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);

    const lookupProsumer = async (nic) => {
        const trimmedNic = nic.trim();

        if (lookupRef.current) {
            return;
        }

        if (!trimmedNic) {
            setError("Enter a NIC to search for a prosumer.");
            return;
        }

        lookupRef.current = true;

        try {
            setLoading(true);
            setError("");
            setNotFound(false);
            setProsumer(null);

            if (trimmedNic !== searchedNic) {
                setSuccess("");
            }

            const response = await getProsumerByNic(trimmedNic);
            setSearchedNic(trimmedNic);

            if (response.success && response.data) {
                setProsumer(response.data);
            } else {
                setProsumer(null);
                setNotFound(true);
            }
        } catch (requestError) {
            console.error("Failed to load prosumer:", requestError);
            setSearchedNic(trimmedNic);
            setProsumer(null);

            const status = requestError.response?.status;

            if (status === 404) {
                setNotFound(true);
                setError("");
            } else if (status === 401) {
                setNotFound(false);
                setError("Your session has expired. Please log in again.");
            } else if (status === 403) {
                setNotFound(false);
                setError("You do not have permission to view prosumers.");
            } else {
                setNotFound(false);
                setError("The search could not be completed. Check the NIC and try again.");
            }
        } finally {
            lookupRef.current = false;
            setLoading(false);
        }
    };

    const handleLookup = (event) => {
        event.preventDefault();
        lookupProsumer(nicInput);
    };

    const handleRefresh = () => {
        if (!searchedNic || loading || saving) {
            return;
        }

        lookupProsumer(searchedNic);
    };

    const clearSearch = () => {
        if (loading || saving || statusSaving) {
            return;
        }

        setNicInput("");
        setSearchedNic("");
        setProsumer(null);
        setNotFound(false);
        setError("");
        setSuccess("");
        nicFieldRef.current?.focus();
    };

    const trySearchAgain = () => {
        nicFieldRef.current?.focus();
        nicFieldRef.current?.select();
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const closeCreateForm = () => {
        if (saving) {
            return;
        }

        setFormData(emptyForm);
        setError("");
        setIsFormOpen(false);
    };

    const openCreateForm = () => {
        if (saving) {
            return;
        }

        setFormData(emptyForm);
        setError("");
        setSuccess("");
        setIsFormOpen(true);
    };

    const handleCreate = async (event) => {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        const payload = {
            nic: formData.nic.trim().toUpperCase(),
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            phoneNumber: formData.phoneNumber.trim(),
            address: formData.address.trim(),
            password: formData.password,
        };

        if (!payload.nic) {
            setError("NIC is required.");
            return;
        }

        if (!sriLankanNicPattern.test(payload.nic)) {
            setError("Enter a valid Sri Lankan NIC. Use 9 digits followed by V, or 12 digits.");
            return;
        }

        const profileError = profileValidationMessage(payload);

        if (profileError) {
            setError(profileError);
            return;
        }

        if (!payload.password.trim()) {
            setError("Password is required.");
            return;
        }

        submittingRef.current = true;
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await createProsumer(payload);

            if (!response.success || !response.data) {
                setError(response.message || "Unable to create prosumer.");
                return;
            }

            const createdNic = response.data.nic || payload.nic;

            setSuccess("Prosumer created successfully.");
            setFormData(emptyForm);
            setIsFormOpen(false);
            setNicInput(createdNic);
            setSearchedNic(createdNic);
            setProsumer(response.data);
            setNotFound(false);

            // Reload the created account the same way a list refresh would.
            try {
                const refreshed = await getProsumerByNic(createdNic);

                if (refreshed.success && refreshed.data) {
                    setProsumer(refreshed.data);
                    setSearchedNic(refreshed.data.nic || createdNic);
                }
            } catch (refreshError) {
                console.error("Created prosumer could not be reloaded:", refreshError);
            }
        } catch (requestError) {
            console.error("Create prosumer failed:", requestError);

            const status = requestError.response?.status;
            const data = requestError.response?.data;
            const validationMessage = data?.errors
                ? Object.values(data.errors).flat().join(" ")
                : "";

            if (status === 401) {
                setError("Your session has expired. Please log in again.");
            } else if (status === 403) {
                setError("You do not have permission to create prosumers.");
            } else {
                setError(
                    data?.message ||
                        validationMessage ||
                        "Unable to create the prosumer."
                );
            }
        } finally {
            submittingRef.current = false;
            setSaving(false);
        }
    };

    const isActive = prosumer?.status === "Active";
    const isDeactivated = prosumer?.status === "Deactivated";

    const refreshLoadedProsumer = async (data) => {
        setProsumer(data);
        setNotFound(false);

        if (data?.nic) {
            setSearchedNic(data.nic);
            setNicInput(data.nic);
        }

        try {
            const refreshed = await getProsumerByNic(data.nic);

            if (refreshed.success && refreshed.data) {
                setProsumer(refreshed.data);
                setSearchedNic(refreshed.data.nic || data.nic);
            }
        } catch (refreshError) {
            console.error("Prosumer could not be reloaded:", refreshError);
        }
    };

    const handleDeactivated = async (data) => {
        setIsDeactivateOpen(false);
        setError("");
        setSuccess("Prosumer deactivated successfully.");
        await refreshLoadedProsumer(data);
    };

    const handleReactivate = async () => {
        if (!prosumer || !isDeactivated || statusSaving || saving) {
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to reactivate "${prosumer.nic}"?`
        );

        if (!confirmed) {
            return;
        }

        setStatusSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await reactivateProsumer(prosumer.nic);

            if (!response.success || !response.data) {
                setError(response.message || "Unable to reactivate prosumer.");
                return;
            }

            setSuccess("Prosumer reactivated successfully.");
            await refreshLoadedProsumer(response.data);
        } catch (requestError) {
            console.error("Reactivate prosumer failed:", requestError);

            const status = requestError.response?.status;
            const data = requestError.response?.data;

            if (status === 401) {
                setError("Your session has expired. Please log in again.");
            } else if (status === 403) {
                setError("You do not have permission to reactivate prosumers.");
            } else {
                setError(data?.message || "Unable to reactivate the prosumer.");
            }
        } finally {
            setStatusSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-grotesk text-xl font-semibold">Prosumer Management</h2>
                    <p className="text-sm text-[#7c8ba6] mt-1 max-w-xl">
                        Search and manage registered prosumer accounts using their NIC.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreateForm}
                    disabled={saving}
                    className="flex items-center gap-1.5 shrink-0 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    Create Prosumer
                </button>
            </div>

            {success && (
                <div className="bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 px-4 py-2.5 rounded-md text-sm flex items-center justify-between">
                    {success}
                    <button
                        type="button"
                        onClick={() => setSuccess("")}
                        className="text-emerald-300/70 hover:text-emerald-300"
                    >
                        ✕
                    </button>
                </div>
            )}

            {error && !isFormOpen && (
                <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-4 py-2.5 rounded-md text-sm flex items-center justify-between">
                    {error}
                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="text-red-300/70 hover:text-red-300"
                    >
                        ✕
                    </button>
                </div>
            )}

            <form
                onSubmit={handleLookup}
                className="bg-[#101a30] border border-[#1c2942] rounded-md px-5 py-4"
            >
                <label htmlFor="prosumer-nic-search" className="block text-sm text-[#a7b2c7] mb-1.5">
                    NIC
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                        id="prosumer-nic-search"
                        ref={nicFieldRef}
                        type="search"
                        value={nicInput}
                        onChange={(event) => setNicInput(event.target.value)}
                        placeholder="Enter NIC"
                        disabled={loading}
                        autoComplete="off"
                        className="w-full min-w-0 sm:max-w-sm rounded-md border border-[#2a3a56] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] placeholder:text-[#5c6b88] focus:border-[#f4a93b] focus:outline-none disabled:opacity-60"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                </svg>
                            )}
                            {loading ? "Searching…" : "Search Prosumer"}
                        </button>
                        {(searchedNic || prosumer || notFound) && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                disabled={loading || saving || statusSaving}
                                className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3 py-2 transition-colors"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                </div>
                <p className="mt-2 text-xs text-[#7c8ba6]">
                    Use the NIC registered with the prosumer account.
                </p>
            </form>

            {loading && (
                <div
                    className="bg-[#101a30] border border-[#1c2942] rounded-md px-5 py-10 text-center"
                    aria-live="polite"
                >
                    <p className="text-sm text-[#a7b2c7]">Searching for prosumer...</p>
                </div>
            )}

            {!loading && !prosumer && !searchedNic && (
                <div className="bg-[#101a30] border border-[#1c2942] rounded-md px-5 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#2a3a56] text-[#f4a93b]">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                            <circle cx="11" cy="11" r="6" />
                            <path d="M16 16l4 4" strokeLinecap="round" />
                            <circle cx="11" cy="10" r="2" />
                        </svg>
                    </div>
                    <h3 className="mt-4 font-grotesk text-base font-semibold">Find a Prosumer</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-[#7c8ba6]">
                        Enter a NIC above to view and manage the corresponding prosumer account.
                    </p>
                </div>
            )}

            {!loading && !prosumer && notFound && (
                <div className="bg-[#101a30] border border-[#1c2942] rounded-md px-5 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#2a3a56] text-[#7c8ba6]">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                            <circle cx="11" cy="11" r="6" />
                            <path d="M16 16l4 4" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h3 className="mt-4 font-grotesk text-base font-semibold">Prosumer not found</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-[#7c8ba6]">
                        No account was found for this NIC. Check the NIC and try again.
                    </p>
                    <button
                        type="button"
                        onClick={trySearchAgain}
                        className="mt-5 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {!loading && prosumer && (
                <section className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                    <div className="flex flex-col gap-3 px-5 py-4 border-b border-[#1c2942] sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="font-grotesk text-sm font-semibold">Prosumer Profile</h3>
                            <p className="mt-1 text-xs text-[#7c8ba6]">
                                Account details for this NIC.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/backoffice/prosumers/${encodeURIComponent(prosumer.nic)}`
                                    )
                                }
                                className={actionButtonClass}
                            >
                                View
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/backoffice/prosumers/${encodeURIComponent(prosumer.nic)}`,
                                        { state: { openEdit: true } }
                                    )
                                }
                                disabled={!isActive}
                                title={
                                    isActive
                                        ? undefined
                                        : "A deactivated account cannot be updated."
                                }
                                className={`${actionButtonClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                Edit
                            </button>
                            {isActive && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError("");
                                        setSuccess("");
                                        setIsDeactivateOpen(true);
                                    }}
                                    disabled={statusSaving || saving}
                                    className="text-xs text-red-300 hover:text-red-200 border border-red-900/40 hover:border-red-700/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-2.5 py-1.5 transition-colors"
                                >
                                    Deactivate
                                </button>
                            )}
                            {isDeactivated && (
                                <button
                                    type="button"
                                    onClick={handleReactivate}
                                    disabled={statusSaving || saving}
                                    className="text-xs text-emerald-300 hover:text-emerald-200 border border-emerald-900/40 hover:border-emerald-700/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-2.5 py-1.5 transition-colors"
                                >
                                    {statusSaving ? "Saving…" : "Reactivate"}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={loading || saving || statusSaving}
                                className={actionButtonClass}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                    <dl className="divide-y divide-[#1c2942]">
                        {[
                            ["NIC", prosumer.nic],
                            ["Full Name", prosumer.fullName],
                            ["Email", prosumer.email],
                            ["Phone", prosumer.phoneNumber],
                            ["Address", prosumer.address],
                        ].map(([label, value]) => (
                            <div
                                key={label}
                                className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[180px_1fr] sm:gap-4"
                            >
                                <dt className="text-xs text-[#7c8ba6]">{label}</dt>
                                <dd className="text-sm break-words">{value || "—"}</dd>
                            </div>
                        ))}
                        <div className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                            <dt className="text-xs text-[#7c8ba6]">Status</dt>
                            <dd>
                                <span
                                    className={`inline-flex items-center gap-1.5 text-xs ${
                                        isActive ? "text-emerald-400" : "text-[#5c6b88]"
                                    }`}
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            isActive ? "bg-emerald-400" : "bg-[#5c6b88]"
                                        }`}
                                    />
                                    {prosumer.status}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </section>
            )}

            {isFormOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={saving ? undefined : closeCreateForm}
                    />
                    <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0e1730] border-l border-[#1c2942] z-50 flex flex-col">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2942]">
                            <h2 className="font-grotesk text-lg font-semibold">Create prosumer</h2>
                            <button
                                type="button"
                                onClick={closeCreateForm}
                                disabled={saving}
                                className="text-[#7c8ba6] hover:text-[#e7ecf5] disabled:opacity-40 transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <form
                            id="create-prosumer-form"
                            onSubmit={handleCreate}
                            className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5"
                        >
                            {error && (
                                <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-3.5 py-2.5 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="nic" className="block text-sm text-[#a7b2c7] mb-1.5">
                                    NIC
                                </label>
                                <input
                                    id="nic"
                                    name="nic"
                                    type="text"
                                    value={formData.nic}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    required
                                    maxLength={12}
                                    placeholder="123456789V or 123456789012"
                                    className={inputClassName}
                                />
                                <p className="mt-1.5 text-xs text-[#7c8ba6]">
                                    Old NIC: 9 digits and V. New NIC: 12 digits.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="fullName" className="block text-sm text-[#a7b2c7] mb-1.5">
                                    Full name
                                </label>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    required
                                    className={inputClassName}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm text-[#a7b2c7] mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    inputMode="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    placeholder="name@gmail.com"
                                    className={inputClassName}
                                />
                            </div>

                            <div>
                                <label htmlFor="phoneNumber" className="block text-sm text-[#a7b2c7] mb-1.5">
                                    Phone
                                </label>
                                <input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    type="tel"
                                    inputMode="numeric"
                                    value={formData.phoneNumber}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    maxLength={10}
                                    placeholder="0771234567"
                                    className={inputClassName}
                                />
                                <p className="mt-1.5 text-xs text-[#7c8ba6]">
                                    10 digits starting with 0.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="address" className="block text-sm text-[#a7b2c7] mb-1.5">
                                    Address
                                </label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    className={inputClassName}
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm text-[#a7b2c7] mb-1.5">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    required
                                    autoComplete="new-password"
                                    className={inputClassName}
                                />
                            </div>
                        </form>

                        <div className="flex items-center gap-3 px-6 py-5 border-t border-[#1c2942]">
                            <button
                                type="button"
                                onClick={closeCreateForm}
                                disabled={saving}
                                className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-4 py-2.5 transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="create-prosumer-form"
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] font-semibold text-sm rounded-md transition-colors"
                            >
                                {saving && (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                    </svg>
                                )}
                                {saving ? "Saving…" : "Create prosumer"}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <ProsumerDeactivatePanel
                key={isDeactivateOpen ? prosumer?.nic : "closed"}
                nic={prosumer?.nic || ""}
                isOpen={isDeactivateOpen && Boolean(prosumer)}
                onClose={() => setIsDeactivateOpen(false)}
                onCompleted={handleDeactivated}
            />
        </div>
    );
};

export default ProsumerManagementPage;
