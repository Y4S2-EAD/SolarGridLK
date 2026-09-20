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

export const updateProsumer = async (nic, prosumerData) => {
    // Update profile fields. The NIC in the route is not replaced.
    const response = await apiClient.put(
        `/prosumers/${encodeURIComponent(nic)}`,
        prosumerData
    );

    return response.data;
};

export const requestProsumerDeactivation = async (nic, password) => {
    // Deactivate after the prosumer account password is confirmed.
    const response = await apiClient.post(
        `/prosumers/${encodeURIComponent(nic)}/deactivation-request`,
        { password }
    );

    return response.data;
};

export const reactivateProsumer = async (nic) => {
    // Restore a deactivated account. Backoffice role is required by the API.
    const response = await apiClient.post(
        `/prosumers/${encodeURIComponent(nic)}/reactivate`
    );

    return response.data;
};
