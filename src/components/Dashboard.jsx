// src/components/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalProducts: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      todayRevenue: 0,
      todaySalesCount: 0,
    },
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
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const today = new Date().toISOString().split("T")[0];
      const todayParams = new URLSearchParams();
      todayParams.append("start_date", today);
      todayParams.append("end_date", today);

      // Make API calls with better error handling
      const responses = await Promise.allSettled([
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
        fetch(`${API_URL}/api/users/cashiers/cashiers`, {
          // Fixed endpoint
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales/hourly-sales?${todayParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Process each response
      const [
        productsResponse,
        salesResponse,
        todaySalesResponse,
        inventoryResponse,
        cashiersResponse,
        hourlySalesResponse,
      ] = responses;

      // Helper function to process responses
      const processResponse = async (response, errorMessage) => {
        if (response.status === "fulfilled" && response.value.ok) {
          return await response.value.json();
        }
        console.warn(errorMessage, response.reason);
        return null;
      };

      const productsData = await processResponse(
        productsResponse,
        "Failed to fetch products"
      );
      const salesData = await processResponse(
        salesResponse,
        "Failed to fetch sales"
      );
      const todaySalesData = await processResponse(
        todaySalesResponse,
        "Failed to fetch today's sales"
      );
      const lowStockData = await processResponse(
        inventoryResponse,
        "Failed to fetch low stock"
      );
      const cashiersData = await processResponse(
        cashiersResponse,
        "Failed to fetch cashiers"
      );
      const hourlySalesData = await processResponse(
        hourlySalesResponse,
        "Failed to fetch hourly sales"
      );

      // Calculate statistics with fallbacks
      const totalProducts = productsData?.length || 0;
      const lowStockItems = lowStockData?.length || 0;
      const outOfStockItems =
        productsData?.filter((p) => p.stock === 0).length || 0;

      // Calculate today's revenue with better error handling
      let todayRevenue = 0;
      let todaySalesCount = 0;

      if (todaySalesData) {
        if (Array.isArray(todaySalesData)) {
          todayRevenue = todaySalesData.reduce(
            (sum, day) => sum + parseFloat(day.total_revenue || 0),
            0
          );
          todaySalesCount = todaySalesData.reduce(
            (sum, day) => sum + parseInt(day.total_sales || 0),
            0
          );
        } else {
          todayRevenue = parseFloat(todaySalesData.total_revenue || 0);
          todaySalesCount = parseInt(todaySalesData.total_sales || 0);
        }
      }

      // Get top selling products
      const topProducts = (productsData || [])
        .filter((p) => (p.sales_count || 0) > 0)
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 5);

      // Calculate cashier performance
      const cashierPerformance = (cashiersData || [])
        .map((cashier) => {
          const cashierSales = (salesData || []).filter(
            (sale) => sale.user_id === cashier.id
          );
          const totalSales = cashierSales.reduce(
            (sum, sale) => sum + parseFloat(sale.total || 0),
            0
          );

          return {
            id: cashier.id,
            name: cashier.name || "Unknown Cashier",
            username: cashier.username,
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
        recentSales: (salesData || []).slice(0, 8),
        lowStockProducts: (lowStockData || []).slice(0, 5),
        topProducts,
        cashierPerformance,
        hourlySales: hourlySalesData || [],
      });
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setError("Failed to load dashboard data. Please try again.");
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
    if (!dateString) return "Unknown time";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      return `${diffDays}d ago`;
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      return "Unknown time";
    }
  };

  // Format hour for display
  const formatHour = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  // Get performance color based on metrics
  const getPerformanceColor = (value, type = "revenue") => {
    if (type === "revenue") {
      if (value > 1000) return "text-green-600";
      if (value > 500) return "text-yellow-600";
      return "text-red-600";
    }
    return "text-gray-900";
  };

  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 font-medium">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CP</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">CoffeePOS</h1>
              </Link>
              <nav className="ml-8 flex space-x-1">
                {[
                  { path: "/dashboard", label: "Dashboard" },
                  { path: "/products", label: "Products" },
                  { path: "/pos", label: "POS" },
                  { path: "/sales", label: "Sales" },
                  { path: "/reports", label: "Reports" },
                  { path: "/users", label: "Users" },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.path === "/dashboard"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role || "User"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 text-sm font-medium transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Business Overview
                </h1>
                <p className="text-gray-600 mt-2">
                  Real-time performance and inventory insights
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                title: "Today's Revenue",
                value: formatCurrency(dashboardData.stats.todayRevenue),
                subtitle: `${
                  dashboardData.stats.todaySalesCount || 0
                } transactions`,
                icon: (
                  <svg
                    className="w-6 h-6"
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
                ),
                color: "text-green-600",
                bgColor: "bg-green-50",
                borderColor: "border-green-200",
              },
              {
                title: "Inventory Health",
                value:
                  dashboardData.stats.totalProducts -
                  dashboardData.stats.outOfStockItems,
                subtitle: `of ${dashboardData.stats.totalProducts} products available`,
                icon: (
                  <svg
                    className="w-6 h-6"
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
                ),
                color: "text-blue-600",
                bgColor: "bg-blue-50",
                borderColor: "border-blue-200",
              },
              {
                title: "Stock Alerts",
                value:
                  dashboardData.stats.lowStockItems +
                  dashboardData.stats.outOfStockItems,
                subtitle: `${dashboardData.stats.outOfStockItems} out of stock`,
                icon: (
                  <svg
                    className="w-6 h-6"
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
                ),
                color: "text-red-600",
                bgColor: "bg-red-50",
                borderColor: "border-red-200",
              },
              {
                title: "Active Cashiers",
                value: dashboardData.cashierPerformance.length,
                subtitle: "Staff performance",
                icon: (
                  <svg
                    className="w-6 h-6"
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
                ),
                color: "text-purple-600",
                bgColor: "bg-purple-50",
                borderColor: "border-purple-200",
              },
            ].map((metric, index) => (
              <div
                key={index}
                className={`bg-white p-6 rounded-xl border-2 ${metric.borderColor} shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {metric.title}
                    </p>
                    <p className={`text-2xl font-bold ${metric.color} mb-1`}>
                      {metric.value}
                    </p>
                    <p className="text-xs text-gray-500">{metric.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <div className={metric.color}>{metric.icon}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Sales & Activity */}
            <div className="xl:col-span-2 space-y-8">
              {/* Cashier Performance */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Cashier Performance
                  </h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Today
                  </span>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {dashboardData.cashierPerformance.map((cashier) => (
                      <div
                        key={cashier.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-sm font-semibold text-white">
                              {cashier.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {cashier.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {cashier.salesCount} sales • {cashier.username}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold text-lg ${getPerformanceColor(
                              cashier.totalRevenue
                            )}`}
                          >
                            {formatCurrency(cashier.totalRevenue)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Avg: {formatCurrency(cashier.averageSale)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {dashboardData.cashierPerformance.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <svg
                            className="w-12 h-12 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-500">
                          No cashier data available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Transactions */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Recent Transactions
                    </h2>
                    <Link
                      to="/sales"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.recentSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                sale.payment_method === "cash"
                                  ? "bg-green-400"
                                  : sale.payment_method === "card"
                                  ? "bg-blue-400"
                                  : "bg-purple-400"
                              }`}
                            ></div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {sale.reference_no || `Sale #${sale.id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatRelativeTime(sale.created_at)} •{" "}
                                {sale.payment_method}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatCurrency(sale.total)}
                          </p>
                        </div>
                      ))}
                      {dashboardData.recentSales.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-gray-500">
                            No recent transactions
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Top Products
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.topProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                                index === 0
                                  ? "bg-yellow-500"
                                  : index === 1
                                  ? "bg-gray-400"
                                  : index === 2
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                              }`}
                            >
                              {index + 1}
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
                        <div className="text-center py-4">
                          <p className="text-gray-500">No product sales data</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Inventory & Quick Actions */}
            <div className="space-y-8">
              {/* Stock Alerts */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Stock Alerts
                  </h2>
                  <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                    {dashboardData.lowStockProducts.length} alerts
                  </span>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {dashboardData.lowStockProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          product.stock === 0
                            ? "border-red-400 bg-red-50"
                            : "border-orange-400 bg-orange-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 text-sm mb-1">
                              {product.name}
                            </p>
                            <p
                              className={`text-xs font-medium ${
                                product.stock === 0
                                  ? "text-red-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {product.stock === 0
                                ? "🛑 Out of stock"
                                : `⚠️ ${product.stock} units left`}
                            </p>
                          </div>
                          <Link
                            to="/products"
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium bg-white px-2 py-1 rounded border border-blue-200"
                          >
                            Restock
                          </Link>
                        </div>
                      </div>
                    ))}
                    {dashboardData.lowStockProducts.length === 0 && (
                      <div className="text-center py-4">
                        <div className="text-green-400 mb-2">
                          <svg
                            className="w-12 h-12 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-500">
                          All products are well stocked
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Quick Actions
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      {
                        path: "/pos",
                        title: "New Sale",
                        subtitle: "Start POS terminal",
                        icon: (
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
                        ),
                        color: "text-blue-600",
                        bgColor: "bg-blue-50",
                      },
                      {
                        path: "/products",
                        title: "Manage Products",
                        subtitle: "Update inventory",
                        icon: (
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
                        ),
                        color: "text-green-600",
                        bgColor: "bg-green-50",
                      },
                      {
                        path: "/reports",
                        title: "View Reports",
                        subtitle: "Analytics & insights",
                        icon: (
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
                        ),
                        color: "text-purple-600",
                        bgColor: "bg-purple-50",
                      },
                    ].map((action, index) => (
                      <Link
                        key={index}
                        to={action.path}
                        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className={`p-2 rounded-lg ${action.bgColor}`}>
                          <div className={action.color}>{action.icon}</div>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {action.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {action.subtitle}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Business Hours Performance */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Peak Hours
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {(dashboardData.hourlySales || [])
                      .slice(0, 4)
                      .map((hour) => (
                        <div
                          key={hour.hour}
                          className="flex items-center justify-between py-2"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {formatHour(hour.hour)}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {formatHour(hour.hour)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(hour.total_revenue)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {hour.transaction_count || 0} sales
                            </p>
                          </div>
                        </div>
                      ))}
                    {(!dashboardData.hourlySales ||
                      dashboardData.hourlySales.length === 0) && (
                      <div className="text-center py-4">
                        <p className="text-gray-500">
                          No hourly data available
                        </p>
                      </div>
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
