import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNodes } from "../api/nodeApi";

const tableColumns = ["Node ID", "Name", "Location", "Capacity", "Battery slots", "Status", "Actions"];

const actionButtonClass =
    "text-xs text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-2.5 py-1.5 transition-colors";

const SkeletonRow = () => (
    <tr className="border-b border-[#1c2942] last:border-0">
        {Array.from({ length: tableColumns.length }).map((_, index) => (
            <td key={index} className="px-5 py-4">
                <div
                    className="h-3.5 rounded bg-[#182338] animate-pulse"
                    style={{ width: `${55 + index * 6}%` }}
                />
            </td>
        ))}
    </tr>
);

const NodeManagementPage = () => {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const loadNodes = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getNodes();

                if (cancelled) {
                    return;
                }

                if (response.success) {
                    setNodes(response.data || []);
                } else {
                    setNodes([]);
                    setError(response.message || "Unable to load nodes.");
                }
            } catch (requestError) {
                console.error("Failed to load nodes:", requestError);

                if (cancelled) {
                    return;
                }

                const status = requestError.response?.status;

                if (status === 401) {
                    setError("Your session has expired. Please log in again.");
                } else if (status === 403) {
                    setError("You do not have permission to view nodes.");
                } else {
                    setError(requestError.response?.data?.message || "Unable to load nodes.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadNodes();

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-grotesk text-xl font-semibold">Microgrid Node Management</h2>
                    <p className="text-sm text-[#7c8ba6] mt-1">
                        Backoffice users manage microgrid nodes.
                    </p>
                </div>

                {/* Create is reserved for a later step and does not call the API yet. */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 shrink-0 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    Create Node
                </button>
            </div>

            {error && (
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
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#1c2942]">
                    <div>
                        <h3 className="font-grotesk text-sm font-semibold">Nodes</h3>
                        <p className="mt-1 text-xs text-[#7c8ba6]">
                            {loading ? "Loading…" : `${nodes.length} total`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setReloadKey((current) => current + 1)}
                        disabled={loading}
                        className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3 py-2 transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                {tableColumns.map((column) => (
                                    <th
                                        key={column}
                                        className={`font-normal px-5 py-3 ${
                                            column === "Actions" ? "text-right" : ""
                                        }`}
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading &&
                                Array.from({ length: 4 }).map((_, index) => <SkeletonRow key={index} />)}

                            {!loading && !error && nodes.length === 0 && (
                                <tr>
                                    <td colSpan={tableColumns.length} className="px-5 py-12 text-center text-[#7c8ba6]">
                                        <div className="mx-auto max-w-sm">
                                            <p className="font-medium text-[#a7b2c7]">No nodes yet</p>
                                            <p className="mt-1 text-xs">
                                                Nodes will appear here when they are created.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && error && nodes.length === 0 && (
                                <tr>
                                    <td colSpan={tableColumns.length} className="px-5 py-12 text-center text-[#7c8ba6]">
                                        The nodes could not be loaded.
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                nodes.map((node) => {
                                    const isActive = node.status === "Active";

                                    return (
                                        <tr
                                            key={node.nodeId}
                                            className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors"
                                        >
                                            <td className="px-5 py-3 font-medium">{node.nodeId}</td>
                                            <td className="px-5 py-3">{node.name}</td>
                                            <td className="px-5 py-3 text-[#a7b2c7]">{node.location}</td>
                                            <td className="px-5 py-3">{node.capacityKw} kW</td>
                                            <td className="px-5 py-3">{node.availableBatterySlots}</td>
                                            <td className="px-5 py-3">
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
                                                    {node.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/backoffice/nodes/${encodeURIComponent(node.nodeId)}`
                                                            )
                                                        }
                                                        className={actionButtonClass}
                                                    >
                                                        View
                                                    </button>
                                                    {/* Edit, schedule, and deactivate are reserved for a later step. */}
                                                    <button type="button" className={actionButtonClass}>
                                                        Edit
                                                    </button>
                                                    <button type="button" className={actionButtonClass}>
                                                        Schedule
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-xs text-red-300 border border-red-900/40 rounded-md px-2.5 py-1.5"
                                                    >
                                                        Deactivate
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default NodeManagementPage;
