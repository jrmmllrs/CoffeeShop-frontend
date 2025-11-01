import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const { logout } = useAuth();
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
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales/hourly-sales?${todayParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [
        productsResponse,
        salesResponse,
        todaySalesResponse,
        inventoryResponse,
        cashiersResponse,
        hourlySalesResponse,
      ] = responses;

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

      const totalProducts = productsData?.length || 0;
      const lowStockItems = lowStockData?.length || 0;
      const outOfStockItems =
        productsData?.filter((p) => p.stock === 0).length || 0;

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

      const topProducts = (productsData || [])
        .filter((p) => (p.sales_count || 0) > 0)
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 5);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

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

  const formatHour = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  const getPerformanceColor = (value, type = "revenue") => {
    if (type === "revenue") {
      if (value > 1000) return "text-emerald-600";
      if (value > 500) return "text-amber-600";
      return "text-orange-600";
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mb-4"></div>
          <p className="text-xl text-amber-800 font-medium">
            Brewing your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Oops!</h2>
          <p className="text-amber-700 mb-6">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Header onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto py-6 sm:py-8">
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-amber-900 mb-2">
                  ☕ Business Overview
                </h1>
                <p className="text-amber-700">
                  Real-time insights for your coffee shop
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-lg border-2 border-amber-200 px-4 py-2">
                <p className="text-xs text-amber-600 font-medium">Today</p>
                <p className="text-sm font-bold text-amber-900">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl">💰</div>
                <div className="bg-white bg-opacity-20 rounded-lg px-2 py-1">
                  <p className="text-xs font-bold text-amber-900">TODAY</p>
                </div>
              </div>
              <p className="text-emerald-100 text-sm font-medium mb-1">
                Revenue
              </p>
              <p className="text-2xl sm:text-3xl font-bold mb-1">
                {formatCurrency(dashboardData.stats.todayRevenue)}
              </p>
              <p className="text-xs text-emerald-100">
                {dashboardData.stats.todaySalesCount || 0} transactions
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl">📦</div>
                <div className="bg-white bg-opacity-20 rounded-lg px-2 py-1">
                  <p className="text-xs font-bold text-amber-900">STOCK</p>
                </div>
              </div>
              <p className="text-blue-100 text-sm font-medium mb-1">
                Inventory
              </p>
              <p className="text-2xl sm:text-3xl font-bold mb-1">
                {dashboardData.stats.totalProducts -
                  dashboardData.stats.outOfStockItems}
              </p>
              <p className="text-xs text-blue-100">
                of {dashboardData.stats.totalProducts} available
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl">⚠️</div>
                <div className="bg-white bg-opacity-20 rounded-lg px-2 py-1">
                  <p className="text-xs font-bold text-amber-900">ALERTS</p>
                </div>
              </div>
              <p className="text-amber-100 text-sm font-medium mb-1">
                Low Stock
              </p>
              <p className="text-2xl sm:text-3xl font-bold mb-1">
                {dashboardData.stats.lowStockItems +
                  dashboardData.stats.outOfStockItems}
              </p>
              <p className="text-xs text-amber-100">
                {dashboardData.stats.outOfStockItems} out of stock
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl">👥</div>
                <div className="bg-white bg-opacity-20 rounded-lg px-2 py-1">
                  <p className="text-xs font-bold text-amber-900">TEAM</p>
                </div>
              </div>
              <p className="text-purple-100 text-sm font-medium mb-1">
                Cashiers
              </p>
              <p className="text-2xl sm:text-3xl font-bold mb-1">
                {dashboardData.cashierPerformance.length}
              </p>
              <p className="text-xs text-purple-100">active staff</p>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-6 sm:space-y-8">
              {/* Cashier Performance */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200">
                <div className="px-4 sm:px-6 py-4 border-b-2 border-amber-200 flex justify-between items-center">
                  <h2 className="text-lg sm:text-xl font-bold text-amber-900 flex items-center gap-2">
                    <span>🏆</span> Team Performance
                  </h2>
                  <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-semibold">
                    Live
                  </span>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {dashboardData.cashierPerformance.map((cashier, index) => (
                      <div
                        key={cashier.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-100 hover:border-amber-300 transition-all"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md flex-shrink-0 ${
                              index === 0
                                ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                                : index === 1
                                ? "bg-gradient-to-br from-gray-300 to-gray-400"
                                : index === 2
                                ? "bg-gradient-to-br from-orange-400 to-red-500"
                                : "bg-gradient-to-br from-blue-500 to-purple-600"
                            }`}
                          >
                            <span className="text-sm font-bold text-white">
                              {cashier.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-900 truncate">
                              {cashier.name}
                            </p>
                            <p className="text-sm text-amber-600 truncate">
                              {cashier.salesCount} sales • {cashier.username}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p
                            className={`font-bold text-lg ${getPerformanceColor(
                              cashier.totalRevenue
                            )}`}
                          >
                            {formatCurrency(cashier.totalRevenue)}
                          </p>
                          <p className="text-xs text-amber-600">
                            Avg: {formatCurrency(cashier.averageSale)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {dashboardData.cashierPerformance.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-3">👥</div>
                        <p className="text-amber-600 font-semibold">
                          No cashier data available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions & Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Recent Transactions */}
                <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200">
                  <div className="px-4 sm:px-6 py-4 border-b-2 border-amber-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                      <span>🧾</span> Recent Sales
                    </h2>
                    <Link
                      to="/sales"
                      className="text-sm text-amber-600 hover:text-amber-700 font-semibold"
                    >
                      View all →
                    </Link>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {dashboardData.recentSales.map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                sale.payment_method === "cash"
                                  ? "bg-emerald-500"
                                  : sale.payment_method === "card"
                                  ? "bg-blue-500"
                                  : sale.payment_method === "gcash"
                                  ? "bg-sky-500"
                                  : "bg-purple-500"
                              }`}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-amber-900 text-sm truncate">
                                {sale.reference_no || `#${sale.id}`}
                              </p>
                              <p className="text-xs text-amber-600 capitalize">
                                {formatRelativeTime(sale.created_at)} •{" "}
                                {sale.payment_method}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-emerald-600 text-sm ml-2 flex-shrink-0">
                            {formatCurrency(sale.total)}
                          </p>
                        </div>
                      ))}
                      {dashboardData.recentSales.length === 0 && (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">🧾</div>
                          <p className="text-amber-600 font-medium">
                            No recent transactions
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200">
                  <div className="px-4 sm:px-6 py-4 border-b-2 border-amber-200">
                    <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                      <span>🔥</span> Top Sellers
                    </h2>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-3">
                      {dashboardData.topProducts.map((product, index) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0 ${
                                index === 0
                                  ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                                  : index === 1
                                  ? "bg-gradient-to-br from-gray-300 to-gray-400"
                                  : index === 2
                                  ? "bg-gradient-to-br from-orange-400 to-red-500"
                                  : "bg-gradient-to-br from-blue-500 to-indigo-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-amber-900 text-sm truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-amber-600">
                                {product.sales_count || 0} sold
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-emerald-600 text-sm ml-2 flex-shrink-0">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                      ))}
                      {dashboardData.topProducts.length === 0 && (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">🧋</div>
                          <p className="text-amber-600 font-medium">
                            No product sales yet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 sm:space-y-8">
              {/* Stock Alerts */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200">
                <div className="px-4 sm:px-6 py-4 border-b-2 border-amber-200 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                    <span>🚨</span> Stock Alerts
                  </h2>
                  <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold">
                    {dashboardData.lowStockProducts.length}
                  </span>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3">
                    {dashboardData.lowStockProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-4 rounded-xl border-l-4 ${
                          product.stock === 0
                            ? "border-red-500 bg-red-50"
                            : "border-amber-500 bg-amber-50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-900 text-sm mb-1 truncate">
                              {product.name}
                            </p>
                            <p
                              className={`text-xs font-bold ${
                                product.stock === 0
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {product.stock === 0
                                ? "🛑 Out of stock!"
                                : `⚠️ Only ${product.stock} left`}
                            </p>
                          </div>
                          <Link
                            to="/products"
                            className="flex-shrink-0 text-xs text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          >
                            Restock
                          </Link>
                        </div>
                      </div>
                    ))}
                    {dashboardData.lowStockProducts.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-5xl mb-3">✅</div>
                        <p className="text-emerald-600 font-semibold">
                          All products well stocked!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200">
                <div className="px-4 sm:px-6 py-4 border-b-2 border-amber-200">
                  <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                    <span>⚡</span> Quick Actions
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3">
                    {[
                      {
                        path: "/pos",
                        title: "New Sale",
                        subtitle: "Start POS terminal",
                        icon: "💰",
                        gradient: "from-emerald-500 to-green-600",
                      },
                      {
                        path: "/products",
                        title: "Manage Products",
                        subtitle: "Update inventory",
                        icon: "📦",
                        gradient: "from-blue-500 to-indigo-600",
                      },
                      {
                        path: "/reports",
                        title: "View Reports",
                        subtitle: "Analytics & insights",
                        icon: "📊",
                        gradient: "from-purple-500 to-pink-600",
                      },
                    ].map((action, index) => (
                      <Link
                        key={index}
                        to={action.path}
                        className="flex items-center gap-4 p-4 border-2 border-amber-200 rounded-xl hover:border-amber-300 hover:shadow-lg transition-all transform hover:scale-105"
                      >
                        <div
                          className={`w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center shadow-md text-2xl`}
                        >
                          {action.icon}
                        </div>
                        <div>
                          <p className="font-bold text-amber-900">
                            {action.title}
                          </p>
                          <p className="text-xs text-amber-600">
                            {action.subtitle}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Peak Hours */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200">
                <div className="px-4 sm:px-6 py-4 border-b-2 border-amber-200">
                  <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                    <span>⏰</span> Peak Hours
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {(dashboardData.hourlySales || [])
                      .slice(0, 4)
                      .map((hour) => (
                        <div
                          key={hour.hour}
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                              <span className="text-xs font-bold text-white">
                                {formatHour(hour.hour).split(" ")[0]}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-amber-900">
                              {formatHour(hour.hour)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(hour.total_revenue)}
                            </p>
                            <p className="text-xs text-amber-600">
                              {hour.transaction_count || 0} sales
                            </p>
                          </div>
                        </div>
                      ))}
                    {(!dashboardData.hourlySales ||
                      dashboardData.hourlySales.length === 0) && (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">⏰</div>
                        <p className="text-amber-600 font-medium">
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
