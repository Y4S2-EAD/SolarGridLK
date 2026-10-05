import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

// Create a context to manage authentication across the application.
const AuthContext = createContext(null);

// Provide authentication data and functions to child components.
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(
        localStorage.getItem("solarGridToken")
    );

    // Load the saved user information from local storage.
    const [user, setUser] = useState(() => {
        const storedUser =
            localStorage.getItem("solarGridUser");

        return storedUser
            ? JSON.parse(storedUser)
            : null;
    });

    // Store the login token and user information after successful login.
    const login = (loginData) => {
        const tokenValue = loginData.data.token;

        const userData = {
            username: loginData.data.username,
            role: loginData.data.role,
            fullName: loginData.data.fullName,
            expiresAt: loginData.data.expiresAt,
        };

        localStorage.setItem(
            "solarGridToken",
            tokenValue
        );

        localStorage.setItem(
            "solarGridUser",
            JSON.stringify(userData)
        );

        setToken(tokenValue);
        setUser(userData);
    };

    // Clear authentication data when the user logs out.
    const logout = () => {
        localStorage.removeItem("solarGridToken");
        localStorage.removeItem("solarGridUser");

        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        if (!token) {
            return;
        }

        if (!user) {
            logout();
        }
    }, []);

    // Determine whether the user is currently authenticated.
    const isAuthenticated =
        Boolean(token && user);

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                isAuthenticated,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};