// src/components/Reports.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Reports = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState({
    sales: [],
    products: [],
    inventory: [],
    paymentAnalytics: [],
    hourlySales: [],
    categorySales: [],
    todaySales: [], // Add today's sales data
  });
  const [dateRange, setDateRange] = useState({
    start_date: "",
    end_date: "",
  });
  const [activeTab, setActiveTab] = useState("overview");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch all report data
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Fetch sales report
      const salesParams = new URLSearchParams();
      if (dateRange.start_date)
        salesParams.append("start_date", dateRange.start_date);
      if (dateRange.end_date)
        salesParams.append("end_date", dateRange.end_date);

      // Fetch today's sales separately
      const todayParams = new URLSearchParams();
      todayParams.append("start_date", today);
      todayParams.append("end_date", today);

      const [
        salesResponse,
        productsResponse,
        inventoryResponse,
        paymentResponse,
        hourlyResponse,
        categoryResponse,
        todaySalesResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/sales/report?${salesParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/products`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/inventory/logs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${API_URL}/api/sales/payment-analytics?${salesParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        fetch(`${API_URL}/api/sales/hourly-sales?${salesParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/sales/category-sales?${salesParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Fetch today's sales data
        fetch(`${API_URL}/api/sales/report?${todayParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!salesResponse.ok) throw new Error("Failed to fetch sales report");
      const salesData = await salesResponse.json();

      if (!productsResponse.ok) throw new Error("Failed to fetch products");
      const productsData = await productsResponse.json();

      const inventoryData = inventoryResponse.ok
        ? await inventoryResponse.json()
        : [];
      const paymentData = paymentResponse.ok
        ? await paymentResponse.json()
        : [];
      const hourlyData = hourlyResponse.ok ? await hourlyResponse.json() : [];
      const categoryData = categoryResponse.ok
        ? await categoryResponse.json()
        : [];
      const todaySalesData = todaySalesResponse.ok
        ? await todaySalesResponse.json()
        : [];

      setReportData({
        sales: salesData,
        products: productsData,
        inventory: inventoryData,
        paymentAnalytics: paymentData,
        hourlySales: hourlyData,
        categorySales: categoryData,
        todaySales: todaySalesData,
      });
    } catch (err) {
      setError(err.message);
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format hour for display
  const formatHour = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  // Get payment method icon and display name
  const getPaymentMethodInfo = (method) => {
    const methods = {
      cash: { icon: "💵", name: "Cash" },
      card: { icon: "💳", name: "Credit Card" },
      gcash: { icon: "📱", name: "GCash" },
      paymaya: { icon: "📲", name: "PayMaya" },
    };
    return methods[method] || { icon: "💰", name: method };
  };

  // Calculate overview statistics
  const calculateOverviewStats = () => {
    const totalRevenue = reportData.sales.reduce(
      (sum, day) => sum + parseFloat(day.total_revenue || 0),
      0
    );
    const totalSales = reportData.sales.reduce(
      (sum, day) => sum + parseInt(day.total_sales || 0),
      0
    );
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    const lowStockProducts = reportData.products.filter(
      (p) => p.stock > 0 && p.stock <= 10
    ).length;
    const outOfStockProducts = reportData.products.filter(
      (p) => p.stock === 0
    ).length;
    const totalProducts = reportData.products.length;

    const bestSellingProduct = reportData.products
      .filter((p) => p.sales_count > 0)
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))[0];

    // Calculate today's sales from todaySales data
    const todayRevenue = reportData.todaySales.reduce(
      (sum, day) => sum + parseFloat(day.total_revenue || 0),
      0
    );
    const todaySalesCount = reportData.todaySales.reduce(
      (sum, day) => sum + parseInt(day.total_sales || 0),
      0
    );

    return {
      totalRevenue,
      totalSales,
      averageSale,
      lowStockProducts,
      outOfStockProducts,
      totalProducts,
      bestSellingProduct,
      todayRevenue,
      todaySales: todaySalesCount,
    };
  };

  // Get top selling products
  const getTopSellingProducts = () => {
    return reportData.products
      .filter((p) => p.sales_count > 0)
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
      .slice(0, 5);
  };

  // Get low stock alerts
  const getLowStockAlerts = () => {
    return reportData.products
      .filter((p) => p.stock <= 10)
      .sort((a, b) => a.stock - b.stock);
  };

  // Get peak hours
  const getPeakHours = () => {
    return reportData.hourlySales
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 3);
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const stats = calculateOverviewStats();
  const topProducts = getTopSellingProducts();
  const lowStockAlerts = getLowStockAlerts();
  const peakHours = getPeakHours();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  ☕ CoffeePOS
                </h1>
              </Link>
              <nav className="ml-10 flex space-x-8">
                <Link
                  to="/dashboard"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
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
                  className="text-green-700 border-b-2 border-green-700 px-3 py-2 text-sm font-medium"
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
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Reports Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Analytics & Reports
              </h2>
              <p className="text-gray-600 mt-2">
                Comprehensive business insights and analytics
              </p>
            </div>

            {/* Date Range Filter */}
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex space-x-1 mb-8 border-b border-gray-200 overflow-x-auto">
            {[
              { id: "overview", name: "📊 Overview", icon: "📊" },
              { id: "sales", name: "💰 Sales Analytics", icon: "💰" },
              { id: "products", name: "📦 Product Performance", icon: "📦" },
              { id: "inventory", name: "📋 Inventory Report", icon: "📋" },
              { id: "hourly", name: "⏰ Hourly Analysis", icon: "⏰" },
              { id: "categories", name: "🏷️ Category Report", icon: "🏷️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
                  activeTab === tab.id
                    ? "bg-white border-t border-l border-r border-gray-200 text-green-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="bg-green-500 rounded-lg p-3 mr-4">
                      <span className="text-2xl text-white">💰</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Today: {formatCurrency(stats.todayRevenue)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="bg-blue-500 rounded-lg p-3 mr-4">
                      <span className="text-2xl text-white">📈</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Sales
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.totalSales}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Today: {stats.todaySales} transactions
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="bg-purple-500 rounded-lg p-3 mr-4">
                      <span className="text-2xl text-white">📦</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Products
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.totalProducts}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        {stats.lowStockProducts} low stock
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="bg-amber-500 rounded-lg p-3 mr-4">
                      <span className="text-2xl text-white">⚡</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg. Sale
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(stats.averageSale)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        per transaction
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    📈 Sales Trend (Last 7 Days)
                  </h3>
                  <div className="space-y-3">
                    {reportData.sales.slice(0, 7).map((day, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-600">
                          {formatDate(day.date)}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            {day.total_sales} sales
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(day.total_revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {reportData.sales.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No sales data available
                      </p>
                    )}
                  </div>
                </div>

                {/* Inventory Alerts */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    ⚠️ Inventory Alerts
                  </h3>
                  <div className="space-y-3">
                    {lowStockAlerts.map((product, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-amber-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {product.name}
                          </p>
                          <p className="text-sm text-amber-600">
                            {product.stock === 0
                              ? "Out of Stock"
                              : `Only ${product.stock} left`}
                          </p>
                        </div>
                        <Link
                          to="/products"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Restock
                        </Link>
                      </div>
                    ))}
                    {lowStockAlerts.length === 0 && (
                      <p className="text-green-600 text-center py-4">
                        All products are well stocked! ✅
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    🏆 Top Selling Products
                  </h3>
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-600">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="font-medium text-gray-800">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">
                              {product.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {product.sales_count || 0} sold
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(product.price)} each
                          </p>
                        </div>
                      </div>
                    ))}
                    {topProducts.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No product sales data available
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Methods Summary */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    💳 Payment Methods
                  </h3>
                  <div className="space-y-3">
                    {reportData.paymentAnalytics.map((method, index) => {
                      const methodInfo = getPaymentMethodInfo(
                        method.payment_method
                      );
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{methodInfo.icon}</span>
                            <span className="font-medium text-gray-800">
                              {methodInfo.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {method.transaction_count} transactions
                            </p>
                            <p className="text-sm text-gray-600">
                              {method.percentage || 0}% •{" "}
                              {formatCurrency(method.total_amount)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {reportData.paymentAnalytics.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No payment data available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rest of the tabs remain the same... */}
          {/* Sales Analytics Tab */}
          {activeTab === "sales" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Report */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    📅 Daily Sales Report
                  </h3>
                  <div className="space-y-4">
                    {reportData.sales.map((day, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-800">
                            {formatDate(day.date)}
                          </span>
                          <span className="text-green-600 font-bold">
                            {formatCurrency(day.total_revenue)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span>Total Sales:</span>
                            <span className="font-medium ml-2">
                              {day.total_sales}
                            </span>
                          </div>
                          <div>
                            <span>Average Sale:</span>
                            <span className="font-medium ml-2">
                              {formatCurrency(day.average_sale)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {reportData.sales.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No sales data available for the selected period
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Methods Analytics */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    💳 Payment Methods Analytics
                  </h3>
                  <div className="space-y-4">
                    {reportData.paymentAnalytics.map((method, index) => {
                      const methodInfo = getPaymentMethodInfo(
                        method.payment_method
                      );
                      return (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {methodInfo.icon}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-800 capitalize">
                                  {methodInfo.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {method.transaction_count} transactions
                                </p>
                              </div>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(method.total_amount)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${method.percentage || 0}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 text-right">
                            {method.percentage || 0}% of total revenue
                          </p>
                        </div>
                      );
                    })}
                    {reportData.paymentAnalytics.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No payment analytics data available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Performance Tab */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📦 Product Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Product
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Category
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Price
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Stock
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Sales Count
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.products.map((product, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-800">
                                {product.name}
                              </p>
                              {product.description && (
                                <p className="text-sm text-gray-600 truncate max-w-xs">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                            {product.category || "Uncategorized"}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                product.stock === 0
                                  ? "bg-red-100 text-red-800"
                                  : product.stock <= 10
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {product.stock} units
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {product.sales_count || 0} sold
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                product.stock === 0
                                  ? "bg-red-100 text-red-800"
                                  : product.stock <= 10
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {product.stock === 0
                                ? "Out of Stock"
                                : product.stock <= 10
                                ? "Low Stock"
                                : "In Stock"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportData.products.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      No products available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inventory Report Tab */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalProducts}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {stats.lowStockProducts}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl mb-2">❌</div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.outOfStockProducts}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📋 Stock Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportData.products.map((product, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        product.stock === 0
                          ? "border-red-200 bg-red-50"
                          : product.stock <= 10
                          ? "border-amber-200 bg-amber-50"
                          : "border-green-200 bg-green-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">
                          {product.name}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.stock === 0
                              ? "bg-red-100 text-red-800"
                              : product.stock <= 10
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {product.stock} units
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 capitalize mb-2">
                        {product.category}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {product.sales_count || 0} sold
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {reportData.products.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No products available
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Hourly Analysis Tab */}
          {activeTab === "hourly" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Peak Hours */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    ⏰ Peak Business Hours
                  </h3>
                  <div className="space-y-4">
                    {peakHours.map((hour, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-800">
                                {formatHour(hour.hour)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {hour.transaction_count} transactions
                              </p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {formatCurrency(hour.total_revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${
                                (hour.total_revenue /
                                  Math.max(
                                    ...reportData.hourlySales.map(
                                      (h) => h.total_revenue || 1
                                    )
                                  )) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    {peakHours.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No hourly data available
                      </p>
                    )}
                  </div>
                </div>

                {/* All Hours Performance */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    📊 Hourly Performance
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {reportData.hourlySales.map((hour, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {formatHour(hour.hour)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(hour.total_revenue)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {hour.transaction_count} transactions
                          </p>
                        </div>
                      </div>
                    ))}
                    {reportData.hourlySales.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No hourly sales data available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Report Tab */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🏷️ Category Performance
                </h3>
                <div className="space-y-4">
                  {reportData.categorySales.map((category, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-800 text-lg capitalize">
                            {category.category || "Uncategorized"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {category.items_sold} items sold •{" "}
                            {category.total_quantity} total quantity
                          </p>
                        </div>
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(category.total_revenue)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span>Average Price:</span>
                          <span className="font-medium ml-2">
                            {formatCurrency(
                              category.total_revenue /
                                (category.items_sold || 1)
                            )}
                          </span>
                        </div>
                        <div>
                          <span>Items per Sale:</span>
                          <span className="font-medium ml-2">
                            {(
                              (category.total_quantity || 0) /
                              (category.items_sold || 1)
                            ).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reportData.categorySales.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No category sales data available
                    </p>
                  )}
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  📈 Revenue by Category
                </h3>
                <div className="space-y-3">
                  {reportData.categorySales.map((category, index) => {
                    const totalRevenue = reportData.categorySales.reduce(
                      (sum, cat) => sum + parseFloat(cat.total_revenue || 0),
                      0
                    );
                    const percentage =
                      totalRevenue > 0
                        ? (category.total_revenue / totalRevenue) * 100
                        : 0;

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-800 capitalize">
                            {category.category || "Uncategorized"}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatCurrency(category.total_revenue)} (
                            {percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  {reportData.categorySales.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No category data available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
