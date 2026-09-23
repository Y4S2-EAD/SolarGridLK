import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/grid-operator", label: "Transfers Monitor", end: true },
    { to: "/grid-operator/verify", label: "Verify Transfer" },
    { to: "/grid-operator/reservations", label: "Reservations" },

];

const initialsOf = (name = "?") =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "?";

const GridOperatorLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const isActive = (item) =>
        item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

    const currentLabel =
        [...navItems].reverse().find((item) => isActive(item))?.label ??
        "Grid Operator";

    return (
        <div className="min-h-screen flex bg-[#0b1120] font-body text-[#e7ecf5]">
            <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#1c2942] px-5 py-6">
                <div className="flex items-center gap-2 font-grotesk font-semibold text-[1.05rem] px-1 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#f4a93b]" aria-hidden="true" />
                    SolarGridLK
                </div>
                <p className="text-xs text-[#7c8ba6] px-1 mb-8">Grid Operator</p>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                                isActive(item)
                                    ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                    : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                            }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="pt-5 border-t border-[#1c2942]">
                    <div className="flex items-center gap-2.5 mb-3 px-1">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-[#132038] border border-[#2a3a56] flex items-center justify-center font-grotesk text-xs font-semibold text-[#f4a93b]">
                            {initialsOf(user?.fullName)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">
                                {user?.fullName}
                            </p>
                            <small className="text-xs text-[#7c8ba6]">{user?.role}</small>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-3 py-2 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col">
                <header className="flex items-center justify-between px-6 py-4 border-b border-[#1c2942]">
                    <h1 className="font-grotesk text-lg font-semibold leading-tight">
                        {currentLabel}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span className="text-xs text-[#7c8ba6] hidden sm:inline">Grid operational</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default GridOperatorLayout;