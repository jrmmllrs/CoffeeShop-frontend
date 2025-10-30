// src/components/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    recentSales: [],
    lowStockProducts: [],
    topProducts: [],
    cashierPerformance: [],
    hourlySales: [],
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Get today's date for filtering
      const today = new Date().toISOString().split("T")[0];
      const todayParams = new URLSearchParams();
      todayParams.append("start_date", today);
      todayParams.append("end_date", today);

      const [
        productsResponse,
        salesResponse,
        todaySalesResponse,
        inventoryResponse,
        cashiersResponse,
        hourlySalesResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales?limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales/report?${todayParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/inventory/low-stock?threshold=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/users/cashiers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales/hourly-sales?${todayParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!productsResponse.ok) throw new Error("Failed to fetch products");
      const productsData = await productsResponse.json();

      const salesData = salesResponse.ok ? await salesResponse.json() : [];
      const todaySalesData = todaySalesResponse.ok
        ? await todaySalesResponse.json()
        : [];
      const lowStockData = inventoryResponse.ok
        ? await inventoryResponse.json()
        : [];
      const cashiersData = cashiersResponse.ok
        ? await cashiersResponse.json()
        : [];
      const hourlySalesData = hourlySalesResponse.ok
        ? await hourlySalesResponse.json()
        : [];

      // Calculate statistics
      const totalProducts = productsData.length;
      const lowStockItems = lowStockData.length;
      const outOfStockItems = productsData.filter((p) => p.stock === 0).length;

      // Calculate today's revenue
      const todayRevenue = todaySalesData.reduce(
        (sum, day) => sum + parseFloat(day.total_revenue || 0),
        0
      );

      const todaySalesCount = todaySalesData.reduce(
        (sum, day) => sum + parseInt(day.total_sales || 0),
        0
      );

      // Get top selling products
      const topProducts = productsData
        .filter((p) => p.sales_count > 0)
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 5);

      // In the fetchDashboardData function, update the cashier performance calculation:
      const cashierPerformance = cashiersData
        .map((cashier) => {
          const cashierSales = salesData.filter(
            (sale) => sale.user_id === cashier.id
          );
          const totalSales = cashierSales.reduce(
            (sum, sale) => sum + parseFloat(sale.total || 0),
            0
          );

          return {
            id: cashier.id,
            name: cashier.name,
            username: cashier.username, // Use username instead of email
            salesCount: cashierSales.length,
            totalRevenue: totalSales,
            averageSale:
              cashierSales.length > 0 ? totalSales / cashierSales.length : 0,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      setDashboardData({
        stats: {
          totalProducts,
          lowStockItems,
          outOfStockItems,
          todayRevenue,
          todaySalesCount,
        },
        recentSales: salesData.slice(0, 8),
        lowStockProducts: lowStockData.slice(0, 5),
        topProducts,
        cashierPerformance,
        hourlySales: hourlySalesData,
      });
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return "Yesterday";
  };

  // Format hour for display
  const formatHour = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  useEffect(() => {
    fetchDashboardData();

    // Refresh data every 2 minutes
    const interval = setInterval(fetchDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  CoffeePOS
                </h1>
              </Link>
              <nav className="ml-8 flex space-x-6">
                <Link
                  to="/dashboard"
                  className="text-gray-900 border-b-2 border-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/products"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Products
                </Link>
                <Link
                  to="/pos"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  POS
                </Link>
                <Link
                  to="/sales"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Sales
                </Link>
                <Link
                  to="/reports"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Reports
                </Link>
                <Link
                  to="/users"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Users
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Business Overview
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time performance and inventory insights
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Today's Revenue
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {formatCurrency(dashboardData.stats.todayRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboardData.stats.todaySalesCount || 0} transactions
                  </p>
                </div>
                <div className="text-gray-400">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 6v1m0-1v1m6-13h2a2 2 0 012 2v2a2 2 0 01-2 2h-2m-4 0H8a2 2 0 01-2-2V6a2 2 0 012-2h2m4 0h4a2 2 0 012 2v2a2 2 0 01-2 2h-4M4 18h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 012-2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Inventory Health
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {dashboardData.stats.totalProducts -
                      dashboardData.stats.outOfStockItems}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    of {dashboardData.stats.totalProducts} products available
                  </p>
                </div>
                <div className="text-gray-400">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Stock Alerts
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {dashboardData.stats.lowStockItems +
                      dashboardData.stats.outOfStockItems}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboardData.stats.outOfStockItems} out of stock
                  </p>
                </div>
                <div className="text-gray-400">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Cashiers
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {dashboardData.cashierPerformance.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Staff performance
                  </p>
                </div>
                <div className="text-gray-400">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Sales & Activity */}
            <div className="xl:col-span-2 space-y-8">
              {/* Cashier Performance */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Cashier Performance
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {dashboardData.cashierPerformance.map((cashier, index) => (
                      <div
                        key={cashier.id}
                        className="flex items-center justify-between p-4 border border-gray-100 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {cashier.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {cashier.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {cashier.salesCount} sales
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(cashier.totalRevenue)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Avg: {formatCurrency(cashier.averageSale)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {dashboardData.cashierPerformance.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No cashier data available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Transactions */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Recent Transactions
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {dashboardData.recentSales.map((sale, index) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {sale.reference_no || `Sale #${sale.id}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatRelativeTime(sale.created_at)} •{" "}
                              {sale.payment_method}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatCurrency(sale.total)}
                          </p>
                        </div>
                      ))}
                      {dashboardData.recentSales.length === 0 && (
                        <p className="text-gray-500 text-center py-2">
                          No recent transactions
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Top Products
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      {dashboardData.topProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between py-2"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {product.sales_count || 0} sold
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                      ))}
                      {dashboardData.topProducts.length === 0 && (
                        <p className="text-gray-500 text-center py-2">
                          No product sales data
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Inventory & Quick Actions */}
            <div className="space-y-8">
              {/* Stock Alerts */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Stock Alerts
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {dashboardData.lowStockProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className={`p-3 rounded-lg border ${
                          product.stock === 0
                            ? "border-red-200 bg-red-50"
                            : "border-orange-200 bg-orange-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {product.name}
                            </p>
                            <p
                              className={`text-xs ${
                                product.stock === 0
                                  ? "text-red-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {product.stock === 0
                                ? "Out of stock"
                                : `${product.stock} units left`}
                            </p>
                          </div>
                          <Link
                            to="/products"
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Restock
                          </Link>
                        </div>
                      </div>
                    ))}
                    {dashboardData.lowStockProducts.length === 0 && (
                      <p className="text-gray-500 text-center py-2">
                        All products are well stocked
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Quick Actions
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <Link
                      to="/pos"
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="text-gray-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 6v1m0-1v1m6-13h2a2 2 0 012 2v2a2 2 0 01-2 2h-2m-4 0H8a2 2 0 01-2-2V6a2 2 0 012-2h2m4 0h4a2 2 0 012 2v2a2 2 0 01-2 2h-4M4 18h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 012-2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          New Sale
                        </p>
                        <p className="text-xs text-gray-500">
                          Start POS terminal
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/products"
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="text-gray-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Manage Products
                        </p>
                        <p className="text-xs text-gray-500">
                          Update inventory
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/reports"
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="text-gray-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          View Reports
                        </p>
                        <p className="text-xs text-gray-500">
                          Analytics & insights
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Business Hours Performance */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Peak Hours
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {dashboardData.hourlySales
                      .slice(0, 4)
                      .map((hour, index) => (
                        <div
                          key={hour.hour}
                          className="flex items-center justify-between py-2"
                        >
                          <span className="text-sm text-gray-600">
                            {formatHour(hour.hour)}
                          </span>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(hour.total_revenue)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {hour.transaction_count} sales
                            </p>
                          </div>
                        </div>
                      ))}
                    {dashboardData.hourlySales.length === 0 && (
                      <p className="text-gray-500 text-center py-2">
                        No hourly data available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
