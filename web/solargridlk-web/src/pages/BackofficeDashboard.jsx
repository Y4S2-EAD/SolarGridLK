import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/backoffice", label: "Overview", end: true },
    { to: "/backoffice/users", label: "User Management" },
    { to: "/backoffice/trades", label: "Trades" },
    { to: "/backoffice/settlements", label: "Settlements" },
    { to: "/backoffice/approvals", label: "Approvals" },
    { to: "/backoffice/reports", label: "Reports" },
];

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
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen flex bg-[#0b1120] font-body text-[#e7ecf5]">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#1c2942] px-5 py-6">
                <div className="flex items-center gap-2 font-grotesk font-semibold text-[1.05rem] mb-10 px-1">
                    <span className="w-2 h-2 rounded-full bg-[#f4a93b]" aria-hidden="true" />
                    SolarGridLK
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `block px-3 py-2 rounded-md text-sm transition-colors ${
                                    isActive
                                        ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                        : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="pt-5 border-t border-[#1c2942] text-xs text-[#7c8ba6]">
                    Backoffice Console v1.0
                </div>
            </aside>

            {/* Main column */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Topbar */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-[#1c2942]">
                    <div>
                        <h1 className="font-grotesk text-lg font-semibold leading-tight">
                            Overview
                        </h1>
                        <p className="text-xs text-[#7c8ba6]">
                            {new Date().toLocaleDateString(undefined, {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span className="text-xs text-[#7c8ba6] hidden sm:inline">Grid operational</span>

                        <div className="w-px h-6 bg-[#1c2942]" />

                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-medium leading-tight">
                                {user?.fullName ?? "—"}
                            </div>
                            <div className="text-xs text-[#7c8ba6] leading-tight">
                                {user?.role ?? "—"}
                            </div>
                        </div>

                        <div className="w-9 h-9 rounded-full bg-[#132038] border border-[#2a3a56] flex items-center justify-center font-grotesk text-sm font-semibold text-[#f4a93b]">
                            {(user?.fullName ?? "?").charAt(0).toUpperCase()}
                        </div>

                        <button
                            onClick={logout}
                            className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-3 py-1.5 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* KPI cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {kpis.map((kpi) => (
                            <div
                                key={kpi.label}
                                className="border-l-2 border-[#2a3a56] bg-[#101a30] rounded-r-md px-5 py-4"
                            >
                                <div className="text-xs text-[#7c8ba6] mb-2">{kpi.label}</div>
                                <div className="font-grotesk text-2xl font-semibold mb-1">
                                    {kpi.value}
                                </div>
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

                    {/* Recent trades table */}
                    <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                            <h2 className="font-grotesk text-sm font-semibold">Recent trades</h2>
                            <NavLink
                                to="/backoffice/trades"
                                className="text-xs text-[#f4a93b] hover:text-[#ffbb52] transition-colors"
                            >
                                View all
                            </NavLink>
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
                </main>
            </div>
        </div>
    );
};

export default BackofficeDashboard;