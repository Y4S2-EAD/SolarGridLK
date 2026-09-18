import apiClient from "./apiClient";

export const getProsumerByNic = async (nic) => {
    // Retrieve one prosumer. The API has no list-all endpoint.
    const response = await apiClient.get(
        `/prosumers/${encodeURIComponent(nic)}`
    );

    return response.data;
};
