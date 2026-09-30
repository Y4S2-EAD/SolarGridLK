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

export const completeReservation = async (id) => {
    const response = await apiClient.post(`/reservations/${id}/complete`);
    return response.data;
};

export const cancelReservation = async (id) => {
    const response = await apiClient.delete(`/reservations/${id}`);
    return response.data;
};

// Turn an Axios error into { code, message, refreshSlots } for the reservation page.
export const interpretReservationError = (error) => {
    const status = error?.response?.status;
    const serverMessage = error?.response?.data?.message;

    if (status === 401) {
        return { code: 401, message: "Your session has expired. Please log in again." };
    }
    if (status === 403) {
        return { code: 403, message: "You do not have permission to modify reservations." };
    }
    if (status === 404) {
        return { code: 404, message: serverMessage || "Reservation not found." };
    }
    if (status === 409) {
        // The slot filled up (or was taken) since the user last looked; the page reloads the slots.
        return {
            code: 409,
            refreshSlots: true,
            message: serverMessage || "That slot is full. Please pick another one.",
        };
    }
    return {
        code: status,
        message: serverMessage || "An error occurred while processing your request.",
    };
};