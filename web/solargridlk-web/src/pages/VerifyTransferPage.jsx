import { useState } from "react";
import { verifyQrToken } from "../api/qrApi";

const statusStyles = {
    Completed: "text-emerald-400 bg-emerald-400/10",
    Approved: "text-sky-400 bg-sky-400/10",
};

const DetailRow = ({ label, value }) => (
    <div className="flex items-center justify-between px-5 py-3">
        <dt className="text-xs text-[#7c8ba6]">{label}</dt>
        <dd className="text-sm text-[#e7ecf5]">{value || "—"}</dd>
    </div>
);

const VerifyTransferPage = () => {
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!token.trim()) {
            setError("Enter a QR token to verify.");
            return;
        }
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const response = await verifyQrToken(token.trim());
            setResult(response.data);
        } catch (err) {
            setError(err?.response?.data?.message ?? "Verification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setToken("");
        setResult(null);
        setError("");
    };

    return (
        <div className="max-w-xl">
            <p className="text-sm text-[#7c8ba6] mb-5">
                Scan or enter a booking QR token to finalize the energy transfer.
            </p>

            <form onSubmit={handleVerify} className="bg-[#101a30] border border-[#1c2942] rounded-md p-6">
                <label htmlFor="qr-token" className="block text-xs text-[#7c8ba6] mb-2">QR token</label>
                <input
                    id="qr-token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste or scan the booking token"
                    autoFocus
                    className="w-full bg-[#0b1120] border border-[#2a3a56] rounded-md px-4 py-3 text-sm text-[#e7ecf5] placeholder-[#5c6a86] focus:outline-none focus:border-[#f4a93b] transition-colors"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 w-full bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 text-[#0b1120] font-medium rounded-md px-4 py-3 text-sm transition-colors"
                >
                    {loading ? "Verifying…" : "Verify & complete transfer"}
                </button>
                <p className="mt-3 text-xs text-[#7c8ba6]">
                    A handheld scanner types the token straight into this field. On mobile, the operator app scans the QR with the camera.
                </p>
            </form>

            {error && (
                <div className="mt-6 bg-red-400/10 border border-red-400/30 rounded-md px-5 py-4">
                    <p className="text-sm text-red-300">{error}</p>
                    <button onClick={reset} className="mt-2 text-xs text-[#a7b2c7] hover:text-[#e7ecf5] underline">
                        Try another
                    </button>
                </div>
            )}

            {result && (
                <div className="mt-6 bg-[#101a30] border border-emerald-400/30 rounded-md overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1c2942] bg-emerald-400/5">
                        <span className="w-8 h-8 rounded-full bg-emerald-400/15 text-emerald-400 flex items-center justify-center text-lg">✓</span>
                        <div>
                            <h2 className="font-grotesk text-sm font-semibold text-emerald-300">Transfer completed</h2>
                            <p className="text-xs text-[#7c8ba6]">The booking has been marked as completed.</p>
                        </div>
                    </div>
                    <dl className="divide-y divide-[#1c2942]">
                        <DetailRow label="Prosumer NIC" value={result.prosumerNic} />
                        <DetailRow label="Node" value={result.nodeId} />
                        <DetailRow label="Slot" value={new Date(result.slotDateTime).toLocaleString()} />
                        <div className="flex items-center justify-between px-5 py-3">
                            <dt className="text-xs text-[#7c8ba6]">Status</dt>
                            <dd>
                                <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[result.status] ?? "text-[#a7b2c7] bg-[#132038]"}`}>
                                    {result.status}
                                </span>
                            </dd>
                        </div>
                    </dl>
                    <div className="px-5 py-4 border-t border-[#1c2942]">
                        <button onClick={reset} className="w-full border border-[#2a3a56] hover:border-[#3a4a68] text-[#e7ecf5] rounded-md px-4 py-2.5 text-sm transition-colors">
                            Verify another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifyTransferPage;