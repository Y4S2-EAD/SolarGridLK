import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await loginApi(formData.username, formData.password);
            login(response);

            const role = response.data.role;

            if (role === "Backoffice") {
                navigate("/backoffice");
            } else if (role === "GridOperator") {
                navigate("/grid-operator");
            } else {
                setError("Unsupported user role.");
            }
        } catch (error) {
            if (error.response?.status === 401) {
                setError("Invalid username or password.");
            } else {
                setError("Unable to connect to the server.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1.05fr_1fr] bg-[#0b1120] font-body text-[#e7ecf5]">
            <style>{`
                @keyframes flow {
                    0%   { stroke-dashoffset: 24; opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: 1; }
                    100% { stroke-dashoffset: 0; opacity: 0; }
                }
                .pulse-line {
                    stroke-dasharray: 6 18;
                    animation: flow 2.8s linear infinite;
                }
                .pulse-line-delay {
                    animation-delay: 0.9s;
                }
            `}</style>

            {/* Left: brand / telemetry panel */}
            <aside
                className="relative hidden md:flex items-center overflow-hidden px-14 py-16 border-r border-[#1c2942]"
                style={{
                    backgroundColor: "#0b1120",
                    backgroundImage:
                        "radial-gradient(circle at 15% 20%, #16233d 0%, #0b1120 65%), radial-gradient(#182338 1px, transparent 1px)",
                    backgroundSize: "auto, 28px 28px",
                }}
            >
                <div className="max-w-md">
                    <div className="flex items-center gap-2 font-grotesk font-semibold text-[1.05rem] tracking-tight mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#f4a93b]" aria-hidden="true" />
                        SolarGridLK
                    </div>

                    <div className="flex items-center gap-2 mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span className="text-xs text-[#7c8ba6]">
                            System operational — 232.4 kW dispatched
                        </span>
                    </div>

                    <h1 className="font-grotesk font-semibold text-[2.1rem] leading-tight max-w-[20ch] mb-4">
                        Smart Solar Microgrid Trading System
                    </h1>

                    <p className="text-[#97a3bd] text-[0.98rem] leading-relaxed max-w-[34ch] mb-10">
                        Monitor generation, dispatch, and peer-to-peer trading
                        across the network from a single console.
                    </p>

                    <svg
                        viewBox="0 0 320 220"
                        aria-hidden="true"
                        className="w-full max-w-xs h-auto stroke-[#2a3a56] stroke-[1.5] fill-none mb-10"
                    >
                        <line x1="40" y1="40" x2="160" y2="110" />
                        <line x1="160" y1="110" x2="280" y2="60" />
                        <line x1="160" y1="110" x2="120" y2="190" />
                        <line x1="160" y1="110" x2="230" y2="180" />
                        <line x1="40" y1="40" x2="40" y2="130" />

                        {/* animated energy flow along two branches */}
                        <line
                            x1="40" y1="40" x2="160" y2="110"
                            className="pulse-line"
                            stroke="#f4a93b"
                            strokeWidth="2"
                        />
                        <line
                            x1="160" y1="110" x2="230" y2="180"
                            className="pulse-line pulse-line-delay"
                            stroke="#f4a93b"
                            strokeWidth="2"
                        />

                        <circle cx="160" cy="110" r="7" className="fill-[#f4a93b] stroke-none" />
                        <circle cx="40" cy="40" r="4" className="fill-[#f4a93b] stroke-none" />
                        <circle cx="280" cy="60" r="4" className="fill-[#3a4a68] stroke-none" />
                        <circle cx="120" cy="190" r="4" className="fill-[#3a4a68] stroke-none" />
                        <circle cx="230" cy="180" r="4" className="fill-[#f4a93b] stroke-none" />
                        <circle cx="40" cy="130" r="4" className="fill-[#3a4a68] stroke-none" />
                    </svg>

                    <dl className="flex gap-10 pt-7 border-t border-[#1c2942]">
                        <div>
                            <dt className="text-[0.8rem] text-[#7c8ba6] mb-1">
                                Prosumers connected
                            </dt>
                            <dd className="font-grotesk text-2xl font-semibold m-0">1,248</dd>
                        </div>
                        <div>
                            <dt className="text-[0.8rem] text-[#7c8ba6] mb-1">
                                Active trades today
                            </dt>
                            <dd className="font-grotesk text-2xl font-semibold m-0">312</dd>
                        </div>
                    </dl>
                </div>
            </aside>

            {/* Right: sign-in console */}
            <main className="flex items-center justify-center p-8">
                <div className="w-full max-w-sm border-l-2 border-[#f4a93b] pl-6">
                    <h2 className="font-grotesk text-2xl font-semibold mb-1">Sign in</h2>
                    <p className="text-[#7c8ba6] text-[0.92rem] mb-7">
                        Enter your operator credentials to continue.
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="bg-red-600/10 border border-red-600/40 text-red-300 px-3.5 py-2.5 rounded-md text-sm mb-5"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="mb-5">
                            <label htmlFor="username" className="block text-sm text-[#a7b2c7] mb-1.5">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className="w-full box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b] transition-colors"
                            />
                        </div>

                        <div className="mb-3">
                            <label htmlFor="password" className="block text-sm text-[#a7b2c7] mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full box-border px-3.5 py-2.5 pr-10 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b] transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-0 top-0 h-full px-3 flex items-center text-[#7c8ba6] hover:text-[#e7ecf5] transition-colors"
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.24A9.4 9.4 0 0 1 12 4c5 0 9 4 10 8a11.5 11.5 0 0 1-3.1 4.6M6.6 6.6C4.5 8 3 10 2 12c1 4 5 8 10 8a9.6 9.6 0 0 0 3.2-.55" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-6 text-sm">
                            <label className="flex items-center gap-2 text-[#a7b2c7] cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded-sm accent-[#f4a93b] bg-[#101a30] border-[#2a3a56]"
                                />
                                Remember me
                            </label>
                            <a href="/forgot-password" className="text-[#f4a93b] hover:text-[#ffbb52] transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 flex items-center justify-center gap-2 bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] font-semibold text-[0.95rem] rounded-md transition-colors"
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                </svg>
                            )}
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;