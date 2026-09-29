import apiClient from "./apiClient";

export const getNodes = async () => {
    // Retrieve every microgrid node.
    const response = await apiClient.get("/nodes");

    return response.data;
};

export const getNodeById = async (nodeId) => {
    // Retrieve one microgrid node by its public id.
    const response = await apiClient.get(
        `/nodes/${encodeURIComponent(nodeId)}`
    );

    return response.data;
};

export const createNode = async (nodeData) => {
    // Register a microgrid node. Node ID is the business key.
    const response = await apiClient.post("/nodes", nodeData);

    return response.data;
};

export const updateNodeSchedule = async (nodeId, schedule) => {
    // Replace the node's operating schedule.
    const response = await apiClient.put(
        `/nodes/${encodeURIComponent(nodeId)}/schedule`,
        { schedule }
    );

    return response.data;
};

const activeReservationsMessage = "Cannot deactivate a node that has active reservations.";

export const nodeDeactivateErrorText = (message, status) => {
    if (status === 401) {
        return "Your session has expired. Please log in again.";
    }

    if (status === 403) {
        return "You do not have permission to deactivate this node.";
    }

    if (status === 404) {
        return message || "Node not found.";
    }

    if (message === activeReservationsMessage) {
        return "Node cannot be deactivated because active reservations exist.";
    }

    return message || "Unable to deactivate the node.";
};

export const deactivateNode = async (nodeId) => {
    // Ask the API to deactivate the node. Reservation checks stay on the server.
    const response = await apiClient.post(
        `/nodes/${encodeURIComponent(nodeId)}/deactivate`
    );

    return response.data;
};

export const updateNode = async (nodeId, nodeData) => {
    // Update node details. The route node id is not replaced.
    const response = await apiClient.put(
        `/nodes/${encodeURIComponent(nodeId)}`,
        nodeData
    );

    return response.data;
};

export const updateBatterySlots = async (nodeId, availableBatterySlots) => {
    // Update only battery-slot availability.
    const response = await apiClient.put(
        `/nodes/${encodeURIComponent(nodeId)}/battery-slots`,
        { availableBatterySlots }
    );

    return response.data;
};

export const batterySlotErrorText = (message, status) => {
    if (status === 401) {
        return "Your session has expired. Please log in again.";
    }

    if (status === 403) {
        return "You do not have permission to update battery slots.";
    }

    if (status === 404) {
        return message || "Node not found.";
    }

    return message || "Unable to update battery slot availability.";
};
