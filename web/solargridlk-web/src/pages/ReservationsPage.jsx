import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    approveReservation,
    cancelReservation,
    createReservation,
    getReservations,
    updateReservation,
} from "../api/reservationApi";

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
    Cancelled: "text-red-400 bg-red-400/10",
};

const ReservationsPage = () => {
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
    }, []);

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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-[#7c8ba6]">
                    Manage energy reservations and their approval status.
                </p>
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

            <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                    <h2 className="font-grotesk text-sm font-semibold">Reservations</h2>
                    <span className="text-xs text-[#7c8ba6]">
                        {loading ? "Loading..." : `${reservations.length} total`}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                <th className="font-normal px-5 py-3">Prosumer NIC</th>
                                <th className="font-normal px-5 py-3">Node</th>
                                <th className="font-normal px-5 py-3">Slot</th>
                                <th className="font-normal px-5 py-3">Status</th>
                                <th className="font-normal px-5 py-3">QR Token</th>
                                <th className="font-normal px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-[#7c8ba6]">
                                        Loading reservations...
                                    </td>
                                </tr>
                            )}

                            {!loading && reservations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-[#7c8ba6]">
                                        No reservations found.
                                    </td>
                                </tr>
                            )}

                            {!loading && reservations.map((reservation) => (
                                <tr
                                    key={reservation.id}
                                    className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors"
                                >
                                    <td className="px-5 py-3">{reservation.prosumerNic}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">{reservation.nodeId}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">
                                        {reservation.slotDateTime
                                            ? new Date(reservation.slotDateTime).toLocaleString()
                                            : "-"}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ${
                                                statusStyles[reservation.status] ??
                                                "text-[#a7b2c7] bg-[#182338]"
                                            }`}
                                        >
                                            {reservation.status || "Unknown"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {reservation.qrCode ? (
                                            <code className="text-xs text-[#a7b2c7] bg-[#182338] px-2 py-1 rounded font-mono">
                                                {reservation.qrCode}
                                            </code>
                                        ) : (
                                            <span className="text-[#5c6b88] text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isFormOpen && (
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
                                                Node ID
                                            </label>
                                            <input
                                                id="nodeId"
                                                name="nodeId"
                                                type="text"
                                                value={formData.nodeId}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-[#0b1120] border border-[#2a3a56] rounded-md px-3.5 py-2.5 text-sm text-[#e7ecf5] focus:outline-none focus:border-[#f4a93b]"
                                            />
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
