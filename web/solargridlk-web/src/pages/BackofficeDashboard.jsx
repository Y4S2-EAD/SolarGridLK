// Placeholder metrics — replace with real API data.
const kpis = [
    { label: "Energy traded (today)", value: "4,812 kWh", delta: "+6.2%", up: true },
    { label: "Active prosumers", value: "1,248", delta: "+18", up: true },
    { label: "Pending approvals", value: "7", delta: "needs review", up: null },
    { label: "Net settlements (today)", value: "Rs. 182,400", delta: "-2.1%", up: false },
];

// Placeholder recent activity — replace with real API data.
const recentTrades = [
    { id: "TRX-10231", from: "Prosumer #0231", to: "Grid Pool", amount: "12.4 kWh", status: "Settled" },
    { id: "TRX-10230", from: "Prosumer #0117", to: "Prosumer #0298", amount: "3.1 kWh", status: "Settled" },
    { id: "TRX-10229", from: "Prosumer #0044", to: "Grid Pool", amount: "8.7 kWh", status: "Pending" },
    { id: "TRX-10228", from: "Prosumer #0301", to: "Prosumer #0110", amount: "5.2 kWh", status: "Settled" },
    { id: "TRX-10227", from: "Prosumer #0056", to: "Grid Pool", amount: "14.9 kWh", status: "Flagged" },
];

const statusStyles = {
    Settled: "text-emerald-400 bg-emerald-400/10",
    Pending: "text-[#f4a93b] bg-[#f4a93b]/10",
    Flagged: "text-red-400 bg-red-400/10",
};

const BackofficeDashboard = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.label}
                        className="border-l-2 border-[#2a3a56] bg-[#101a30] rounded-r-md px-5 py-4"
                    >
                        <div className="text-xs text-[#7c8ba6] mb-2">{kpi.label}</div>
                        <div className="font-grotesk text-2xl font-semibold mb-1">{kpi.value}</div>
                        <div
                            className={`text-xs ${
                                kpi.up === true
                                    ? "text-emerald-400"
                                    : kpi.up === false
                                    ? "text-red-400"
                                    : "text-[#f4a93b]"
                            }`}
                        >
                            {kpi.delta}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                    <h2 className="font-grotesk text-sm font-semibold">Recent trades</h2>
                    <button className="text-xs text-[#f4a93b] hover:text-[#ffbb52] transition-colors">
                        View all
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                <th className="font-normal px-5 py-3">Transaction</th>
                                <th className="font-normal px-5 py-3">From</th>
                                <th className="font-normal px-5 py-3">To</th>
                                <th className="font-normal px-5 py-3">Amount</th>
                                <th className="font-normal px-5 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTrades.map((trade) => (
                                <tr
                                    key={trade.id}
                                    className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors"
                                >
                                    <td className="px-5 py-3 font-medium">{trade.id}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">{trade.from}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">{trade.to}</td>
                                    <td className="px-5 py-3">{trade.amount}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ${statusStyles[trade.status]}`}
                                        >
                                            {trade.status}
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

export default BackofficeDashboard;