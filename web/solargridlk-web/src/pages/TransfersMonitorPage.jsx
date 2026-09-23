import { useEffect, useMemo, useState } from "react";
import { getReservations } from "../api/reservationApi";

const STATUS_TABS = ["All", "Pending", "Approved", "Completed", "Cancelled"];

const statusStyles = {
    Pending: "text-[#f4a93b] bg-[#f4a93b]/10",
    Approved: "text-sky-400 bg-sky-400/10",
    Completed: "text-emerald-400 bg-emerald-400/10",
    Cancelled: "text-red-400 bg-red-400/10",
};

const SkeletonRow = () => (
    <tr className="border-b border-[#1c2942] last:border-0">
        {Array.from({ length: 5 }).map((_, i) => (
            <td key={i} className="px-5 py-4">
                <div className="h-3.5 rounded bg-[#182338] animate-pulse" style={{ width: `${55 + i * 6}%` }} />
            </td>
        ))}
    </tr>
);

const TransfersMonitorPage = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("Approved");

    const load = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await getReservations();
            if (response.success) {
                setReservations(response.data || []);
            } else {
                setError(response.message || "Unable to load reservations.");
            }
        } catch (err) {
            setError(err?.response?.data?.message ?? "Unable to load reservations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const counts = useMemo(
        () =>
            reservations.reduce(
                (acc, r) => {
                    acc.total += 1;
                    acc[r.status] = (acc[r.status] || 0) + 1;
                    return acc;
                },
                { total: 0 }
            ),
        [reservations]
    );

    const visible = useMemo(() => {
        const rows = activeTab === "All" ? reservations : reservations.filter((r) => r.status === activeTab);
        return [...rows].sort((a, b) => new Date(a.slotDateTime) - new Date(b.slotDateTime));
    }, [reservations, activeTab]);

    const kpis = [
        { label: "Awaiting transfer", value: counts.Approved || 0, tone: "text-sky-400" },
        { label: "Completed", value: counts.Completed || 0, tone: "text-emerald-400" },
        { label: "Pending", value: counts.Pending || 0, tone: "text-[#f4a93b]" },
        { label: "Total bookings", value: counts.total || 0, tone: "text-[#e7ecf5]" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-[#7c8ba6]">Reservations awaiting transfer and completed handoffs</p>
                <button
                    onClick={load}
                    className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-3 py-1.5 transition-colors"
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="border-l-2 border-[#2a3a56] bg-[#101a30] rounded-r-md px-5 py-4">
                        <div className="text-xs text-[#7c8ba6] mb-2">{kpi.label}</div>
                        <div className={`font-grotesk text-2xl font-semibold ${kpi.tone}`}>
                            {loading ? "—" : kpi.value}
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-4 py-2.5 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                <div className="flex items-center gap-1 px-3 py-3 border-b border-[#1c2942] overflow-x-auto">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                                activeTab === tab
                                    ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                    : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                            <th className="font-normal px-5 py-3">Prosumer NIC</th>
                            <th className="font-normal px-5 py-3">Node</th>
                            <th className="font-normal px-5 py-3">Slot</th>
                            <th className="font-normal px-5 py-3">QR</th>
                            <th className="font-normal px-5 py-3">Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

                        {!loading && visible.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-5 py-12 text-center text-[#7c8ba6]">
                                    No reservations in this view.
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            visible.map((r) => (
                                <tr key={r.id} className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors">
                                    <td className="px-5 py-3 font-medium">{r.prosumerNic}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">{r.nodeId}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">{new Date(r.slotDateTime).toLocaleString()}</td>
                                    <td className="px-5 py-3">
                                        {r.qrCode ? (
                                            <span className="text-emerald-400 text-xs">● Issued</span>
                                        ) : (
                                            <span className="text-[#5c6b88] text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[r.status] ?? "text-[#a7b2c7] bg-[#182338]"}`}>
                                                {r.status}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TransfersMonitorPage;