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

export const updateNode = async (nodeId, nodeData) => {
    // Update node details. The route node id is not replaced.
    const response = await apiClient.put(
        `/nodes/${encodeURIComponent(nodeId)}`,
        nodeData
    );

    return response.data;
};
