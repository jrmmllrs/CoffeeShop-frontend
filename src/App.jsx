// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import POS from "./components/POS";
import Sales from "./components/Sales";
import Reports from "./components/Reports";
import UserManagement from "./components/UserManagement";

// Protected Route Component with Role-based Access
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect based on user role
    if (user?.role === "admin") {
      return <Navigate to="/dashboard" />;
    } else if (user?.role === "manager") {
      return <Navigate to="/products" />;
    } else if (user?.role === "cashier") {
      return <Navigate to="/pos" />;
    }
    // Default fallback
    return <Navigate to="/pos" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected Routes - Admin only */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - Admin and Manager */}
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Products />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <Sales />
                </ProtectedRoute>
              }
            />

            {/* POS - All authenticated users can access */}
            <Route
              path="/pos"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager", "cashier"]}>
                  <POS />
                </ProtectedRoute>
              }
            />

            {/* Default redirect based on role */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />

            {/* Unauthorized Page */}
            <Route
              path="/unauthorized"
              element={
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
                  <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Access Denied
                    </h1>
                    <p className="text-gray-600 mb-6">
                      You don't have permission to access this page.
                    </p>
                    <RoleBasedUnauthorizedLink />
                  </div>
                </div>
              }
            />

            {/* 404 Page */}
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-amber-50">
                  <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h1 className="text-6xl font-bold text-gray-900 mb-2">
                      404
                    </h1>
                    <p className="text-gray-600 mb-6">
                      Oops! The page you're looking for doesn't exist.
                    </p>
                    <RoleBasedHomeLink />
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Helper component for role-based redirect
const RoleBasedRedirect = () => {
  const { user } = useAuth();

  // Redirect based on user role
  if (user?.role === "admin") {
    return <Navigate to="/dashboard" />;
  } else if (user?.role === "manager") {
    return <Navigate to="/products" />;
  } else if (user?.role === "cashier") {
    return <Navigate to="/pos" />;
  }

  // Default fallback
  return <Navigate to="/pos" />;
};

// Helper component for unauthorized page link based on role
const RoleBasedUnauthorizedLink = () => {
  const { user } = useAuth();

  let link = "/pos";
  let linkText = "Go to POS";

  if (user?.role === "admin") {
    link = "/dashboard";
    linkText = "Go to Dashboard";
  } else if (user?.role === "manager") {
    link = "/products";
    linkText = "Go to Products";
  }

  return (
    <a
      href={link}
      className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg"
    >
      {linkText}
    </a>
  );
};

// Helper component for 404 page link based on role
const RoleBasedHomeLink = () => {
  const { user } = useAuth();

  let link = "/pos";
  let linkText = "Go to POS";

  if (user?.role === "admin") {
    link = "/dashboard";
    linkText = "Go to Dashboard";
  } else if (user?.role === "manager") {
    link = "/products";
    linkText = "Go to Products";
  }

  return (
    <a
      href={link}
      className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg"
    >
      {linkText}
    </a>
  );
};

export default App