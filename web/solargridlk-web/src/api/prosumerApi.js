import apiClient from "./apiClient";

export const getProsumerByNic = async (nic) => {
    // Retrieve one prosumer.
    const response = await apiClient.get(
        `/prosumers/${encodeURIComponent(nic)}`
    );

    return response.data;
};

export const createProsumer = async (prosumerData) => {
    // Register a prosumer. NIC is the business key.
    const response = await apiClient.post("/prosumers", prosumerData);

    return response.data;
};
