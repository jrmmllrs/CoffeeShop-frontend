import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Reports = () => {
  const { logout } = useAuth();
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
    todaySales: [],
  });
  const [dateRange, setDateRange] = useState({
    start_date: "",
    end_date: "",
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch all report data
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const today = new Date().toISOString().split("T")[0];

      const salesParams = new URLSearchParams();
      if (dateRange.start_date)
        salesParams.append("start_date", dateRange.start_date);
      if (dateRange.end_date)
        salesParams.append("end_date", dateRange.end_date);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    // Convert UTC to local timezone (Philippines)
    const utcDate = new Date(dateString);
    const localDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000); // UTC+8 for Philippines

    return localDate.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatHour = (hour) => {
    // Convert UTC hour to local timezone (Philippines)
    const localHour = (hour + 8) % 24; // UTC+8 for Philippines

    const period = localHour >= 12 ? "PM" : "AM";
    const displayHour =
      localHour === 0 ? 12 : localHour > 12 ? localHour - 12 : localHour;
    return `${displayHour} ${period}`;
  };

  const getPaymentMethodInfo = (method) => {
    const methods = {
      cash: { icon: "💵", name: "Cash", color: "emerald" },
      card: { icon: "💳", name: "Credit Card", color: "blue" },
      gcash: { icon: "📱", name: "GCash", color: "sky" },
      paymaya: { icon: "📲", name: "PayMaya", color: "green" },
    };
    return methods[method] || { icon: "💰", name: method, color: "gray" };
  };

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

  const getTopSellingProducts = () => {
    return reportData.products
      .filter((p) => p.sales_count > 0)
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
      .slice(0, 5);
  };

  const getLowStockAlerts = () => {
    return reportData.products
      .filter((p) => p.stock <= 10)
      .sort((a, b) => a.stock - b.stock);
  };

  const getPeakHours = () => {
    return reportData.hourlySales
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 3);
  };

  const getProductNameById = (productId) => {
    const product = reportData.products.find((p) => p.id === productId);
    return product ? product.name : "Unknown Product";
  };

  // Pagination functions
  const getCurrentItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return reportData.inventory.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(reportData.inventory.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  // Reset to page 1 when tab changes or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, reportData.inventory]);

  const stats = calculateOverviewStats();
  const topProducts = getTopSellingProducts();
  const lowStockAlerts = getLowStockAlerts();
  const peakHours = getPeakHours();
  const currentItems = getCurrentItems();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-amber-600 mb-4"></div>
          <p className="text-xl text-amber-800 font-medium">
            Brewing your reports...
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", name: "Overview", icon: "☕" },
    { id: "sales", name: "Sales", icon: "💰" },
    { id: "products", name: "Products", icon: "🧋" },
    { id: "inventory", name: "Inventory", icon: "📦" },
    { id: "logs", name: "Logs", icon: "📋" },
    { id: "hourly", name: "Hours", icon: "⏰" },
    { id: "categories", name: "Categories", icon: "🏷️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Header onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-amber-900 mb-1">
                ☕ Analytics & Reports
              </h1>
              <p className="text-amber-700">
                Track your coffee shop's performance
              </p>
            </div>

            {/* Date Range Filter - Collapsible on Mobile/Tablet */}
            <div className="lg:block">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="lg:hidden w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl px-4 py-3 font-semibold flex items-center justify-between shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <span>📅</span>
                  <span>Date Filter</span>
                </span>
                <span
                  className="text-xl transform transition-transform duration-200"
                  style={{
                    transform: isFilterOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  ▼
                </span>
              </button>

              <div
                className={`${
                  isFilterOpen ? "block" : "hidden"
                } lg:block mt-3 lg:mt-0`}
              >
                <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">
                        From
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
                        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">
                        To
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
                        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-xl shadow-md">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs - Scrollbar removed */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {" "}
            {/* Added negative margin to hide scrollbar */}
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg transform scale-105"
                    : "bg-white text-amber-800 hover:bg-amber-100 border-2 border-amber-200"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">💰</div>
                <p className="text-emerald-100 text-sm font-medium mb-1">
                  Total Revenue
                </p>
                <p className="text-2xl sm:text-3xl font-bold mb-2">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <p className="text-xs text-emerald-100">
                  Today: {formatCurrency(stats.todayRevenue)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">📈</div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Total Sales
                </p>
                <p className="text-2xl sm:text-3xl font-bold mb-2">
                  {stats.totalSales}
                </p>
                <p className="text-xs text-blue-100">
                  Today: {stats.todaySales} orders
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">🧋</div>
                <p className="text-purple-100 text-sm font-medium mb-1">
                  Products
                </p>
                <p className="text-2xl sm:text-3xl font-bold mb-2">
                  {stats.totalProducts}
                </p>
                <p className="text-xs text-purple-100">
                  {stats.lowStockProducts} low stock
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
                <div className="text-3xl mb-2">⚡</div>
                <p className="text-amber-100 text-sm font-medium mb-1">
                  Avg. Sale
                </p>
                <p className="text-2xl sm:text-3xl font-bold mb-2">
                  {formatCurrency(stats.averageSale)}
                </p>
                <p className="text-xs text-amber-100">per transaction</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Trend */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>📊</span> Sales Trend
                </h3>
                <div className="space-y-3">
                  {reportData.sales.slice(0, 7).map((day, index) => (
                    <div
                      key={index}
                      className="bg-amber-50 rounded-xl p-4 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-amber-900">
                          {formatDate(day.date)}
                        </span>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">
                            {formatCurrency(day.total_revenue)}
                          </p>
                          <p className="text-xs text-amber-700">
                            {day.total_sales} orders
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reportData.sales.length === 0 && (
                    <div className="text-center py-8 text-amber-600">
                      <div className="text-4xl mb-2">☕</div>
                      <p>No sales data yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Alerts */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>⚠️</span> Stock Alerts
                </h3>
                <div className="space-y-3">
                  {lowStockAlerts.slice(0, 5).map((product, index) => (
                    <div
                      key={index}
                      className={`rounded-xl p-4 ${
                        product.stock === 0
                          ? "bg-red-50 border-2 border-red-200"
                          : "bg-amber-50 border-2 border-amber-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-bold text-amber-900">
                            {product.name}
                          </p>
                          <p
                            className={`text-sm font-semibold ${
                              product.stock === 0
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}
                          >
                            {product.stock === 0
                              ? "Out of Stock!"
                              : `Only ${product.stock} left`}
                          </p>
                        </div>
                        <Link
                          to="/products"
                          className="ml-4 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Restock
                        </Link>
                      </div>
                    </div>
                  ))}
                  {lowStockAlerts.length === 0 && (
                    <div className="text-center py-8 text-emerald-600">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="font-semibold">
                        All products well stocked!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>🏆</span> Top Sellers
                </h3>
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-2xl font-bold text-amber-600">
                            #{index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-900 truncate">
                              {product.name}
                            </p>
                            <p className="text-sm text-amber-600 capitalize">
                              {product.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-emerald-600">
                            {product.sales_count || 0}
                          </p>
                          <p className="text-xs text-amber-700">sold</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <div className="text-center py-8 text-amber-600">
                      <div className="text-4xl mb-2">🧋</div>
                      <p>No sales data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>💳</span> Payment Methods
                </h3>
                <div className="space-y-3">
                  {reportData.paymentAnalytics.map((method, index) => {
                    const methodInfo = getPaymentMethodInfo(
                      method.payment_method
                    );
                    return (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{methodInfo.icon}</span>
                            <span className="font-bold text-amber-900">
                              {methodInfo.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">
                              {formatCurrency(method.total_amount)}
                            </p>
                            <p className="text-xs text-amber-700">
                              {method.transaction_count} txns
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${method.percentage || 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-amber-600 mt-1 text-right">
                          {method.percentage || 0}%
                        </p>
                      </div>
                    );
                  })}
                  {reportData.paymentAnalytics.length === 0 && (
                    <div className="text-center py-8 text-amber-600">
                      <div className="text-4xl mb-2">💰</div>
                      <p>No payment data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Analytics Tab */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>📅</span> Daily Sales Report
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {reportData.sales.map((day, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-100"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-amber-900">
                          {formatDate(day.date)}
                        </span>
                        <span className="text-xl font-bold text-emerald-600">
                          {formatCurrency(day.total_revenue)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-amber-600 text-xs">Total Sales</p>
                          <p className="font-bold text-amber-900">
                            {day.total_sales}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2">
                          <p className="text-amber-600 text-xs">Avg Sale</p>
                          <p className="font-bold text-amber-900">
                            {formatCurrency(day.average_sale)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reportData.sales.length === 0 && (
                    <div className="text-center py-12 text-amber-600">
                      <div className="text-5xl mb-3">☕</div>
                      <p className="font-semibold">
                        No sales data for selected period
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>💳</span> Payment Analytics
                </h3>
                <div className="space-y-4">
                  {reportData.paymentAnalytics.map((method, index) => {
                    const methodInfo = getPaymentMethodInfo(
                      method.payment_method
                    );
                    return (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-100"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{methodInfo.icon}</span>
                            <div>
                              <p className="font-bold text-amber-900 text-lg">
                                {methodInfo.name}
                              </p>
                              <p className="text-sm text-amber-600">
                                {method.transaction_count} transactions
                              </p>
                            </div>
                          </div>
                          <span className="text-xl font-bold text-emerald-600">
                            {formatCurrency(method.total_amount)}
                          </span>
                        </div>
                        <div className="w-full bg-amber-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-green-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${method.percentage || 0}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-amber-700 mt-2 text-right font-semibold">
                          {method.percentage || 0}% of total revenue
                        </p>
                      </div>
                    );
                  })}
                  {reportData.paymentAnalytics.length === 0 && (
                    <div className="text-center py-12 text-amber-600">
                      <div className="text-5xl mb-3">💰</div>
                      <p className="font-semibold">No payment data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Performance Tab */}
        {activeTab === "products" && (
          <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-4 sm:p-6 overflow-hidden">
            <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
              <span>🧋</span> Product Performance
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y-2 divide-amber-200">
                  <thead className="bg-gradient-to-r from-amber-100 to-orange-100">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Sales
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-amber-100">
                    {reportData.products.map((product, index) => (
                      <tr
                        key={index}
                        className="hover:bg-amber-50 transition-colors"
                      >
                        <td className="px-3 sm:px-4 py-4">
                          <div>
                            <p className="font-bold text-amber-900 text-sm sm:text-base">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-xs text-amber-600 truncate max-w-xs mt-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 capitalize">
                            {product.category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 font-bold text-emerald-600 text-sm sm:text-base">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-3 sm:px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                              product.stock === 0
                                ? "bg-red-100 text-red-800"
                                : product.stock <= 10
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {product.stock} units
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800">
                            {product.sales_count || 0} sold
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                              product.stock === 0
                                ? "bg-red-500 text-white"
                                : product.stock <= 10
                                ? "bg-amber-500 text-white"
                                : "bg-emerald-500 text-white"
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
                  <div className="text-center py-12 text-amber-600">
                    <div className="text-5xl mb-3">🧋</div>
                    <p className="font-semibold">No products available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inventory Report Tab */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white text-center transform hover:scale-105 transition-transform">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-blue-100 text-sm font-medium mb-2">
                  Total Products
                </p>
                <p className="text-4xl font-bold">{stats.totalProducts}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white text-center transform hover:scale-105 transition-transform">
                <div className="text-4xl mb-3">⚠️</div>
                <p className="text-amber-100 text-sm font-medium mb-2">
                  Low Stock Items
                </p>
                <p className="text-4xl font-bold">{stats.lowStockProducts}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white text-center transform hover:scale-105 transition-transform">
                <div className="text-4xl mb-3">❌</div>
                <p className="text-red-100 text-sm font-medium mb-2">
                  Out of Stock
                </p>
                <p className="text-4xl font-bold">{stats.outOfStockProducts}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <span>📋</span> Stock Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.products.map((product, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 border-2 transform hover:scale-105 transition-all ${
                      product.stock === 0
                        ? "border-red-300 bg-gradient-to-br from-red-50 to-pink-50"
                        : product.stock <= 10
                        ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50"
                        : "border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-amber-900 flex-1 pr-2">
                        {product.name}
                      </h4>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                          product.stock === 0
                            ? "bg-red-500 text-white"
                            : product.stock <= 10
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-500 text-white"
                        }`}
                      >
                        {product.stock} units
                      </span>
                    </div>
                    <p className="text-sm text-amber-600 capitalize mb-3 font-medium">
                      {product.category}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-sm text-amber-700 font-semibold">
                        {product.sales_count || 0} sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {reportData.products.length === 0 && (
                <div className="text-center py-12 text-amber-600">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="font-semibold">No products available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Logs Tab with Pagination */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                  <span>📋</span> Inventory Activity Logs
                </h3>

                {/* Items per page selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-amber-700 font-medium">
                    Show:
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className="border-2 border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                  <span className="text-sm text-amber-600">
                    {reportData.inventory.length} total logs
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {currentItems.map((log, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 border-2 transition-all hover:shadow-md ${
                      log.change_amount > 0
                        ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200"
                        : "bg-gradient-to-r from-red-50 to-pink-50 border-red-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-3xl">
                          {log.change_amount > 0 ? "📈" : "📉"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-amber-900 text-lg mb-1">
                            {getProductNameById(log.product_id)}
                          </p>
                          {log.note && (
                            <p className="text-sm text-amber-700 mb-2">
                              {log.note}
                            </p>
                          )}
                          <p className="text-xs text-amber-600">
                            {formatDateTime(log.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <span
                          className={`px-4 py-2 rounded-lg font-bold text-lg ${
                            log.change_amount > 0
                              ? "bg-emerald-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {log.change_amount > 0 ? "+" : ""}
                          {log.change_amount} units
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {currentItems.length === 0 && (
                  <div className="text-center py-12 text-amber-600">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="font-semibold">No inventory logs available</p>
                    <p className="text-sm mt-2">
                      Stock changes will appear here
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-amber-200">
                  <div className="text-sm text-amber-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      reportData.inventory.length
                    )}{" "}
                    of {reportData.inventory.length} entries
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === 1
                          ? "bg-amber-100 text-amber-400 cursor-not-allowed"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-8 h-8 rounded-lg font-medium text-sm transition-all ${
                                currentPage === pageNum
                                  ? "bg-amber-600 text-white shadow-lg"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === totalPages
                          ? "bg-amber-100 text-amber-400 cursor-not-allowed"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>📊</span> Recent Stock Changes
                </h3>
                <div className="space-y-3">
                  {currentItems.slice(0, 5).map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                    >
                      <span className="font-medium text-amber-900 text-sm truncate flex-1 pr-2">
                        {getProductNameById(log.product_id)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-md text-sm font-bold whitespace-nowrap ${
                          log.change_amount > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.change_amount > 0 ? "+" : ""}
                        {log.change_amount}
                      </span>
                    </div>
                  ))}
                  {currentItems.length === 0 && (
                    <p className="text-center text-amber-600 py-4 text-sm">
                      No recent changes
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>📈</span> Activity Summary
                </h3>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border-2 border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-emerald-700 font-medium">
                          Stock Added
                        </p>
                        <p className="text-2xl font-bold text-emerald-600 mt-1">
                          {
                            reportData.inventory.filter(
                              (log) => log.change_amount > 0
                            ).length
                          }
                        </p>
                      </div>
                      <span className="text-4xl">📥</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border-2 border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-700 font-medium">
                          Stock Reduced
                        </p>
                        <p className="text-2xl font-bold text-red-600 mt-1">
                          {
                            reportData.inventory.filter(
                              (log) => log.change_amount < 0
                            ).length
                          }
                        </p>
                      </div>
                      <span className="text-4xl">📤</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 font-medium">
                          Total Activities
                        </p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          {reportData.inventory.length}
                        </p>
                      </div>
                      <span className="text-4xl">📋</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hourly Analysis Tab */}
        {activeTab === "hourly" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>🏆</span> Peak Business Hours
                </h3>
                <div className="space-y-4">
                  {peakHours.map((hour, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-200 transform hover:scale-105 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                          <div>
                            <p className="font-bold text-amber-900 text-lg">
                              {formatHour(hour.hour)}
                            </p>
                            <p className="text-sm text-amber-600">
                              {hour.transaction_count} transactions
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-emerald-600">
                          {formatCurrency(hour.total_revenue)}
                        </span>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
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
                    <div className="text-center py-12 text-amber-600">
                      <div className="text-5xl mb-3">⏰</div>
                      <p className="font-semibold">No hourly data available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
                <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                  <span>📊</span> Hourly Performance
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {reportData.hourlySales.map((hour, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 hover:border-amber-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⏰</span>
                        <span className="font-bold text-amber-900">
                          {formatHour(hour.hour)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 text-lg">
                          {formatCurrency(hour.total_revenue)}
                        </p>
                        <p className="text-sm text-amber-700">
                          {hour.transaction_count} orders
                        </p>
                      </div>
                    </div>
                  ))}
                  {reportData.hourlySales.length === 0 && (
                    <div className="text-center py-12 text-amber-600">
                      <div className="text-5xl mb-3">⏰</div>
                      <p className="font-semibold">
                        No hourly sales data available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Report Tab */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <span>🏷️</span> Category Performance
              </h3>
              <div className="space-y-4">
                {reportData.categorySales.map((category, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                      <div>
                        <p className="font-bold text-amber-900 text-xl capitalize mb-1">
                          {category.category || "Uncategorized"}
                        </p>
                        <p className="text-sm text-amber-600">
                          {category.items_sold} items sold •{" "}
                          {category.total_quantity} total quantity
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(category.total_revenue)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-amber-600 mb-1">
                          Average Price
                        </p>
                        <p className="font-bold text-amber-900">
                          {formatCurrency(
                            category.total_revenue / (category.items_sold || 1)
                          )}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-amber-600 mb-1">
                          Items per Sale
                        </p>
                        <p className="font-bold text-amber-900">
                          {(
                            (category.total_quantity || 0) /
                            (category.items_sold || 1)
                          ).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {reportData.categorySales.length === 0 && (
                  <div className="text-center py-12 text-amber-600">
                    <div className="text-5xl mb-3">🏷️</div>
                    <p className="font-semibold">
                      No category sales data available
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6">
              <h3 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                <span>📈</span> Revenue by Category
              </h3>
              <div className="space-y-4">
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
                        <span className="font-bold text-amber-900 capitalize text-lg">
                          {category.category || "Uncategorized"}
                        </span>
                        <span className="text-sm font-semibold text-amber-700">
                          {formatCurrency(category.total_revenue)} (
                          {percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 10 && (
                            <span className="text-xs font-bold text-white">
                              {percentage.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {reportData.categorySales.length === 0 && (
                  <div className="text-center py-12 text-amber-600">
                    <div className="text-5xl mb-3">📊</div>
                    <p className="font-semibold">No category data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
