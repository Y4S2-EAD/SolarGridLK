import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Protect routes based on authentication and user roles.
const ProtectedRoute = ({
    children,
    allowedRoles = [],
}) => {
    const {
        isAuthenticated,
        user,
    } = useAuth();

    // Redirect unauthenticated users to the login page.
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Redirect authenticated users who do not have the required role.
    if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user?.role)
    ) {
        if (user?.role === "Backoffice") {
            return (
                <Navigate
                    to="/backoffice"
                    replace
                />
            );
        }

        // Redirect Grid Operators to the Grid Operator dashboard.
        if (user?.role === "GridOperator") {
            return (
                <Navigate
                    to="/grid-operator"
                    replace
                />
            );
        }

        // Redirect users with an unknown role to the login page.
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;