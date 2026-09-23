import apiClient from "./apiClient";

// Verify a scanned/entered QR token and finalize the energy transfer.
export const verifyQrToken = async (token) => {
    const response = await apiClient.post("/qr/verify", { token });
    return response.data; // { success, message, data: { reservationId, prosumerNic, nodeId, slotDateTime, status } }
};

// Fetch the QR image (base64 data URI) for a reservation, for display.
export const getQrImage = async (reservationId) => {
    const response = await apiClient.get(`/qr/reservations/${reservationId}/image`);
    return response.data; // { success, message, data: "data:image/png;base64,..." }
};