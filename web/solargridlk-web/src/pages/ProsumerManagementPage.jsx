import { useState } from "react";
import { getProsumerByNic } from "../api/prosumerApi";

const tableColumns = ["NIC", "Full name", "Email", "Phone", "Status", "Actions"];

const SkeletonRow = () => (
    <tr className="border-b border-[#1c2942] last:border-0">
        {Array.from({ length: tableColumns.length }).map((_, index) => (
            <td key={index} className="px-5 py-4">
                <div
                    className="h-3.5 rounded bg-[#182338] animate-pulse"
                    style={{ width: `${55 + index * 6}%` }}
                />
            </td>
        ))}
    </tr>
);

const actionButtonClass =
    "text-xs text-[#a7b2c7] border border-[#2a3a56] rounded-md px-2.5 py-1.5";

const ProsumerManagementPage = () => {
    const [nicInput, setNicInput] = useState("");
    const [searchedNic, setSearchedNic] = useState("");
    const [prosumer, setProsumer] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const lookupProsumer = async (nic) => {
        const trimmedNic = nic.trim();

        if (!trimmedNic) {
            setError("Enter a NIC to look up a prosumer.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setNotFound(false);

            const response = await getProsumerByNic(trimmedNic);
            setSearchedNic(trimmedNic);

            if (response.success && response.data) {
                setProsumer(response.data);
            } else {
                setProsumer(null);
                setNotFound(true);
            }
        } catch (requestError) {
            console.error("Failed to load prosumer:", requestError);
            setSearchedNic(trimmedNic);

            const status = requestError.response?.status;

            if (status === 404) {
                setProsumer(null);
                setNotFound(true);
                setError("");
            } else if (status === 401) {
                setProsumer(null);
                setNotFound(false);
                setError("Your session has expired. Please log in again.");
            } else if (status === 403) {
                setProsumer(null);
                setNotFound(false);
                setError("You do not have permission to view prosumers.");
            } else {
                setProsumer(null);
                setNotFound(false);
                setError(
                    requestError.response?.data?.message ||
                        "Unable to load the prosumer."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLookup = (event) => {
        event.preventDefault();
        lookupProsumer(nicInput);
    };

    const handleRefresh = () => {
        if (!searchedNic || loading) {
            return;
        }

        lookupProsumer(searchedNic);
    };

    const isActive = prosumer?.status === "Active";

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-grotesk text-xl font-semibold">Prosumer Management</h2>
                    <p className="text-sm text-[#7c8ba6] mt-1">
                        Backoffice users manage prosumer accounts.
                    </p>
                    <p className="text-xs text-[#7c8ba6] mt-1">
                        Look up one account by NIC. A full prosumer list is not available from the current API.
                    </p>
                </div>

                {/* Create is reserved for a later step and does not call the API yet. */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 shrink-0 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    Create Prosumer
                </button>
            </div>

            {error && (
                <div className="bg-red-600/10 border border-red-600/40 text-red-300 px-4 py-2.5 rounded-md text-sm flex items-center justify-between">
                    {error}
                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="text-red-300/70 hover:text-red-300"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                <div className="flex flex-col gap-4 px-5 py-4 border-b border-[#1c2942] lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="font-grotesk text-sm font-semibold">Prosumers</h3>
                        <p className="mt-1 text-xs text-[#7c8ba6]">
                            {loading
                                ? "Loading…"
                                : prosumer
                                ? "1 shown"
                                : "0 shown"}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <form onSubmit={handleLookup} className="flex gap-2">
                            <label className="min-w-0 sm:w-56">
                                <span className="sr-only">Prosumer NIC</span>
                                <input
                                    type="search"
                                    value={nicInput}
                                    onChange={(event) => setNicInput(event.target.value)}
                                    placeholder="Enter NIC"
                                    disabled={loading}
                                    className="w-full rounded-md border border-[#2a3a56] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] placeholder:text-[#5c6b88] focus:border-[#f4a93b] focus:outline-none disabled:opacity-60"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={loading}
                                className="text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] disabled:opacity-60 disabled:cursor-not-allowed text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                            >
                                Look up
                            </button>
                        </form>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={!searchedNic || loading}
                            className="text-sm text-[#a7b2c7] hover:text-[#e7ecf5] border border-[#2a3a56] hover:border-[#3a4a68] disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3 py-2 transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                {tableColumns.map((column) => (
                                    <th
                                        key={column}
                                        className={`font-normal px-5 py-3 ${
                                            column === "Actions" ? "text-right" : ""
                                        }`}
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <SkeletonRow />}

                            {!loading && !prosumer && !searchedNic && (
                                <tr>
                                    <td
                                        colSpan={tableColumns.length}
                                        className="px-5 py-12 text-center text-[#7c8ba6]"
                                    >
                                        <div className="mx-auto max-w-sm">
                                            <p className="font-medium text-[#a7b2c7]">No prosumer loaded</p>
                                            <p className="mt-1 text-xs">
                                                Enter a NIC and look up the account. Nothing is listed until a match is found.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && !prosumer && notFound && (
                                <tr>
                                    <td
                                        colSpan={tableColumns.length}
                                        className="px-5 py-12 text-center text-[#7c8ba6]"
                                    >
                                        <div className="mx-auto max-w-sm">
                                            <p className="font-medium text-[#a7b2c7]">No prosumer found</p>
                                            <p className="mt-1 text-xs">
                                                No account matches NIC {searchedNic}.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && !prosumer && searchedNic && !notFound && (
                                <tr>
                                    <td
                                        colSpan={tableColumns.length}
                                        className="px-5 py-12 text-center text-[#7c8ba6]"
                                    >
                                        The prosumer could not be loaded.
                                    </td>
                                </tr>
                            )}

                            {!loading && prosumer && (
                                <tr className="border-b border-[#1c2942] last:border-0 hover:bg-[#132038] transition-colors">
                                    <td className="px-5 py-3 font-medium">{prosumer.nic}</td>
                                    <td className="px-5 py-3">{prosumer.fullName}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">{prosumer.email}</td>
                                    <td className="px-5 py-3 text-[#a7b2c7]">{prosumer.phoneNumber}</td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-xs ${
                                                isActive ? "text-emerald-400" : "text-[#5c6b88]"
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    isActive ? "bg-emerald-400" : "bg-[#5c6b88]"
                                                }`}
                                            />
                                            {prosumer.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {/* Actions are visible only. They do not call the API yet. */}
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button type="button" className={actionButtonClass}>
                                                View
                                            </button>
                                            <button type="button" className={actionButtonClass}>
                                                Edit
                                            </button>
                                            {isActive ? (
                                                <button
                                                    type="button"
                                                    className="text-xs text-red-300 border border-red-900/40 rounded-md px-2.5 py-1.5"
                                                >
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="text-xs text-emerald-300 border border-emerald-900/40 rounded-md px-2.5 py-1.5"
                                                >
                                                    Reactivate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProsumerManagementPage;
