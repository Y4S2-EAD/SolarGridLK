import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from "../context/AuthContext";
import {
    approveReservation,
    cancelReservation,
    createReservation,
    getReservations,
    updateReservation,
} from "../api/reservationApi";
import { getNodes } from "../api/nodeApi";

const emptyForm = {
    prosumerNic: "",
    nodeId: "",
    slotDate: "",
    slotTime: "",
};

const padNumber = (value) => String(value).padStart(2, "0");

const statusStyles = {
    Pending: "text-[#f4a93b] bg-[#f4a93b]/10",
    Approved: "text-emerald-400 bg-emerald-400/10",
    Completed: "text-sky-400 bg-sky-400/10",
    Cancelled: "text-red-400 bg-red-400/10",
};

const shortenToken = (token = "") =>
    token.length > 16 ? `${token.slice(0, 8)}...${token.slice(-5)}` : token;

const ReservationsPage = () => {
    const { user } = useAuth();
    const canManageReservations = user?.role === "GridOperator";
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [actionId, setActionId] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [editingReservationId, setEditingReservationId] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pickerValue, setPickerValue] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [copiedTokenId, setCopiedTokenId] = useState(null);

    const loadReservations = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getReservations();

            if (response.success) {
                setReservations(response.data || []);
            } else {
                setError(response.message || "Unable to load reservations.");
            }
        } catch (error) {
            console.error("Failed to load reservations:", error);
            setError(error.response?.data?.message || "Unable to load reservations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReservations();
        // Load nodes for the reservation form (show only active nodes)
        let cancelled = false;

        const loadNodes = async () => {
            try {
                const response = await getNodes();

                if (cancelled) return;

                if (response.success) {
                    setNodes(response.data || []);
                }
            } catch (err) {
                console.error("Failed to load nodes:", err);
            }
        };

        loadNodes();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredReservations = reservations.filter((reservation) => {
        const searchValue = searchTerm.trim().toLowerCase();
        const matchesSearch = !searchValue || [
            reservation.prosumerNic,
            reservation.nodeId,
            reservation.status,
        ].some((value) => String(value || "").toLowerCase().includes(searchValue));
        const matchesStatus = statusFilter === "All" || reservation.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const reservationCounts = {
        total: reservations.length,
        pending: reservations.filter(({ status }) => status === "Pending").length,
        approved: reservations.filter(({ status }) => status === "Approved").length,
        cancelled: reservations.filter(({ status }) => status === "Cancelled").length,
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const resetForm = () => {
        setFormData(emptyForm);
        setEditingReservationId(null);
        setIsFormOpen(false);
        setPickerValue(null);
        setError("");
    };

    const openCreateForm = () => {
        setFormData(emptyForm);
        setEditingReservationId(null);
        setPickerValue(null);
        setError("");
        setSuccess("");
        // If the logged-in user is a prosumer, prefill the NIC
        if (user?.role === "Prosumer" && user?.username) {
            setFormData((prev) => ({ ...prev, prosumerNic: user.username }));
        }
        setIsFormOpen(true);
    };

    const openEditForm = (reservation) => {
        setEditingReservationId(reservation.id);
        const selectedDate = reservation.slotDateTime
            ? new Date(reservation.slotDateTime)
            : null;

        setPickerValue(selectedDate);
        setFormData({
            prosumerNic: reservation.prosumerNic || "",
            nodeId: reservation.nodeId || "",
            slotDate: selectedDate
                ? `${selectedDate.getFullYear()}-${padNumber(selectedDate.getMonth() + 1)}-${padNumber(selectedDate.getDate())}`
                : "",
            slotTime: selectedDate
                ? `${padNumber(selectedDate.getHours())}:${padNumber(selectedDate.getMinutes())}`
                : "",
        });
        setError("");
        setSuccess("");
        setIsFormOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        setSaving(true);

        try {
            const slotDateTime = `${formData.slotDate}T${formData.slotTime}`;
            const response = editingReservationId
                ? await updateReservation(editingReservationId, {
                    slotDateTime: new Date(slotDateTime).toISOString(),
                })
                : await createReservation({
                    prosumerNic: formData.prosumerNic,
                    nodeId: formData.nodeId,
                    slotDateTime: new Date(slotDateTime).toISOString(),
                });

            if (!response.success) {
                setError(response.message || "Unable to save reservation.");
                return;
            }

            setSuccess(
                editingReservationId
                    ? "Reservation updated successfully."
                    : "Reservation created successfully."
            );
            resetForm();
            await loadReservations();
        } catch (error) {
            console.error("Reservation save failed:", error);
            setError(error.response?.data?.message || "Unable to save reservation.");
        } finally {
            setSaving(false);
        }
    };

    const handlePickerChange = (selectedDate) => {
        setPickerValue(selectedDate);

        if (!selectedDate) {
            setFormData((previous) => ({
                ...previous,
                slotDate: "",
                slotTime: "",
            }));
            return;
        }

        setFormData((previous) => ({
            ...previous,
            slotDate: `${selectedDate.getFullYear()}-${padNumber(selectedDate.getMonth() + 1)}-${padNumber(selectedDate.getDate())}`,
            slotTime: `${padNumber(selectedDate.getHours())}:${padNumber(selectedDate.getMinutes())}`,
        }));
    };

    const handleCopyToken = async (reservation) => {
        if (!reservation.qrCode) return;

        try {
            await navigator.clipboard.writeText(reservation.qrCode);
            setCopiedTokenId(reservation.id);
            window.setTimeout(() => setCopiedTokenId(null), 1800);
        } catch (error) {
            console.error("Unable to copy QR token:", error);
        }
    };

    const handleReservationAction = async (reservation, action) => {
    const actionName = action === "approve" ? "approve" : "cancel";
    const confirmed = window.confirm(
        `Are you sure you want to ${actionName} this reservation?`
    );

    if (!confirmed) return;

    try {
        setActionId(reservation.id);
        setError("");
        setSuccess("");

        const response =
            action === "approve"
                ? await approveReservation(reservation.id)
                : await cancelReservation(reservation.id);

        if (!response.success) {
            setError(response.message || "Reservation action failed.");
            return;
        }

        setSuccess(
            action === "approve"
                ? "Reservation approved successfully."
                : "Reservation cancelled successfully."
        );

        await loadReservations();
    } catch (error) {
        console.error("Reservation action failed:", error);
        setError(error.response?.data?.message || "Unable to update reservation.");
    } finally {
        setActionId(null);
    }
};

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#f4a93b]">
                        Reservation desk
                    </p>
                    <p className="mt-1 text-sm text-[#7c8ba6]">
                        {canManageReservations
                            ? "Manage energy reservations and their approval status."
                            : "View energy reservations and their current status."}
                    </p>
                </div>
                    
                {canManageReservations && (
                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="flex items-center gap-1.5 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                        Add reservation
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                    { label: "Total reservations", value: reservationCounts.total, color: "text-[#e7ecf5]" },
                    { label: "Awaiting approval", value: reservationCounts.pending, color: "text-[#f4a93b]" },
                    { label: "Approved", value: reservationCounts.approved, color: "text-emerald-400" },
                    { label: "Cancelled", value: reservationCounts.cancelled, color: "text-red-400" },
                ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-[#1c2942] bg-[#101a30] px-4 py-3 shadow-lg shadow-black/5">
                        <p className="text-xs text-[#7c8ba6]">{item.label}</p>
                        <p className={`mt-1 font-grotesk text-2xl font-semibold ${item.color}`}>
                            {loading ? "-" : item.value}
                        </p>
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-4 py-2.5 rounded-md text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 px-4 py-2.5 rounded-md text-sm">
                    {success}
                </div>
            )}

            {/* Status filter tabs */}
            <div className="mt-3 lg:mt-0">
                <div className="flex items-center gap-2">
                    {[
                        { key: "All", label: "All", count: reservationCounts.total },
                        { key: "Pending", label: "Pending", count: reservationCounts.pending },
                        { key: "Approved", label: "Approved", count: reservationCounts.approved },
                        { key: "Completed", label: "Completed", count: reservationCounts.completed },
                        { key: "Cancelled", label: "Cancelled", count: reservationCounts.cancelled },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setStatusFilter(tab.key)}
                            className={`text-xs font-medium rounded-md px-3 py-1.5 transition-colors ${statusFilter === tab.key ? 'bg-[#f4a93b] text-[#0b1120]' : 'bg-[#0b1120] text-[#a7b2c7] border border-[#2a3a56]'}`}
                        >
                            {tab.label}
                            <span className="ml-2 inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#0b1120] text-[#7c8ba6]">{tab.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[#101a30] border border-[#1c2942] rounded-lg overflow-hidden shadow-lg shadow-black/10">
                <div className="flex flex-col gap-4 border-b border-[#1c2942] bg-[#132038]/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="font-grotesk text-base font-semibold">Reservation queue</h2>
                        <p className="mt-1 text-xs text-[#7c8ba6]">
                            {loading ? "Loading reservations..." : `${filteredReservations.length} of ${reservations.length} reservations shown`}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="relative min-w-0 sm:w-64">
                            <span className="sr-only">Search reservations</span>
                            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7c8ba6]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-4-4" strokeLinecap="round" />
                            </svg>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search NIC or node"
                                className="w-full rounded-md border border-[#2a3a56] bg-[#0b1120] py-2 pl-9 pr-3 text-sm text-[#e7ecf5] placeholder:text-[#5c6b88] focus:border-[#f4a93b] focus:outline-none"
                            />
                        </label>
                        <label>
                            <span className="sr-only">Filter by status</span>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="w-full rounded-md border border-[#2a3a56] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] focus:border-[#f4a93b] focus:outline-none sm:w-36"
                            >
                                <option value="All">All statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </label>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wide text-[#7c8ba6] border-b border-[#1c2942] bg-[#0d1629]">
                                <th className="font-medium px-5 py-3.5">Prosumer NIC</th>
                                <th className="font-medium px-5 py-3.5">Node</th>
                                <th className="font-medium px-5 py-3.5">Reservation slot</th>
                                <th className="font-medium px-5 py-3.5">Status</th>
                                {canManageReservations && (
                                    <th className="font-medium px-5 py-3.5">QR Token</th>
                                )}
                                {canManageReservations && (
                                    <th className="font-medium px-5 py-3.5 text-right">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={canManageReservations ? 6 : 5} className="px-5 py-12 text-center text-[#7c8ba6]">
                                        Loading reservations...
                                    </td>
                                </tr>
                            )}

                            {!loading && reservations.length === 0 && (
                                <tr>
                                    <td colSpan={canManageReservations ? 6 : 5} className="px-5 py-12 text-center text-[#7c8ba6]">
                                        <div className="mx-auto max-w-xs">
                                            <p className="font-medium text-[#a7b2c7]">No reservations yet</p>
                                            <p className="mt-1 text-xs">New reservations will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && reservations.length > 0 && filteredReservations.length === 0 && (
                                <tr>
                                    <td colSpan={canManageReservations ? 6 : 5} className="px-5 py-12 text-center text-[#7c8ba6]">
                                        No reservations match your search.
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredReservations.map((reservation) => (
                                <tr
                                    key={reservation.id}
                                    className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors"
                                >
                                    <td className="px-5 py-4 font-medium text-[#e7ecf5]">{reservation.prosumerNic}</td>
                                    <td className="px-5 py-4 text-[#a7b2c7]">{reservation.nodeId}</td>
                                    <td className="px-5 py-4 text-[#a7b2c7]">
                                        {reservation.slotDateTime
                                            ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-[#e7ecf5]">
                                                        {new Date(reservation.slotDateTime).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-[#7c8ba6]">
                                                        {new Date(reservation.slotDateTime).toLocaleTimeString([], {
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                            )
                                            : "-"}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                                                statusStyles[reservation.status] ??
                                                "text-[#a7b2c7] bg-[#182338]"
                                            }`}
                                        >
                                            {reservation.status || "Unknown"}
                                        </span>
                                    </td>
                                    {canManageReservations && (
                                        <td className="px-5 py-4">
                                            {reservation.qrCode ? (
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs text-[#a7b2c7] font-mono" title="Token hidden for security">
                                                        {shortenToken(reservation.qrCode)}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyToken(reservation)}
                                                        className="rounded p-1 text-[#7c8ba6] transition-colors hover:bg-[#182338] hover:text-[#e7ecf5]"
                                                        aria-label={copiedTokenId === reservation.id ? "QR token copied" : "Copy QR token"}
                                                        title={copiedTokenId === reservation.id ? "Copied" : "Copy token"}
                                                    >
                                                        {copiedTokenId === reservation.id ? (
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="9" y="9" width="11" height="11" rx="2" />
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[#5c6b88] text-xs">-</span>
                                            )}
                                        </td>
                                    )}
                                    {canManageReservations && (
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1.5">
                                            {reservation.status === "Pending" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleReservationAction(reservation, "approve")}
                                                    disabled={actionId === reservation.id}
                                                    className="text-xs text-emerald-300 hover:text-emerald-200 border border-emerald-900/40 hover:border-emerald-700/50 disabled:opacity-40 rounded-md px-2.5 py-1.5"
                                                >
                                                    {actionId === reservation.id ? "Saving..." : "Approve"}
                                                </button>
                                            )}

                                            {reservation.status !== "Cancelled" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleReservationAction(reservation, "cancel")}
                                                    disabled={actionId === reservation.id}
                                                    className="text-xs text-red-300 hover:text-red-200 border border-red-900/40 hover:border-red-700/50 disabled:opacity-40 rounded-md px-2.5 py-1.5"
                                                >
                                                    Cancel
                                                </button>
                                            )}

                                            {(reservation.status === "Pending" || reservation.status === "Approved") && (
                                                <button
                                                    type="button"
                                                    onClick={() => openEditForm(reservation)}
                                                    className="text-xs text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] rounded-md px-2.5 py-1.5 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            )}

                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {canManageReservations && isFormOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={saving ? undefined : resetForm}
                        />
                        <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0e1730] border-l border-[#1c2942] z-50 flex flex-col">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1c2942]">
                                <h2 className="font-grotesk text-lg font-semibold">
                                    {editingReservationId ? "Edit reservation" : "Add reservation"}
                                </h2>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    disabled={saving}
                                    className="text-[#7c8ba6] hover:text-[#e7ecf5] disabled:opacity-40 transition-colors"
                                    aria-label="Close reservation form"
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

                                {!editingReservationId && (
                                    <>
                                        <div>
                                            <label htmlFor="prosumerNic" className="block text-sm text-[#a7b2c7] mb-1.5">
                                                Prosumer NIC
                                            </label>
                                            <input
                                                id="prosumerNic"
                                                name="prosumerNic"
                                                type="text"
                                                value={formData.prosumerNic}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-[#0b1120] border border-[#2a3a56] rounded-md px-3.5 py-2.5 text-sm text-[#e7ecf5] focus:outline-none focus:border-[#f4a93b]"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="nodeId" className="block text-sm text-[#a7b2c7] mb-1.5">
                                                Node
                                            </label>
                                            <select
                                                id="nodeId"
                                                name="nodeId"
                                                value={formData.nodeId}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-[#0b1120] border border-[#2a3a56] rounded-md px-3.5 py-2.5 text-sm text-[#e7ecf5] focus:outline-none focus:border-[#f4a93b]"
                                            >
                                                <option value="">Select a node</option>
                                                {nodes
                                                    .filter((n) => n.status === "Active")
                                                    .map((n) => (
                                                        <option key={n.nodeId} value={n.nodeId}>
                                                            {n.name} — {n.location} ({n.nodeId})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label htmlFor="slotDateTime" className="block text-sm text-[#a7b2c7] mb-1.5">
                                        Slot date and time
                                    </label>
                                    <DatePicker
                                        id="slotDateTime"
                                        selected={pickerValue}
                                        onChange={handlePickerChange}
                                        showTimeSelect
                                        timeIntervals={30}
                                        dateFormat="MMMM d, yyyy h:mm aa"
                                        placeholderText="Select date and time"
                                        required
                                        className="w-full bg-[#0b1120] border border-[#2a3a56] rounded-md px-3.5 py-2.5 text-sm text-[#e7ecf5] focus:outline-none focus:border-[#f4a93b]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 text-[#0b1120] font-medium rounded-md px-4 py-2.5 text-sm transition-colors"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingReservationId
                                        ? "Update reservation"
                                        : "Create reservation"}
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
};

export default ReservationsPage;
