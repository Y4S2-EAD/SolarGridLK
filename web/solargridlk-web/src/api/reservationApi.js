import apiClient from "./apiClient";

// Retrieve reservations for monitoring, optionally filtered (status / prosumerNic / search).
export const getReservations = async (params = {}) => {
    const response = await apiClient.get("/reservations", { params });
    return response.data; // { success, message, data: [ ...reservations ] }
};