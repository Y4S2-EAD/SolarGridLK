const tableColumns = ["Node ID", "Name", "Location", "Capacity", "Battery slots", "Status", "Actions"];

const NodeManagementPage = () => {
    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-grotesk text-xl font-semibold">Microgrid Node Management</h2>
                    <p className="text-sm text-[#7c8ba6] mt-1">
                        Backoffice users manage microgrid nodes.
                    </p>
                </div>

                {/* Structure only. Create, view, edit, schedule, and deactivate are not wired yet. */}
                <button
                    type="button"
                    className="flex items-center gap-1.5 shrink-0 text-sm font-medium bg-[#f4a93b] hover:bg-[#ffbb52] text-[#0b1120] rounded-md px-3.5 py-2 transition-colors"
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                    Create Node
                </button>
            </div>

            <div className="bg-[#101a30] border border-[#1c2942] rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2942]">
                    <h3 className="font-grotesk text-sm font-semibold">Nodes</h3>
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
                            <tr>
                                <td colSpan={tableColumns.length} className="px-5 py-12 text-center text-[#7c8ba6]">
                                    <div className="mx-auto max-w-sm">
                                        <p className="font-medium text-[#a7b2c7]">No nodes loaded</p>
                                        <p className="mt-1 text-xs">
                                            The node list will appear here. View, Edit, Schedule, and Deactivate will be available for each node.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default NodeManagementPage;
