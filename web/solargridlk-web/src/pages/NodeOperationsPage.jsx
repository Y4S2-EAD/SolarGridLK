import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNodes } from "../api/nodeApi";

const scheduleLabel = (schedule) => {
    if (!Array.isArray(schedule) || schedule.length === 0) {
        return "No schedule";
    }

    const today = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
        new Date().getDay()
    ];
    const window = schedule.find((slot) => slot.dayOfWeek === today) || schedule[0];

    if (!window?.startTime || !window?.endTime) {
        return "No schedule";
    }

    return `${window.dayOfWeek} ${window.startTime} – ${window.endTime}`;
};

const NodeOperationsPage = () => {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");

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
                if (cancelled) {
                    return;
                }

                const status = requestError.response?.status;
                setNodes([]);

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
    }, []);

    const visible = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (!term) {
            return nodes;
        }

        return nodes.filter((node) =>
            [node.nodeId, node.name, node.location, node.status]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term))
        );
    }, [nodes, query]);

    const activeCount = nodes.filter((node) => node.status === "Active").length;
    const availableSlots = nodes.reduce(
        (total, node) => total + (Number(node.availableBatterySlots) || 0),
        0
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="font-grotesk text-xl font-semibold">Node Operations</h2>
                <p className="text-sm text-[#7c8ba6] mt-1 max-w-xl">
                    Monitor microgrid nodes and update current battery slot availability for grid operations.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
                <div className="bg-[#101a30] border border-[#1c2942] rounded-md px-4 py-3">
                    <p className="text-xs text-[#7c8ba6]">Active nodes</p>
                    <p className="mt-1 font-grotesk text-2xl text-[#67e8f9]">{loading ? "—" : activeCount}</p>
                </div>
                <div className="bg-[#101a30] border border-[#1c2942] rounded-md px-4 py-3">
                    <p className="text-xs text-[#7c8ba6]">Available slots</p>
                    <p className="mt-1 font-grotesk text-2xl text-[#f4a93b]">{loading ? "—" : availableSlots}</p>
                </div>
            </div>

            <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search node"
                className="w-full max-w-md box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b]"
            />

            {error && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-4 py-3">
                    {error}
                </p>
            )}

            {loading && (
                <div className="grid gap-3" aria-live="polite">
                    <p className="text-sm text-[#7c8ba6]">Loading nodes…</p>
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-28 rounded-md border border-[#1c2942] bg-[#101a30] animate-pulse"
                        />
                    ))}
                </div>
            )}

            {!loading && !error && visible.length === 0 && (
                <p className="text-sm text-[#7c8ba6]">No nodes match this search.</p>
            )}

            <div className="grid gap-3">
                {visible.map((node) => {
                    const isActive = node.status === "Active";

                    return (
                        <article
                            key={node.nodeId}
                            className="bg-[#101a30] border border-[#1c2942] rounded-md p-5"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-grotesk font-semibold">{node.nodeId}</p>
                                    <p className="text-sm text-[#a7b2c7] mt-0.5">{node.name}</p>
                                </div>
                                <span
                                    className={`text-xs ${
                                        isActive ? "text-emerald-400" : "text-red-400"
                                    }`}
                                >
                                    {isActive ? "● Active" : "● Deactivated"}
                                </span>
                            </div>

                            <dl className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                <div>
                                    <dt className="text-xs text-[#7c8ba6]">Location</dt>
                                    <dd className="mt-1">{node.location || "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-[#7c8ba6]">Capacity</dt>
                                    <dd className="mt-1">{node.capacityKw} kW</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-[#7c8ba6]">Battery slots</dt>
                                    <dd className="mt-1">{node.availableBatterySlots} available</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-[#7c8ba6]">Schedule</dt>
                                    <dd className="mt-1">{scheduleLabel(node.schedule)}</dd>
                                </div>
                            </dl>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate(`/grid-operator/nodes/${encodeURIComponent(node.nodeId)}`)
                                }
                                className="mt-4 text-sm text-[#0b1120] bg-[#f4a93b] hover:bg-[#ffbb52] rounded-md px-3 py-2 font-medium"
                            >
                                View details
                            </button>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default NodeOperationsPage;
