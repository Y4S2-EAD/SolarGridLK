import apiClient from "./apiClient";

export const getNodes = async () => {
    // Retrieve nodes visible to the signed-in user. Grid Operators receive only assigned nodes.
    const response = await apiClient.get("/nodes");

    return response.data;
};

export const getNodeSlots = async (nodeId, date) => {
    // Retrieve server-generated 30-minute booking slots for a node on the given date (YYYY-MM-DD).
    const response = await apiClient.get(
        `/nodes/${encodeURIComponent(nodeId)}/slots`,
        { params: { date } }
    );

    return response.data; // { success, message, data: [ AvailableSlotDto ] }
};

export const batterySlotErrorText = (message, status) => {
    if (status === 401) {
        return "Your session has expired. Please log in again.";
    }

    if (status === 403) {
        return "You do not have permission to modify battery slots.";
    }

    if (status === 404) {
        return message || "Node or slot not found.";
    }

    if (message && message.toLowerCase().includes("not available")) {
        return "Battery slot not available.";
    }

    return message || "Unable to modify battery slot.";
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

export const updateBatterySlots = async (nodeId, availableSlots) => {
    // Update only the battery slot availability for a node.
    const response = await apiClient.put(
        `/nodes/${encodeURIComponent(nodeId)}/battery-slots`,
        { availableBatterySlots: availableSlots }
    );

    return response.data;
};
