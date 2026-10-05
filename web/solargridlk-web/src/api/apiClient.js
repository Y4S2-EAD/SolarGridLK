import axios from "axios";

// Create a reusable Axios client for the SolarGridLK API.
const apiClient = axios.create({
    baseURL:
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:5136/api",
    headers: {
        "Content-Type": "application/json",
    },
});

// Automatically attach the JWT token to every API request.
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("solarGridToken");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;