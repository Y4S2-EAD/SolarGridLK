import { useAuth } from "../context/AuthContext";

const GridOperatorDashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div>
            <h1>Grid Operator Dashboard</h1>

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

export default GridOperatorDashboard;