import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { deactivateNode, getNodeById, nodeDeactivateErrorText, updateNodeSchedule } from "../api/nodeApi";
import NodeFormPanel from "./NodeFormPanel";
import { buildScheduleForm, scheduleFieldError, toSchedulePayload } from "./nodeValidation";

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
    const [deactivating, setDeactivating] = useState(false);
    const deactivateRef = useRef(false);
    const [scheduleSlots, setScheduleSlots] = useState(() => buildScheduleForm([]));
    const [scheduleSource, setScheduleSource] = useState("");
    const [scheduleError, setScheduleError] = useState("");
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const scheduleSubmitRef = useRef(false);
    const scrolledToSchedule = useRef(false);

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

    useEffect(() => {
        if (scrolledToSchedule.current || loading || !node || window.location.hash !== "#schedule") {
            return;
        }

        scrolledToSchedule.current = true;
        document.getElementById("schedule")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }, [loading, node]);

    const isActive = node?.status === "Active";
    const schedule = Array.isArray(node?.schedule) ? node.schedule : [];
    const nextScheduleSource = JSON.stringify(node?.schedule ?? null);

    if (node && scheduleSource !== nextScheduleSource) {
        setScheduleSource(nextScheduleSource);
        setScheduleSlots(buildScheduleForm(node.schedule));
    }

    const updateScheduleSlot = (dayOfWeek, field, value) => {
        setScheduleSlots((current) =>
            current.map((slot) =>
                slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
            )
        );
    };

    const handleDeactivate = async () => {
        if (deactivateRef.current || !node || node.status !== "Active") {
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to deactivate "${node.nodeId}"?`
        );

        if (!confirmed) {
            return;
        }

        deactivateRef.current = true;
        setDeactivating(true);
        setIsFormOpen(false);
        setError("");
        setSuccess("");
        setScheduleError("");

        try {
            const response = await deactivateNode(node.nodeId);

            if (!response.success || !response.data) {
                setError(nodeDeactivateErrorText(response.message));
                return;
            }

            setSuccess("Node deactivated successfully.");
            setNode(response.data);

            try {
                const refreshed = await getNodeById(response.data.nodeId || node.nodeId);

                if (refreshed.success && refreshed.data) {
                    setNode(refreshed.data);
                }
            } catch (refreshError) {
                console.error("Deactivated node could not be reloaded:", refreshError);
            }
        } catch (requestError) {
            console.error("Deactivate node failed:", requestError);
            setError(
                nodeDeactivateErrorText(
                    requestError.response?.data?.message,
                    requestError.response?.status
                )
            );
        } finally {
            deactivateRef.current = false;
            setDeactivating(false);
        }
    };

    const handleSaveSchedule = async (event) => {
        event.preventDefault();

        if (scheduleSubmitRef.current || !node || deactivating) {
            return;
        }

        if (node.status !== "Active") {
            setScheduleError("Cannot update a deactivated node.");
            return;
        }

        const validationError = scheduleFieldError(scheduleSlots);

        if (validationError) {
            setScheduleError(validationError);
            return;
        }

        scheduleSubmitRef.current = true;
        setScheduleSaving(true);
        setScheduleError("");
        setSuccess("");

        try {
            const response = await updateNodeSchedule(
                node.nodeId,
                toSchedulePayload(scheduleSlots).schedule
            );

            if (!response.success || !response.data) {
                setScheduleError(response.message || "Unable to update the schedule.");
                return;
            }

            setSuccess("Node schedule updated successfully.");
            setNode(response.data);

            try {
                const refreshed = await getNodeById(response.data.nodeId || node.nodeId);

                if (refreshed.success && refreshed.data) {
                    setNode(refreshed.data);
                }
            } catch (refreshError) {
                console.error("Updated schedule could not be reloaded:", refreshError);
            }
        } catch (requestError) {
            console.error("Update schedule failed:", requestError);

            const status = requestError.response?.status;
            const data = requestError.response?.data;

            if (status === 401) {
                setScheduleError("Your session has expired. Please log in again.");
            } else if (status === 403) {
                setScheduleError("You do not have permission to update this schedule.");
            } else if (status === 404) {
                setScheduleError(data?.message || "Node not found.");
            } else {
                setScheduleError(data?.message || "Unable to update the schedule.");
            }
        } finally {
            scheduleSubmitRef.current = false;
            setScheduleSaving(false);
        }
    };

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
                    <div className="flex items-center gap-2 shrink-0">
                        {isActive && (
                            <button
                                type="button"
                                onClick={handleDeactivate}
                                disabled={deactivating || scheduleSaving}
                                className="text-sm text-red-300 hover:text-red-200 border border-red-900/40 hover:border-red-700/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3.5 py-2 transition-colors"
                            >
                                {deactivating ? "Deactivating…" : "Deactivate"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                if (node.status !== "Active" || deactivating) {
                                    return;
                                }

                                setError("");
                                setSuccess("");
                                setIsFormOpen(true);
                            }}
                            disabled={node.status !== "Active" || deactivating}
                            title={
                                node.status === "Active"
                                    ? undefined
                                    : "A deactivated node cannot be updated."
                            }
                            className="shrink-0 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                        >
                            Edit
                        </button>
                    </div>
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
                <form
                    id="schedule"
                    onSubmit={handleSaveSchedule}
                    className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden"
                >
                    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#1c2942]">
                        <div>
                            <h3 className="font-grotesk text-sm font-semibold">Schedule</h3>
                            <p className="mt-1 text-xs text-[#7c8ba6]">
                                {schedule.length === 0
                                    ? "No schedule is saved yet."
                                    : `${schedule.length} day${schedule.length === 1 ? "" : "s"} saved.`}
                                {" "}
                                Saving replaces the full schedule. Leave a day blank to leave it out.
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={!isActive || scheduleSaving || deactivating}
                            title={
                                isActive
                                    ? undefined
                                    : "A deactivated node cannot be updated."
                            }
                            className="shrink-0 flex items-center justify-center gap-2 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                        >
                            {scheduleSaving && (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                </svg>
                            )}
                            {scheduleSaving ? "Saving…" : "Update schedule"}
                        </button>
                    </div>

                    {scheduleError && (
                        <div className="mx-5 mt-4 bg-red-600/10 border border-red-600/40 text-red-300 px-3.5 py-2.5 rounded-md text-sm">
                            {scheduleError}
                        </div>
                    )}

                    <div className="divide-y divide-[#1c2942]">
                        {scheduleSlots.map((slot) => (
                            <div
                                key={slot.dayOfWeek}
                                className="grid grid-cols-1 gap-3 px-5 py-3 sm:grid-cols-[140px_1fr_1fr] sm:items-center"
                            >
                                <div className="text-sm font-medium">{slot.dayOfWeek}</div>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs text-[#7c8ba6]">Start</span>
                                    <input
                                        type="time"
                                        value={slot.startTime}
                                        onChange={(event) =>
                                            updateScheduleSlot(
                                                slot.dayOfWeek,
                                                "startTime",
                                                event.target.value.slice(0, 5)
                                            )
                                        }
                                        disabled={!isActive || scheduleSaving || deactivating}
                                        className="w-full box-border px-3 py-2 bg-[#0b1120] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-sm focus:outline-none focus:border-[#f4a93b] disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs text-[#7c8ba6]">End</span>
                                    <input
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(event) =>
                                            updateScheduleSlot(
                                                slot.dayOfWeek,
                                                "endTime",
                                                event.target.value.slice(0, 5)
                                            )
                                        }
                                        disabled={!isActive || scheduleSaving || deactivating}
                                        className="w-full box-border px-3 py-2 bg-[#0b1120] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-sm focus:outline-none focus:border-[#f4a93b] disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                </form>
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
