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

import ProtectedRoute from "./components/ProtectedRoute";
import BackofficeLayout from "./components/BackofficeLayout";

import GridOperatorLayout from "./components/GridOperatorLayout";
import VerifyTransferPage from "./pages/VerifyTransferPage";
import TransfersMonitorPage from "./pages/TransfersMonitorPage";

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
                        <Route path="verify" element={<VerifyTransferPage />} />
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