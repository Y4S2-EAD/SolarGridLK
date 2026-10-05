import { useRef, useState } from "react";
import { requestProsumerDeactivation } from "../api/prosumerApi";
import { inputClassName } from "./prosumerValidation";

const messageFromError = (requestError, fallback) => {
    const status = requestError.response?.status;
    const data = requestError.response?.data;

    if (status === 401) {
        return "Your session has expired. Please log in again.";
    }

    if (status === 403) {
        return "You do not have permission to deactivate this prosumer.";
    }

    if (status === 404) {
        return data?.message || "Prosumer not found.";
    }

    return data?.message || fallback;
};

const ProsumerDeactivatePanel = ({ nic, isOpen, onClose, onCompleted }) => {
    const submittingRef = useRef(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    if (!isOpen) {
        return null;
    }

    const closePanel = () => {
        if (saving) {
            return;
        }

        onClose();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        if (!password.trim()) {
            setError("Password is required.");
            return;
        }

        submittingRef.current = true;
        setSaving(true);
        setError("");

        try {
            const response = await requestProsumerDeactivation(nic, password);

            if (!response.success || !response.data) {
                setError(response.message || "Unable to deactivate prosumer.");
                return;
            }

            setPassword("");
            onCompleted(response.data);
        } catch (requestError) {
            console.error("Deactivate prosumer failed:", requestError);
            setError(
                messageFromError(requestError, "Unable to deactivate the prosumer.")
            );
        } finally {
            submittingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={closePanel}
            />
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0e1730] border-l border-[#1c2942] z-50 flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2942]">
                    <h2 className="font-grotesk text-lg font-semibold">Deactivate prosumer</h2>
                    <button
                        type="button"
                        onClick={closePanel}
                        disabled={saving}
                        className="text-[#7c8ba6] hover:text-[#e7ecf5] disabled:opacity-40 transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <form
                    id="deactivate-prosumer-form"
                    onSubmit={handleSubmit}
                    className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5"
                >
                    <p className="text-sm text-[#a7b2c7]">
                        Deactivate account {nic}. This uses the prosumer account password to confirm the request.
                    </p>

                    {error && (
                        <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-3.5 py-2.5 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="deactivationPassword" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Prosumer password
                        </label>
                        <input
                            id="deactivationPassword"
                            name="deactivationPassword"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            disabled={saving}
                            required
                            autoComplete="off"
                            className={inputClassName}
                        />
                    </div>
                </form>

                <div className="flex items-center gap-3 px-6 py-5 border-t border-[#1c2942]">
                    <button
                        type="button"
                        onClick={closePanel}
                        disabled={saving}
                        className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-4 py-2.5 transition-colors disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="deactivate-prosumer-form"
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] font-semibold text-sm rounded-md transition-colors"
                    >
                        {saving && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                            </svg>
                        )}
                        {saving ? "Saving…" : "Deactivate"}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ProsumerDeactivatePanel;
