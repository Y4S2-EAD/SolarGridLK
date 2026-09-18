const tableColumns = ["NIC", "Full name", "Email", "Phone", "Status", "Created"];

const ProsumerManagementPage = () => {
    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-grotesk text-xl font-semibold">Prosumer Management</h2>
                    <p className="text-sm text-[#7c8ba6] mt-1">
                        Backoffice users manage prosumer accounts.
                    </p>
                </div>

                {/* Structure only. Create, update, and deactivate are not wired yet. */}
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

            <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                    <h3 className="font-grotesk text-sm font-semibold">Prosumers</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-[#7c8ba6] border-b border-[#1c2942]">
                                {tableColumns.map((column) => (
                                    <th key={column} className="font-normal px-5 py-3">
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={tableColumns.length} className="px-5 py-12 text-center text-[#7c8ba6]">
                                    The prosumer list will appear here.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProsumerManagementPage;
