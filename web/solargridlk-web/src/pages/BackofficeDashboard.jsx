import { useAuth } from "../context/AuthContext";

const BackofficeDashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div>
            <h1>Backoffice Dashboard</h1>

            <p>
                Welcome, {user?.fullName}
            </p>

            <p>
                Role: {user?.role}
            </p>

            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
};

export default BackofficeDashboard;