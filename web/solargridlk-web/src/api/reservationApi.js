import apiClient from "./apiClient";

// Retrieve reservations for monitoring, optionally filtered (status / prosumerNic / search).
export const getReservations = async (params = {}) => {
    const response = await apiClient.get("/reservations", { params });
    return response.data; // { success, message, data: [ ...reservations ] }
};

export const createReservation = async (payload) => {
    const response = await apiClient.post("/reservations", payload);
    return response.data;
};

export const updateReservation = async (id, payload) => {
    const response = await apiClient.put(`/reservations/${id}`, payload);
    return response.data;
};

export const approveReservation = async (id) => {
    const response = await apiClient.post(`/reservations/${id}/approve`);
    return response.data;
};

export const cancelReservation = async (id) => {
    const response = await apiClient.delete(`/reservations/${id}`);
    return response.data;
};