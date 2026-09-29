import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { batterySlotErrorText, getNodeById, updateBatterySlots } from "../api/nodeApi";

const displayValue = (value) => (value || value === 0 ? value : "—");

const NodeOperationDetailsPage = () => {
    const { nodeId } = useParams();
    const [node, setNode] = useState(null);
    const [slots, setSlots] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const applyNode = (nextNode) => {
        setNode(nextNode);
        setSlots(
            nextNode?.availableBatterySlots === 0 || nextNode?.availableBatterySlots
                ? String(nextNode.availableBatterySlots)
                : ""
        );
    };

    useEffect(() => {
        let cancelled = false;

        const loadNode = async () => {
            const trimmedId = (nodeId || "").trim();

            if (!trimmedId) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");
                setSuccess("");
                setNotFound(false);
                const response = await getNodeById(trimmedId);

                if (cancelled) {
                    return;
                }

                if (response.success && response.data) {
                    applyNode(response.data);
                } else {
                    setNode(null);
                    setNotFound(true);
                }
            } catch (requestError) {
                if (cancelled) {
                    return;
                }

                setNode(null);
                const status = requestError.response?.status;

                if (status === 404) {
                    setNotFound(true);
                } else {
                    setError(batterySlotErrorText(requestError.response?.data?.message, status));
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

    const changeSlots = (delta) => {
        const current = Number(slots);
        const base = Number.isInteger(current) && current >= 0 ? current : 0;
        setSlots(String(Math.max(0, base + delta)));
        setSuccess("");
        setError("");
    };

    const handleUpdate = async () => {
        if (!node || saving || node.status !== "Active") {
            return;
        }

        const trimmed = slots.trim();

        if (trimmed === "" || !/^\d+$/.test(trimmed)) {
            setError("Available battery slots must be a whole number.");
            setSuccess("");
            return;
        }

        const value = Number(trimmed);

        if (!Number.isSafeInteger(value) || value < 0) {
            setError("Available battery slots cannot be negative.");
            setSuccess("");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");
            const response = await updateBatterySlots(node.nodeId, value);

            if (!response.success || !response.data) {
                setError(batterySlotErrorText(response.message));
                return;
            }

            applyNode(response.data);
            setSuccess("Battery slot availability updated successfully.");
        } catch (requestError) {
            setError(
                batterySlotErrorText(
                    requestError.response?.data?.message,
                    requestError.response?.status
                )
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-[#7c8ba6]">Loading node…</p>;
    }

    if (notFound) {
        return (
            <div className="space-y-3">
                <p className="text-sm text-red-400">Node not found.</p>
                <Link to="/grid-operator/nodes" className="text-sm text-[#f4a93b]">
                    Back to nodes
                </Link>
            </div>
        );
    }

    if (!node) {
        return <p className="text-sm text-red-400">{error || "Unable to load the node."}</p>;
    }

    const isActive = node.status === "Active";

    return (
        <div className="space-y-6 max-w-2xl">
            <Link to="/grid-operator/nodes" className="text-sm text-[#7c8ba6] hover:text-[#e7ecf5]">
                ← Nodes
            </Link>

            <div>
                <p className="font-grotesk text-xl font-semibold">{node.nodeId}</p>
                <p className="text-[#a7b2c7] mt-1">{node.name}</p>
                <p className={`mt-2 text-sm ${isActive ? "text-emerald-400" : "text-red-400"}`}>
                    {isActive ? "● Active" : "● Deactivated"}
                </p>
            </div>

            {error && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-4 py-3">
                    {error}
                </p>
            )}

            {success && (
                <p className="text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-4 py-3">
                    {success}
                </p>
            )}

            <dl className="bg-[#101a30] border border-[#1c2942] rounded-md divide-y divide-[#1c2942]">
                {[
                    ["Location", displayValue(node.location)],
                    ["GPS", `${displayValue(node.latitude)}, ${displayValue(node.longitude)}`],
                    ["Capacity", `${displayValue(node.capacityKw)} kW`],
                ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                        <dt className="text-[#7c8ba6]">{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>

            <section className="bg-[#101a30] border border-[#1c2942] rounded-md p-5">
                <h2 className="font-grotesk font-semibold">Battery availability</h2>
                <p className="mt-4 font-grotesk text-4xl text-[#f4a93b]">
                    {displayValue(node.availableBatterySlots)}
                </p>
                <p className="text-sm text-[#7c8ba6]">Available slots</p>

                <div className="mt-5 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => changeSlots(-1)}
                        disabled={!isActive || saving}
                        className="w-10 h-10 rounded-md border border-[#2a3a56] text-lg disabled:opacity-40"
                    >
                        −
                    </button>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={slots}
                        disabled={!isActive || saving}
                        onChange={(event) => {
                            setSlots(event.target.value.replace(/[^\d]/g, ""));
                            setSuccess("");
                            setError("");
                        }}
                        className="w-24 text-center px-3 py-2 bg-[#0b1120] border border-[#2a3a56] rounded-md text-lg disabled:opacity-40"
                    />
                    <button
                        type="button"
                        onClick={() => changeSlots(1)}
                        disabled={!isActive || saving}
                        className="w-10 h-10 rounded-md border border-[#2a3a56] text-lg disabled:opacity-40"
                    >
                        +
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={!isActive || saving}
                    className="mt-5 text-sm text-[#0b1120] bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-40 rounded-md px-4 py-2.5 font-medium"
                >
                    {saving ? "Updating…" : "Update availability"}
                </button>

                {!isActive && (
                    <p className="mt-3 text-sm text-red-400">
                        Battery slots cannot be updated while this node is deactivated.
                    </p>
                )}
            </section>

            <section className="bg-[#101a30] border border-[#1c2942] rounded-md p-5">
                <h2 className="font-grotesk font-semibold">Operational schedule</h2>
                {Array.isArray(node.schedule) && node.schedule.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm">
                        {node.schedule.map((slot) => (
                            <li key={slot.dayOfWeek} className="flex justify-between gap-4">
                                <span className="text-[#a7b2c7]">{slot.dayOfWeek}</span>
                                <span>
                                    {slot.startTime} – {slot.endTime}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-3 text-sm text-[#7c8ba6]">No schedule set.</p>
                )}
            </section>
        </div>
    );
};

export default NodeOperationDetailsPage;
