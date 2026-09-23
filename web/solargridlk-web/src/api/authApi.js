import apiClient from "./apiClient";

// Send login credentials to the backend and return the response data.
export const login = async (username, password) => {
    const response = await apiClient.post("/auth/login", {
        username,
        password,
    });

    return response.data;
};