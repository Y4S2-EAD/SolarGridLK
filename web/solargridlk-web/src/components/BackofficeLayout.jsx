import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BackofficeLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear authentication data and return to the login page.
        logout();
        navigate("/login");
    };

    const isActive = (path) => {
        // Determine whether a navigation item matches the current route.
        return location.pathname === path;
    };

    return (
        <div className="backoffice-layout">
            <aside className="backoffice-sidebar">
                <div>
                    <h2>SolarGridLK</h2>
                    <p>Backoffice</p>
                </div>

                <nav>
                    <Link
                        to="/backoffice"
                        className={
                            isActive("/backoffice")
                                ? "active"
                                : ""
                        }
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/backoffice/users"
                        className={
                            isActive("/backoffice/users")
                                ? "active"
                                : ""
                        }
                    >
                        User Management
                    </Link>
                </nav>

                <div className="backoffice-user">
                    <p>{user?.fullName}</p>
                    <small>{user?.role}</small>

                    <button onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="backoffice-content">
                <Outlet />
            </main>
        </div>
    );
};

export default BackofficeLayout;