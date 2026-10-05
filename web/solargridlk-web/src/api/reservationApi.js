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

export const interpretReservationError = (message, status) => {
    if (status === 401) {
        return "Your session has expired. Please log in again.";
    }
    if (status === 403) {
        return "You do not have permission to modify reservations.";
    }
    if (status === 404) {
        return message || "Reservation not found.";
    }
    if (message && message.toLowerCase().includes("not available")) {
        return "The requested reservation slot is not available.";
    }
    return "An error occurred while processing your request.";
}