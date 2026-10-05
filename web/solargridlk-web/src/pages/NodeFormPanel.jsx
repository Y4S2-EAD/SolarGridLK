import { useEffect, useRef, useState } from "react";
import { createNode, updateNode } from "../api/nodeApi";
import { getUsers } from "../api/userApi";
import { inputClassName, nodeFieldError, sriLankanDistricts, toNodePayload } from "./nodeValidation";

const emptyForm = {
    nodeId: "",
    name: "",
    location: "",
    latitude: "",
    longitude: "",
    capacityKw: "",
    availableBatterySlots: "",
    assignedGridOperatorId: "",
};

const textValue = (value) => (value || value === 0 ? String(value) : "");

const formFromNode = (node) => {
    const storedLocation = node?.location || "";
    const matchedDistrict = sriLankanDistricts.find(
        (district) => district.toLowerCase() === storedLocation.trim().toLowerCase()
    );

    return {
        nodeId: node?.nodeId || "",
        name: node?.name || "",
        location: matchedDistrict || storedLocation,
        latitude: textValue(node?.latitude),
        longitude: textValue(node?.longitude),
        capacityKw: textValue(node?.capacityKw),
        availableBatterySlots: textValue(node?.availableBatterySlots),
        assignedGridOperatorId: node?.assignedGridOperatorId || "",
    };
};

const messageFromError = (requestError, fallback) => {
    const status = requestError.response?.status;
    const data = requestError.response?.data;
    const validationMessage = data?.errors
        ? Object.values(data.errors).flat().join(" ")
        : "";

    if (status === 401) {
        return "Your session has expired. Please log in again.";
    }

    if (status === 403) {
        return "You do not have permission to save this node.";
    }

    if (status === 404) {
        return data?.message || "Node not found.";
    }

    return data?.message || validationMessage || fallback;
};

const NodeFormPanel = ({ mode, node, isOpen, onClose, onCompleted }) => {
    const submittingRef = useRef(false);
    const isEdit = mode === "edit";
    const [formData, setFormData] = useState(() => (isEdit ? formFromNode(node) : emptyForm));
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [operators, setOperators] = useState([]);
    const [operatorsLoading, setOperatorsLoading] = useState(true);
    const [operatorsError, setOperatorsError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        let cancelled = false;

        const loadOperators = async () => {
            try {
                setOperatorsLoading(true);
                setOperatorsError("");
                const response = await getUsers();

                if (cancelled) {
                    return;
                }

                if (!response.success) {
                    setOperators([]);
                    setOperatorsError(response.message || "Unable to load Grid Operators.");
                    return;
                }

                const gridOperators = (response.data || [])
                    .filter((user) => user.role === "GridOperator")
                    .sort((left, right) =>
                        (left.fullName || left.username || "").localeCompare(
                            right.fullName || right.username || ""
                        )
                    );

                setOperators(gridOperators);
            } catch (requestError) {
                if (cancelled) {
                    return;
                }

                setOperators([]);
                setOperatorsError(
                    requestError.response?.data?.message || "Unable to load Grid Operators."
                );
            } finally {
                if (!cancelled) {
                    setOperatorsLoading(false);
                }
            }
        };

        loadOperators();

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const operatorLabel = (operator) => {
        const name = operator.fullName || operator.username || "Grid Operator";
        return operator.isActive ? name : `${name} (inactive)`;
    };

    const selectedOperatorMissing =
        formData.assignedGridOperatorId &&
        !operators.some((operator) => operator.id === formData.assignedGridOperatorId);

    const closePanel = () => {
        if (saving) {
            return;
        }

        onClose();
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        const validationError = nodeFieldError(formData, { requireNodeId: !isEdit });

        if (validationError) {
            setError(validationError);
            return;
        }

        submittingRef.current = true;
        setSaving(true);
        setError("");

        try {
            const response = isEdit
                ? await updateNode(node.nodeId, toNodePayload(formData))
                : await createNode(toNodePayload(formData, { includeNodeId: true }));

            if (!response.success || !response.data) {
                setError(response.message || (isEdit ? "Unable to update node." : "Unable to create node."));
                return;
            }

            onCompleted(response.data);
        } catch (requestError) {
            console.error(isEdit ? "Update node failed:" : "Create node failed:", requestError);
            setError(
                messageFromError(
                    requestError,
                    isEdit ? "Unable to update the node." : "Unable to create the node."
                )
            );
        } finally {
            submittingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={closePanel} />
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0e1730] border-l border-[#1c2942] z-50 flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2942]">
                    <h2 className="font-grotesk text-lg font-semibold">
                        {isEdit ? "Edit node" : "Create node"}
                    </h2>
                    <button
                        type="button"
                        onClick={closePanel}
                        disabled={saving}
                        className="text-[#7c8ba6] hover:text-[#e7ecf5] disabled:opacity-40 transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <form
                    id="node-form"
                    onSubmit={handleSubmit}
                    className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5"
                >
                    {error && (
                        <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-3.5 py-2.5 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="nodeId" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Node ID
                        </label>
                        <input
                            id="nodeId"
                            name="nodeId"
                            type="text"
                            value={isEdit ? node.nodeId : formData.nodeId}
                            onChange={handleChange}
                            disabled={saving || isEdit}
                            readOnly={isEdit}
                            required={!isEdit}
                            className={inputClassName}
                        />
                        {isEdit && (
                            <p className="mt-1.5 text-xs text-[#7c8ba6]">
                                Node ID is the node key and cannot be changed.
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={saving}
                            required
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label htmlFor="location" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Location / District
                        </label>
                        <select
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            disabled={saving}
                            className={inputClassName}
                        >
                            <option value="">Select District</option>
                            {formData.location.trim() &&
                                !sriLankanDistricts.includes(formData.location.trim()) && (
                                    <option value={formData.location}>{formData.location}</option>
                                )}
                            {sriLankanDistricts.map((district) => (
                                <option key={district} value={district}>
                                    {district}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-xs text-[#7c8ba6]">
                            Select the Sri Lankan district where this microgrid node is located.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="assignedGridOperatorId" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Grid Operator
                        </label>
                        <select
                            id="assignedGridOperatorId"
                            name="assignedGridOperatorId"
                            value={formData.assignedGridOperatorId}
                            onChange={handleChange}
                            disabled={saving || operatorsLoading}
                            className={inputClassName}
                        >
                            <option value="">
                                {operatorsLoading ? "Loading Grid Operators…" : "Select Grid Operator"}
                            </option>
                            {selectedOperatorMissing && (
                                <option value={formData.assignedGridOperatorId}>
                                    {node?.assignedGridOperatorName || "Assigned Grid Operator"}
                                </option>
                            )}
                            {operators.map((operator) => (
                                <option key={operator.id} value={operator.id}>
                                    {operatorLabel(operator)}
                                </option>
                            ))}
                        </select>
                        <p className={`mt-1.5 text-xs ${operatorsError ? "text-red-300" : "text-[#7c8ba6]"}`}>
                            {operatorsError ||
                                (operatorsLoading
                                    ? "Loading registered Grid Operators."
                                    : operators.length === 0
                                      ? "No Grid Operators are registered. Create a Grid Operator user first."
                                      : "Select the Grid Operator responsible for this node.")}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="latitude" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Latitude
                        </label>
                        <input
                            id="latitude"
                            name="latitude"
                            type="text"
                            inputMode="decimal"
                            value={formData.latitude}
                            onChange={handleChange}
                            disabled={saving}
                            required
                            placeholder="-90 to 90"
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label htmlFor="longitude" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Longitude
                        </label>
                        <input
                            id="longitude"
                            name="longitude"
                            type="text"
                            inputMode="decimal"
                            value={formData.longitude}
                            onChange={handleChange}
                            disabled={saving}
                            required
                            placeholder="-180 to 180"
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label htmlFor="capacityKw" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Capacity (kW)
                        </label>
                        <input
                            id="capacityKw"
                            name="capacityKw"
                            type="text"
                            inputMode="decimal"
                            value={formData.capacityKw}
                            onChange={handleChange}
                            disabled={saving}
                            required
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label htmlFor="availableBatterySlots" className="block text-sm text-[#a7b2c7] mb-1.5">
                            Available battery slots
                        </label>
                        <input
                            id="availableBatterySlots"
                            name="availableBatterySlots"
                            type="text"
                            inputMode="numeric"
                            value={formData.availableBatterySlots}
                            onChange={handleChange}
                            disabled={saving}
                            required
                            className={inputClassName}
                        />
                    </div>
                </form>

                <div className="flex items-center gap-3 px-6 py-5 border-t border-[#1c2942]">
                    <button
                        type="button"
                        onClick={closePanel}
                        disabled={saving}
                        className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-4 py-2.5 transition-colors disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="node-form"
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] font-semibold text-sm rounded-md transition-colors"
                    >
                        {saving && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                            </svg>
                        )}
                        {saving ? "Saving…" : isEdit ? "Update node" : "Create node"}
                    </button>
                </div>
            </div>
        </>
    );
};

export default NodeFormPanel;
