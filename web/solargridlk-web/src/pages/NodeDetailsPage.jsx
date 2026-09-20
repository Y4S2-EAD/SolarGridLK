import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getNodeById } from "../api/nodeApi";
import NodeFormPanel from "./NodeFormPanel";

const displayValue = (value) => (value || value === 0 ? value : "—");

const formatDateTime = (value) => {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const NodeDetailsPage = () => {
    const { nodeId } = useParams();
    const location = useLocation();
    const editRequested = useRef(Boolean(location.state?.openEdit));
    const [node, setNode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadNode = async () => {
            const trimmedId = (nodeId || "").trim();

            if (!trimmedId) {
                setNode(null);
                setNotFound(true);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");
                setNotFound(false);

                const response = await getNodeById(trimmedId);

                if (cancelled) {
                    return;
                }

                if (response.success && response.data) {
                    setNode(response.data);

                    if (editRequested.current) {
                        editRequested.current = false;

                        if (response.data.status !== "Active") {
                            setError("Cannot update a deactivated node.");
                        } else {
                            setIsFormOpen(true);
                        }
                    }
                } else {
                    setNode(null);
                    setNotFound(true);
                }
            } catch (requestError) {
                console.error("Failed to load node:", requestError);

                if (cancelled) {
                    return;
                }

                setNode(null);
                const status = requestError.response?.status;

                if (status === 404) {
                    setNotFound(true);
                    setError("");
                } else if (status === 401) {
                    setNotFound(false);
                    setError("Your session has expired. Please log in again.");
                } else if (status === 403) {
                    setNotFound(false);
                    setError("You do not have permission to view nodes.");
                } else {
                    setNotFound(false);
                    setError(requestError.response?.data?.message || "Unable to load the node.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadNode();

        return () => {
            cancelled = true;
        };
    }, [nodeId]);

    const isActive = node?.status === "Active";
    const schedule = Array.isArray(node?.schedule) ? node.schedule : [];

    const detailRows = node
        ? [
              { label: "Node ID", value: node.nodeId },
              { label: "Name", value: displayValue(node.name) },
              { label: "Location", value: displayValue(node.location) },
              { label: "Latitude", value: displayValue(node.latitude) },
              { label: "Longitude", value: displayValue(node.longitude) },
              { label: "Capacity", value: `${displayValue(node.capacityKw)} kW` },
              { label: "Available battery slots", value: displayValue(node.availableBatterySlots) },
              { label: "Created", value: formatDateTime(node.createdAt) },
              { label: "Last modified", value: formatDateTime(node.lastModifiedAt) },
          ]
        : [];

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link
                        to="/backoffice/nodes"
                        className="text-xs text-[#f4a93b] hover:text-[#ffbb52] transition-colors"
                    >
                        Back to nodes
                    </Link>
                    <h2 className="font-grotesk text-xl font-semibold mt-2">Node details</h2>
                    <p className="text-sm text-[#7c8ba6] mt-1">
                        Backoffice users view and update a microgrid node.
                    </p>
                </div>

                {node && (
                    <button
                        type="button"
                        onClick={() => {
                            if (node.status !== "Active") {
                                return;
                            }

                            setError("");
                            setSuccess("");
                            setIsFormOpen(true);
                        }}
                        disabled={node.status !== "Active"}
                        title={
                            node.status === "Active"
                                ? undefined
                                : "A deactivated node cannot be updated."
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
                    <h3 className="font-grotesk text-sm font-semibold">Node</h3>
                    <p className="mt-1 text-xs text-[#7c8ba6]">
                        {loading ? "Loading…" : node ? node.nodeId : "No node loaded"}
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
                        <p className="font-medium text-[#a7b2c7]">No node found</p>
                        <p className="mt-1 text-xs">No node matches ID {nodeId}.</p>
                    </div>
                )}

                {!loading && !node && !notFound && (
                    <div className="px-5 py-12 text-center text-[#7c8ba6]">
                        The node could not be loaded.
                    </div>
                )}

                {!loading && node && (
                    <dl className="divide-y divide-[#1c2942]">
                        {detailRows.map((row) => (
                            <div
                                key={row.label}
                                className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[180px_1fr] sm:gap-4"
                            >
                                <dt className="text-xs text-[#7c8ba6]">{row.label}</dt>
                                <dd className="text-sm">{row.value}</dd>
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
                                    {node.status}
                                </span>
                            </dd>
                        </div>
                    </dl>
                )}
            </div>

            {!loading && node && (
                <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#1c2942]">
                        <h3 className="font-grotesk text-sm font-semibold">Schedule</h3>
                        <p className="mt-1 text-xs text-[#7c8ba6]">
                            {schedule.length === 0 ? "No schedule returned" : `${schedule.length} day${schedule.length === 1 ? "" : "s"}`}
                        </p>
                    </div>

                    {schedule.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-[#7c8ba6]">
                            This node has no schedule.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                        <th className="font-normal px-5 py-3">Day</th>
                                        <th className="font-normal px-5 py-3">Start</th>
                                        <th className="font-normal px-5 py-3">End</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.map((slot) => (
                                        <tr
                                            key={`${slot.dayOfWeek}-${slot.startTime}`}
                                            className="border-b border-[#1c2942] last:border-0"
                                        >
                                            <td className="px-5 py-3">{slot.dayOfWeek}</td>
                                            <td className="px-5 py-3 text-[#a7b2c7]">{slot.startTime}</td>
                                            <td className="px-5 py-3 text-[#a7b2c7]">{slot.endTime}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {node && (
                <NodeFormPanel
                    key={isFormOpen ? `edit-${node.nodeId}` : "closed"}
                    mode="edit"
                    node={node}
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onCompleted={async (updatedNode) => {
                        setIsFormOpen(false);
                        setError("");
                        setSuccess("Node updated successfully.");
                        setNode(updatedNode);

                        try {
                            const refreshed = await getNodeById(updatedNode.nodeId || node.nodeId);

                            if (refreshed.success && refreshed.data) {
                                setNode(refreshed.data);
                            }
                        } catch (refreshError) {
                            console.error("Updated node could not be reloaded:", refreshError);
                        }
                    }}
                />
            )}
        </div>
    );
};

export default NodeDetailsPage;
