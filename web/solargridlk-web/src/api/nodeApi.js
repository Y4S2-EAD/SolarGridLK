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
