import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
    createUser,
    deleteUser,
    getUsers,
    updateUser,
} from "../api/userApi";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/backoffice", label: "Overview", end: true },
    { to: "/backoffice/users", label: "User Management" },
    { to: "/backoffice/trades", label: "Trades" },
    { to: "/backoffice/settlements", label: "Settlements" },
    { to: "/backoffice/approvals", label: "Approvals" },
    { to: "/backoffice/reports", label: "Reports" },
];

const emptyForm = {
    username: "",
    password: "",
    fullName: "",
    role: "GridOperator",
    isActive: true,
};

const roleBadgeStyles = {
    Backoffice: "text-sky-300 bg-sky-400/10",
    GridOperator: "text-[#f4a93b] bg-[#f4a93b]/10",
};

const initialsOf = (name = "?") =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "?";

const SkeletonRow = () => (
    <tr className="border-b border-[#1c2942] last:border-0">
        {Array.from({ length: 6 }).map((_, i) => (
            <td key={i} className="px-5 py-4">
                <div className="h-3.5 rounded bg-[#182338] animate-pulse" style={{ width: `${55 + i * 6}%` }} />
            </td>
        ))}
    </tr>
);

const UserManagementPage = () => {
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState(emptyForm);
    const [editingUserId, setEditingUserId] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Load all users from the API.
    const loadUsers = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getUsers();

            if (response.success) {
                setUsers(response.data || []);
            } else {
                setError(response.message || "Unable to load users.");
            }
        } catch (error) {
            console.error("Failed to load users:", error);

            if (error.response?.status === 401) {
                setError("Your session has expired. Please log in again.");
            } else if (error.response?.status === 403) {
                setError("You do not have permission to manage users.");
            } else {
                setError(error.response?.data?.message || "Unable to load users.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Update the user form when a field changes.
    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // Reset the form and exit edit mode.
    const resetForm = () => {
        setFormData(emptyForm);
        setEditingUserId(null);
        setError("");
        setIsFormOpen(false);
    };

    // Create a new user or update an existing user.
    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");
        setSaving(true);

        try {
            let response;

            if (editingUserId) {
                const updateData = {
                    fullName: formData.fullName,
                    role: formData.role,
                    isActive: formData.isActive,
                };

                if (formData.password.trim()) {
                    updateData.password = formData.password;
                }

                response = await updateUser(editingUserId, updateData);
            } else {
                response = await createUser({
                    username: formData.username,
                    password: formData.password,
                    fullName: formData.fullName,
                    role: formData.role,
                });
            }

            if (!response.success) {
                setError(response.message || "Operation failed.");
                return;
            }

            setSuccess(editingUserId ? "User updated successfully." : "User created successfully.");
            resetForm();
            await loadUsers();
        } catch (error) {
            console.error("User operation failed:", error);
            setError(error.response?.data?.message || "Unable to complete the operation.");
        } finally {
            setSaving(false);
        }
    };

    // Load a selected user's information into the form.
    const handleEdit = (selectedUser) => {
        setEditingUserId(selectedUser.id);

        setFormData({
            username: selectedUser.username,
            password: "",
            fullName: selectedUser.fullName,
            role: selectedUser.role,
            isActive: selectedUser.isActive,
        });

        setError("");
        setSuccess("");
        setIsFormOpen(true);
    };

    const openCreateForm = () => {
        setFormData(emptyForm);
        setEditingUserId(null);
        setError("");
        setSuccess("");
        setIsFormOpen(true);
    };

    // Delete a selected user after confirmation.
    const handleDelete = async (selectedUser) => {
        if (selectedUser.id === currentUser?.id) {
            setError("You cannot delete your own account.");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete "${selectedUser.username}"?`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            const response = await deleteUser(selectedUser.id);

            if (!response.success) {
                setError(response.message || "Unable to delete user.");
                return;
            }

            setSuccess("User deleted successfully.");
            await loadUsers();
        } catch (error) {
            console.error("Delete user failed:", error);
            setError(error.response?.data?.message || "Unable to delete user.");
        }
    };

    return (
        <div className="min-h-screen flex bg-[#0b1120] font-body text-[#e7ecf5]">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#1c2942] px-5 py-6">
                <div className="flex items-center gap-2 font-grotesk font-semibold text-[1.05rem] mb-10 px-1">
                    <span className="w-2 h-2 rounded-full bg-[#f4a93b]" aria-hidden="true" />
                    SolarGridLK
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `block px-3 py-2 rounded-md text-sm transition-colors ${
                                    isActive
                                        ? "bg-[#f4a93b]/10 text-[#f4a93b] font-medium"
                                        : "text-[#a7b2c7] hover:bg-[#132038] hover:text-[#e7ecf5]"
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="pt-5 border-t border-[#1c2942] text-xs text-[#7c8ba6]">
                    Backoffice Console v1.0
                </div>
            </aside>

            {/* Main column */}
            <div className="flex-1 min-w-0 flex flex-col relative">
                {/* Topbar */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-[#1c2942]">
                    <div>
                        <h1 className="font-grotesk text-lg font-semibold leading-tight">
                            User Management
                        </h1>
                        <p className="text-xs text-[#7c8ba6]">
                            Manage Backoffice and Grid Operator accounts
                        </p>
                    </div>

                    <button
                        onClick={openCreateForm}
                        className="flex items-center gap-1.5 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                        Add user
                    </button>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-4">
                    {success && (
                        <div className="bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 px-4 py-2.5 rounded-md text-sm flex items-center justify-between">
                            {success}
                            <button onClick={() => setSuccess("")} className="text-emerald-300/70 hover:text-emerald-300">
                                ✕
                            </button>
                        </div>
                    )}

                    {error && !isFormOpen && (
                        <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-4 py-2.5 rounded-md text-sm flex items-center justify-between">
                            {error}
                            <button onClick={() => setError("")} className="text-red-300/70 hover:text-red-300">
                                ✕
                            </button>
                        </div>
                    )}

                    <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                            <h2 className="font-grotesk text-sm font-semibold">System users</h2>
                            <span className="text-xs text-[#7c8ba6]">
                                {loading ? "Loading…" : `${users.length} total`}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                        <th className="font-normal px-5 py-3">User</th>
                                        <th className="font-normal px-5 py-3">Username</th>
                                        <th className="font-normal px-5 py-3">Role</th>
                                        <th className="font-normal px-5 py-3">Status</th>
                                        <th className="font-normal px-5 py-3">Created</th>
                                        <th className="font-normal px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading &&
                                        Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

                                    {!loading && users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center text-[#7c8ba6]">
                                                No users found.
                                            </td>
                                        </tr>
                                    )}

                                    {!loading &&
                                        users.map((selectedUser) => (
                                            <tr
                                                key={selectedUser.id}
                                                className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors"
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 shrink-0 rounded-full bg-[#182338] border border-[#2a3a56] flex items-center justify-center font-grotesk text-xs font-semibold text-[#a7b2c7]">
                                                            {initialsOf(selectedUser.fullName)}
                                                        </div>
                                                        <span className="font-medium">{selectedUser.fullName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-[#a7b2c7]">{selectedUser.username}</td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full ${
                                                            roleBadgeStyles[selectedUser.role] ?? "text-[#a7b2c7] bg-[#182338]"
                                                        }`}
                                                    >
                                                        {selectedUser.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 text-xs ${
                                                            selectedUser.isActive ? "text-emerald-400" : "text-[#5c6b88]"
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${
                                                                selectedUser.isActive ? "bg-emerald-400" : "bg-[#5c6b88]"
                                                            }`}
                                                        />
                                                        {selectedUser.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-[#7c8ba6]">
                                                    {new Date(selectedUser.createdAt).toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(selectedUser)}
                                                            className="text-xs text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-2.5 py-1.5 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(selectedUser)}
                                                            disabled={selectedUser.id === currentUser?.id}
                                                            className="text-xs text-red-300 hover:text-red-200 border border-red-900/40 hover:border-red-700/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-2.5 py-1.5 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                {/* Slide-over form drawer */}
                {isFormOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={saving ? undefined : resetForm}
                        />
                        <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0e1730] border-l border-[#1c2942] z-50 flex flex-col">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2942]">
                                <h2 className="font-grotesk text-lg font-semibold">
                                    {editingUserId ? "Edit user" : "Create user"}
                                </h2>
                                <button
                                    onClick={resetForm}
                                    disabled={saving}
                                    className="text-[#7c8ba6] hover:text-[#e7ecf5] disabled:opacity-40 transition-colors"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                                {error && (
                                    <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-3.5 py-2.5 rounded-md text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="username" className="block text-sm text-[#a7b2c7] mb-1.5">
                                        Username
                                    </label>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={handleChange}
                                        disabled={Boolean(editingUserId)}
                                        required
                                        className="w-full box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm text-[#a7b2c7] mb-1.5">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder={editingUserId ? "Leave blank to keep current password" : ""}
                                        required={!editingUserId}
                                        className="w-full box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b] transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="fullName" className="block text-sm text-[#a7b2c7] mb-1.5">
                                        Full name
                                    </label>
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        required
                                        className="w-full box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] placeholder-[#55637f] focus:outline-none focus:border-[#f4a93b] transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="role" className="block text-sm text-[#a7b2c7] mb-1.5">
                                        Role
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="w-full box-border px-3.5 py-2.5 bg-[#101a30] border border-[#2a3a56] rounded-md text-[#e7ecf5] text-[0.95rem] focus:outline-none focus:border-[#f4a93b] transition-colors"
                                    >
                                        <option value="Backoffice">Backoffice</option>
                                        <option value="GridOperator">Grid Operator</option>
                                    </select>
                                </div>

                                {editingUserId && (
                                    <label className="flex items-center gap-2 text-sm text-[#a7b2c7] cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={formData.isActive}
                                            onChange={handleChange}
                                            className="w-3.5 h-3.5 rounded-sm accent-[#f4a93b] bg-[#101a30] border-[#2a3a56]"
                                        />
                                        Active
                                    </label>
                                )}
                            </form>

                            <div className="flex items-center gap-3 px-6 py-5 border-t border-[#1c2942]">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    disabled={saving}
                                    className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-4 py-2.5 transition-colors disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] font-semibold text-sm rounded-md transition-colors"
                                >
                                    {saving && (
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                        </svg>
                                    )}
                                    {saving ? "Saving…" : editingUserId ? "Update user" : "Create user"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default UserManagementPage;