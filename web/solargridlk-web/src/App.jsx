import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import BackofficeDashboard from "./pages/BackofficeDashboard";
import GridOperatorDashboard from "./pages/GridOperatorDashboard";
import UserManagementPage from "./pages/UserManagementPage";

import ProtectedRoute from "./components/ProtectedRoute";
import BackofficeLayout from "./components/BackofficeLayout";

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
                            <ProtectedRoute
                                allowedRoles={[
                                    "GridOperator",
                                ]}
                            >
                                <GridOperatorDashboard />
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