import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import BackofficeDashboard from "./pages/BackofficeDashboard";
import UserManagementPage from "./pages/UserManagementPage";
import ProsumerManagementPage from "./pages/ProsumerManagementPage";
import ProsumerDetailsPage from "./pages/ProsumerDetailsPage";
import NodeManagementPage from "./pages/NodeManagementPage";
import NodeDetailsPage from "./pages/NodeDetailsPage";
import ReservationsPage from "./pages/ReservationsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import BackofficeLayout from "./components/BackofficeLayout";

import GridOperatorLayout from "./components/GridOperatorLayout";
import VerifyTransferPage from "./pages/VerifyTransferPage";
import TransfersMonitorPage from "./pages/TransfersMonitorPage";
import NodeOperationsPage from "./pages/NodeOperationsPage";
import NodeOperationDetailsPage from "./pages/NodeOperationDetailsPage";

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route
                        path="/login"
                        element={<LoginPage />}
                    />

                    <Route
                        path="/backoffice"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "Backoffice",
                                ]}
                            >
                                <BackofficeLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route
                            index
                            element={
                                <BackofficeDashboard />
                            }
                        />

                        <Route
                            path="users"
                            element={
                                <UserManagementPage />
                            }
                        />

                        <Route
                            path="prosumers"
                            element={
                                <ProsumerManagementPage />
                            }
                        />

                        <Route
                            path="prosumers/:nic"
                            element={
                                <ProsumerDetailsPage />
                            }
                        />

                        <Route
                            path="nodes"
                            element={
                                <NodeManagementPage />
                            }
                        />

                        <Route
                            path="nodes/:nodeId"
                            element={
                                <NodeDetailsPage />
                            }
                        />

                        <Route
                            path="reservations"
                            element={<ReservationsPage />}
                        />
                    </Route>

                    <Route
                        path="/grid-operator"
                        element={
                            <ProtectedRoute allowedRoles={["GridOperator"]}>
                                <GridOperatorLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<TransfersMonitorPage />} />
                        <Route path="nodes" element={<NodeOperationsPage />} />
                        <Route path="nodes/:nodeId" element={<NodeOperationDetailsPage />} />
                        <Route path="verify" element={<VerifyTransferPage />} />

                        <Route
                            path="reservations"
                            element={<ReservationsPage />}
                        />
                    </Route>
                    <Route
                        path="/grid-operator/verify"
                        element={
                            <ProtectedRoute allowedRoles={["GridOperator"]}>
                                <VerifyTransferPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/grid-operator/transfers"
                        element={
                            <ProtectedRoute allowedRoles={["GridOperator"]}>
                                <TransfersMonitorPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="*"
                        element={
                            <Navigate
                                to="/login"
                                replace
                            />
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;