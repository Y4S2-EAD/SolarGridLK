import apiClient from "./apiClient";

export const getUsers = async () => {
    // Retrieve all system users.
    const response = await apiClient.get("/users");

    return response.data;
};

export const getUserById = async (id) => {
    // Retrieve one system user by ID.
    const response = await apiClient.get(`/users/${id}`);

    return response.data;
};

export const createUser = async (userData) => {
    // Create a new Backoffice or Grid Operator account.
    const response = await apiClient.post(
        "/users",
        userData
    );

    return response.data;
};

export const updateUser = async (id, userData) => {
    // Update an existing system user.
    const response = await apiClient.put(
        `/users/${id}`,
        userData
    );

    return response.data;
};

export const deleteUser = async (id) => {
    // Delete a system user.
    const response = await apiClient.delete(
        `/users/${id}`
    );

    return response.data;
};