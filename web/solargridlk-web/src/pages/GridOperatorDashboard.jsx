import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { key: "overview", label: "Grid overview" },
    { key: "nodes", label: "Nodes & zones" },
    { key: "dispatch", label: "Dispatch control" },
    { key: "alerts", label: "Alerts & faults" },
    { key: "logs", label: "Event logs" },
];

// Placeholder metrics — replace with real telemetry data.
const gridMetrics = [
    { label: "Grid frequency", value: "50.02 Hz", status: "normal" },
    { label: "Total load", value: "1,842 kW", status: "normal" },
    { label: "Solar generation", value: "2,310 kW", status: "normal" },
    { label: "Storage reserve", value: "38%", status: "watch" },
];

// Placeholder node data — replace with real API data.
const nodes = [
    { id: "ZN-01", name: "Negombo North", load: "412 kW", generation: "560 kW", status: "Stable" },
    { id: "ZN-02", name: "Negombo Coastal", load: "298 kW", generation: "310 kW", status: "Stable" },
    { id: "ZN-03", name: "Katunayake Industrial", load: "674 kW", generation: "420 kW", status: "Deficit" },
    { id: "ZN-04", name: "Seeduwa Residential", load: "205 kW", generation: "890 kW", status: "Surplus" },
    { id: "ZN-05", name: "Ja-Ela Substation", load: "253 kW", generation: "130 kW", status: "Watch" },
];

// Placeholder alerts — replace with real API data.
const alerts = [
    { id: 1, level: "critical", text: "Zone ZN-03 load exceeds forecast by 22%", time: "2 min ago" },
    { id: 2, level: "warning", text: "Storage reserve below 40% threshold", time: "14 min ago" },
    { id: 3, level: "info", text: "Scheduled maintenance window at ZN-02 in 3 hours", time: "1 hr ago" },
];

const nodeStatusStyles = {
    Stable: "text-emerald-400 bg-emerald-400/10",
    Surplus: "text-sky-400 bg-sky-400/10",
    Deficit: "text-red-400 bg-red-400/10",
    Watch: "text-[#f4a93b] bg-[#f4a93b]/10",
};

const alertStyles = {
    critical: { dot: "bg-red-400", text: "text-red-300" },
    warning: { dot: "bg-[#f4a93b]", text: "text-[#f4a93b]" },
    info: { dot: "bg-sky-400", text: "text-sky-300" },
};

const metricStatusStyles = {
    normal: "text-emerald-400",
    watch: "text-[#f4a93b]",
    critical: "text-red-400",
};

const GridOperatorDashboard = () => {
    const { user, logout } = useAuth();
    const [active, setActive] = useState("overview");

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
                        <button
                            key={item.key}
                            onClick={() => setActive(item.key)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                active === item.key
                                    ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                    : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="pt-5 border-t border-[#1c2942] text-xs text-[#7c8ba6]">
                    Grid Operator Console v1.0
                </div>
            </aside>

            {/* Main column */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Topbar */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-[#1c2942]">
                    <div>
                        <h1 className="font-grotesk text-lg font-semibold leading-tight">
                            {navItems.find((n) => n.key === active)?.label}
                        </h1>
                        <p className="text-xs text-[#7c8ba6]">
                            Last synced just now
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
                    {/* Grid health metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {gridMetrics.map((metric) => (
                            <div
                                key={metric.label}
                                className="border-l-2 border-[#2a3a56] bg-[#101a30] rounded-r-md px-5 py-4"
                            >
                                <div className="text-xs text-[#7c8ba6] mb-2">{metric.label}</div>
                                <div className="font-grotesk text-2xl font-semibold mb-1">
                                    {metric.value}
                                </div>
                                <div className={`text-xs capitalize ${metricStatusStyles[metric.status]}`}>
                                    {metric.status}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Node / zone status table */}
                        <div className="xl:col-span-2 bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                                <h2 className="font-grotesk text-sm font-semibold">Zone status</h2>
                                <button className="text-xs text-[#f4a93b] hover:text-[#ffbb52] transition-colors">
                                    View grid map
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                            <th className="font-normal px-5 py-3">Zone</th>
                                            <th className="font-normal px-5 py-3">Load</th>
                                            <th className="font-normal px-5 py-3">Generation</th>
                                            <th className="font-normal px-5 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nodes.map((node) => (
                                            <tr
                                                key={node.id}
                                                className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors"
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="font-medium">{node.name}</div>
                                                    <div className="text-xs text-[#7c8ba6]">{node.id}</div>
                                                </td>
                                                <td className="px-5 py-3 text-[#a7b2c7]">{node.load}</td>
                                                <td className="px-5 py-3 text-[#a7b2c7]">{node.generation}</td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full ${nodeStatusStyles[node.status]}`}
                                                    >
                                                        {node.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Alerts panel */}
                        <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                                <h2 className="font-grotesk text-sm font-semibold">Alerts</h2>
                                <span className="text-xs text-[#7c8ba6]">{alerts.length} active</span>
                            </div>

                            <ul className="divide-y divide-[#1c2942]">
                                {alerts.map((alert) => (
                                    <li key={alert.id} className="px-5 py-4">
                                        <div className="flex items-start gap-2.5">
                                            <span
                                                className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${alertStyles[alert.level].dot}`}
                                            />
                                            <div>
                                                <p className={`text-sm leading-snug ${alertStyles[alert.level].text}`}>
                                                    {alert.text}
                                                </p>
                                                <p className="text-xs text-[#7c8ba6] mt-1">{alert.time}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default GridOperatorDashboard;