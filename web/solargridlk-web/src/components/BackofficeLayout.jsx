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
        <div className="min-h-screen flex bg-[#0b1120] font-body text-[#e7ecf5]">
            <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#1c2942] px-5 py-6">
                <div>
                    <h2 className="flex items-center gap-2 font-grotesk font-semibold text-[1.05rem] px-1 mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#f4a93b]" aria-hidden="true" />
                        SolarGridLK
                    </h2>
                    <p className="text-xs text-[#7c8ba6] px-1 mb-8">Backoffice</p>
                </div>

                <nav className="flex-1 space-y-1">
                    <Link
                        to="/backoffice"
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive("/backoffice")
                                ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                        }`}
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/backoffice/users"
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive("/backoffice/users")
                                ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                        }`}
                    >
                        User Management
                    </Link>

                    <Link
                        to="/backoffice/reservations"
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive("/backoffice/reservations")
                                ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                        }`}
                    >
                        Reservations
                    </Link>
                </nav>

                <div className="pt-5 border-t border-[#1c2942]">
                    <p className="text-sm font-medium leading-tight truncate">{user?.fullName}</p>
                    <small className="text-xs text-[#7c8ba6]">{user?.role}</small>

                    <button
                        onClick={handleLogout}
                        className="w-full mt-3 text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-3 py-2 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0 flex flex-col">
                <header className="flex items-center justify-between px-6 py-4 border-b border-[#1c2942]">
                    <h1 className="font-grotesk text-lg font-semibold">Backoffice</h1>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                <Outlet />
                </div>
            </main>
        </div>
    );
};

export default BackofficeLayout;