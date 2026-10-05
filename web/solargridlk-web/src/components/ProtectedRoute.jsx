import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Protect routes based on authentication and user roles.
const ProtectedRoute = ({ allowedRoles, children }) => {
    const { isAuthenticated, user } = useAuth();

    // Not logged in → send to login.
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but role not permitted → send to their own home.
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        const home =
            user?.role === "Backoffice" ? "/backoffice" : "/grid-operator";
        return <Navigate to={home} replace />;
    }

    return children;
};

export default ProtectedRoute;