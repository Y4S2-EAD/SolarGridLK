import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getProsumerByNic, updateProsumer } from "../api/prosumerApi";
import { inputClassName, profileValidationMessage } from "./prosumerValidation";

const emptyForm = {
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    password: "",
};

const displayValue = (value) => (value ? value : "—");

const ProsumerDetailsPage = () => {
    const { nic } = useParams();
    const location = useLocation();
    const submittingRef = useRef(false);
    const editRequested = useRef(Boolean(location.state?.openEdit));

    const [prosumer, setProsumer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState(emptyForm);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadProsumer = async () => {
            const trimmedNic = (nic || "").trim();

            if (!trimmedNic) {
                setProsumer(null);
                setNotFound(true);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");
                setNotFound(false);

                const response = await getProsumerByNic(trimmedNic);

                if (cancelled) {
                    return;
                }

                if (response.success && response.data) {
                    setProsumer(response.data);
                } else {
                    setProsumer(null);
                    setNotFound(true);
                }
            } catch (requestError) {
                console.error("Failed to load prosumer:", requestError);

                if (cancelled) {
                    return;
                }

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
                    setError(
                        requestError.response?.data?.message ||
                            "Unable to load the prosumer."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProsumer();

        return () => {
            cancelled = true;
        };
    }, [nic]);

    useEffect(() => {
        if (!prosumer || !editRequested.current) {
            return;
        }

        editRequested.current = false;

        if (prosumer.status !== "Active") {
            setError("Cannot update a deactivated prosumer account.");
            return;
        }

        setFormData({
            fullName: prosumer.fullName || "",
            email: prosumer.email || "",
            phoneNumber: prosumer.phoneNumber || "",
            address: prosumer.address || "",
            password: "",
        });
        setIsFormOpen(true);
    }, [prosumer]);

    const isActive = prosumer?.status === "Active";

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const closeEditForm = () => {
        if (saving) {
            return;
        }

        setFormData(emptyForm);
        setError("");
        setIsFormOpen(false);
    };

    const openEditForm = () => {
        if (!prosumer || saving || !isActive) {
            return;
        }

        setFormData({
            fullName: prosumer.fullName || "",
            email: prosumer.email || "",
            phoneNumber: prosumer.phoneNumber || "",
            address: prosumer.address || "",
            password: "",
        });
        setError("");
        setSuccess("");
        setIsFormOpen(true);
    };

    const handleUpdate = async (event) => {
        event.preventDefault();

        if (submittingRef.current || !prosumer) {
            return;
        }

        const profileError = profileValidationMessage(formData);

        if (profileError) {
            setError(profileError);
            return;
        }

        const payload = {
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            phoneNumber: formData.phoneNumber.trim(),
            address: formData.address.trim(),
        };

        if (formData.password.trim()) {
            payload.password = formData.password;
        }

        submittingRef.current = true;
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await updateProsumer(prosumer.nic, payload);

            if (!response.success || !response.data) {
                setError(response.message || "Unable to update prosumer.");
                return;
            }

            setSuccess("Prosumer updated successfully.");
            setFormData(emptyForm);
            setIsFormOpen(false);
            setProsumer(response.data);

            try {
                const refreshed = await getProsumerByNic(response.data.nic || prosumer.nic);

                if (refreshed.success && refreshed.data) {
                    setProsumer(refreshed.data);
                }
            } catch (refreshError) {
                console.error("Updated prosumer could not be reloaded:", refreshError);
            }
        } catch (requestError) {
            console.error("Update prosumer failed:", requestError);

            const status = requestError.response?.status;
            const data = requestError.response?.data;
            const validationMessage = data?.errors
                ? Object.values(data.errors).flat().join(" ")
                : "";

            if (status === 401) {
                setError("Your session has expired. Please log in again.");
            } else if (status === 403) {
                setError("You do not have permission to update prosumers.");
            } else if (status === 404) {
                setError(data?.message || "Prosumer not found.");
            } else {
                setError(
                    data?.message ||
                        validationMessage ||
                        "Unable to update the prosumer."
                );
            }
        } finally {
            submittingRef.current = false;
            setSaving(false);
        }
    };

    const detailRows = prosumer
        ? [
              { label: "NIC", value: prosumer.nic },
              { label: "Full name", value: displayValue(prosumer.fullName) },
              { label: "Email", value: displayValue(prosumer.email) },
              { label: "Phone", value: displayValue(prosumer.phoneNumber) },
              { label: "Address", value: displayValue(prosumer.address) },
          ]
        : [];

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link
                        to="/backoffice/prosumers"
                        className="text-xs text-[#f4a93b] hover:text-[#ffbb52] transition-colors"
                    >
                        Back to prosumers
                    </Link>
                    <h2 className="font-grotesk text-xl font-semibold mt-2">Prosumer details</h2>
                    <p className="text-sm text-[#7c8ba6] mt-1">
                        Backoffice users view and update a prosumer account.
                    </p>
                </div>

                {prosumer && (
                    <button
                        type="button"
                        onClick={openEditForm}
                        disabled={!isActive || saving}
                        title={
                            isActive
                                ? undefined
                                : "A deactivated account cannot be updated."
                        }
                        className="shrink-0 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                    >
                        Edit
                    </button>
                )}
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

            <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1c2942]">
                    <h3 className="font-grotesk text-sm font-semibold">Account</h3>
                    <p className="mt-1 text-xs text-[#7c8ba6]">
                        {loading ? "Loading…" : prosumer ? prosumer.nic : "No account loaded"}
                    </p>
                </div>

                {loading && (
                    <div className="px-5 py-6 space-y-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-3.5 rounded bg-[#182338] animate-pulse"
                                style={{ width: `${46 + index * 8}%` }}
                            />
                        ))}
                    </div>
                )}

                {!loading && notFound && (
                    <div className="px-5 py-12 text-center text-[#7c8ba6]">
                        <p className="font-medium text-[#a7b2c7]">No prosumer found</p>
                        <p className="mt-1 text-xs">No account matches NIC {nic}.</p>
                    </div>
                )}

                {!loading && !prosumer && !notFound && (
                    <div className="px-5 py-12 text-center text-[#7c8ba6]">
                        The prosumer could not be loaded.
                    </div>
                )}

                {!loading && prosumer && (
                    <dl className="divide-y divide-[#1c2942]">
                        {detailRows.map((row) => (
                            <div
                                key={row.label}
                                className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[140px_1fr] sm:gap-4"
                            >
                                <dt className="text-xs text-[#7c8ba6]">{row.label}</dt>
                                <dd className="text-sm">{row.value}</dd>
                            </div>
                        ))}
                        <div className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
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
                )}
            </div>

            {isFormOpen && prosumer && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={saving ? undefined : closeEditForm}
                    />
                    <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0e1730] border-l border-[#1c2942] z-50 flex flex-col">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2942]">
                            <h2 className="font-grotesk text-lg font-semibold">Edit prosumer</h2>
                            <button
                                type="button"
                                onClick={closeEditForm}
                                disabled={saving}
                                className="text-[#7c8ba6] hover:text-[#e7ecf5] disabled:opacity-40 transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <form
                            id="edit-prosumer-form"
                            onSubmit={handleUpdate}
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
                                    value={prosumer.nic}
                                    readOnly
                                    disabled
                                    className={inputClassName}
                                />
                                <p className="mt-1.5 text-xs text-[#7c8ba6]">
                                    NIC is the account key and cannot be changed.
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
                                    placeholder="Leave blank to keep current password"
                                    autoComplete="new-password"
                                    className={inputClassName}
                                />
                            </div>
                        </form>

                        <div className="flex items-center gap-3 px-6 py-5 border-t border-[#1c2942]">
                            <button
                                type="button"
                                onClick={closeEditForm}
                                disabled={saving}
                                className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-4 py-2.5 transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="edit-prosumer-form"
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] font-semibold text-sm rounded-md transition-colors"
                            >
                                {saving && (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                    </svg>
                                )}
                                {saving ? "Saving…" : "Update prosumer"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProsumerDetailsPage;
