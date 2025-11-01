// src/components/Sales.jsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header";
import { Search, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Sales = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: "",
    end_date: "",
  });
  const [viewMode, setViewMode] = useState("grid");

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchSales(), fetchSalesReport()]);
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/sales`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch sales");
      const data = await response.json();
      setSales(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleDetails = async (saleId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/sales/${saleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch sale details");
      const data = await response.json();
      setSelectedSale(data);
      setShowSaleModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSalesReport = async () => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/api/sales/report`;

      const params = new URLSearchParams();
      if (dateRange.start_date)
        params.append("start_date", dateRange.start_date);
      if (dateRange.end_date) params.append("end_date", dateRange.end_date);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch sales report");
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  // Filter and Search Logic
  const filteredAndSortedSales = useMemo(() => {
    let filtered = [...sales];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (sale) =>
          sale.id.toString().includes(searchTerm) ||
          sale.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.reference_no?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Payment method filter
    if (filterPayment !== "all") {
      filtered = filtered.filter(
        (sale) => sale.payment_method === filterPayment
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "highest":
          return parseFloat(b.total) - parseFloat(a.total);
        case "lowest":
          return parseFloat(a.total) - parseFloat(b.total);
        default:
          return 0;
      }
    });

    return filtered;
  }, [sales, searchTerm, filterPayment, sortBy]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSortedSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSales = filteredAndSortedSales.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPayment, sortBy]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const utcTime = date.getTime();
    const phTime = new Date(utcTime + 8 * 60 * 60 * 1000);

    return phTime.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    const utcTime = date.getTime();
    const phTime = new Date(utcTime + 8 * 60 * 60 * 1000);

    return phTime.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const utcTime = date.getTime();
    const phTime = new Date(utcTime + 8 * 60 * 60 * 1000);

    return phTime.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPaymentMethodBadge = (method) => {
    const styles = {
      cash: "bg-emerald-100 text-emerald-700 border-emerald-300",
      card: "bg-blue-100 text-blue-700 border-blue-300",
      gcash: "bg-purple-100 text-purple-700 border-purple-300",
    };
    return styles[method] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "cash":
        return (
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
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        );
      case "card":
        return (
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
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        );
      case "gcash":
        return (
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
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + parseFloat(sale.total),
    0
  );
  const totalSales = sales.length;
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  const salesByPayment = sales.reduce((acc, sale) => {
    acc[sale.payment_method] =
      (acc[sale.payment_method] || 0) + parseFloat(sale.total);
    return acc;
  }, {});

  const clearFilters = () => {
    setSearchTerm("");
    setFilterPayment("all");
    setSortBy("newest");
  };

  const hasActiveFilters =
    searchTerm || filterPayment !== "all" || sortBy !== "newest";

  useEffect(() => {
    fetchSales();
    fetchSalesReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-amber-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-base text-amber-900 font-semibold">
            Loading sales...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <Header onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-3 sm:p-4 shadow-md">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-600"
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
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800">
                  Error Loading Data
                </h3>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold mb-2">
                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></span>
                Live Dashboard
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-900 mb-1">
                Sales Overview
              </h2>
              <p className="text-xs sm:text-sm text-amber-700">
                Real-time revenue tracking and analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-white rounded-lg p-1 shadow-md border border-amber-200">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === "grid"
                      ? "bg-amber-600 text-white"
                      : "text-amber-700 hover:text-amber-900"
                  }`}
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
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === "list"
                      ? "bg-amber-600 text-white"
                      : "text-amber-700 hover:text-amber-900"
                  }`}
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
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 sm:px-4 py-2 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 shadow-md text-amber-700 font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Total Revenue - Featured Card */}
            <div className="sm:col-span-2 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl opacity-10"></div>
              <div className="relative bg-white border-2 border-emerald-200 rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg
                        className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                        Total Revenue
                      </p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900">
                          {formatCurrency(totalRevenue)}
                        </p>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          +12.5%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-4 mt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">
                      Cash
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-800">
                      {formatCurrency(salesByPayment.cash || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">
                      Card
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-800">
                      {formatCurrency(salesByPayment.card || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">
                      GCash
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-800">
                      {formatCurrency(salesByPayment.gcash || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Transactions */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl blur-xl opacity-20"></div>
              <div className="relative bg-white border-2 border-blue-200 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg mb-3 sm:mb-4">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Transactions
                </p>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">
                  {totalSales}
                </p>
                <p className="text-xs text-blue-600 font-semibold">
                  Total sales
                </p>
              </div>
            </div>

            {/* Average Sale */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl blur-xl opacity-20"></div>
              <div className="relative bg-white border-2 border-violet-200 rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-3 sm:mb-4">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                  Avg Transaction
                </p>
                <p className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">
                  {formatCurrency(averageSale)}
                </p>
                <p className="text-xs text-violet-600 font-semibold">
                  Per sale
                </p>
              </div>
            </div>
          </div>

          {/* Report Widget */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900">
                    Generate Sales Report
                  </h3>
                  <p className="text-xs text-gray-700">Select date range</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                  className="flex-1 bg-white border-2 border-amber-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                  className="flex-1 bg-white border-2 border-amber-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button
                  onClick={fetchSalesReport}
                  disabled={reportLoading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {reportLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Report Results */}
            {reportData.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-amber-300">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  Report Summary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {reportData.map((report, index) => {
                    const reportDate = new Date(report.date);
                    const utcTime = reportDate.getTime();
                    const phDate = new Date(utcTime + 8 * 60 * 60 * 1000);
                    const formattedDate = phDate.toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <div
                        key={index}
                        className="bg-white border-2 border-amber-200 rounded-xl p-4 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                            {formattedDate}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">
                            {report.total_sales} sales
                          </span>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
                          {formatCurrency(report.total_revenue)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                          </svg>
                          <span className="font-semibold">
                            Avg: {formatCurrency(report.average_sale)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by ID, cashier, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterModal(true)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-md ${
                hasActiveFilters
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                  : "bg-white text-gray-700 border-2 border-gray-200 hover:border-amber-300"
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Active Filters:
              </span>
              {filterPayment !== "all" && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  Payment: {filterPayment}
                  <button onClick={() => setFilterPayment("all")}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {sortBy !== "newest" && (
                <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  Sort: {sortBy}
                  <button onClick={() => setSortBy("newest")}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-all"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Results Count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-0.5">
                Transaction History
              </h2>
              <p className="text-xs text-gray-600">
                Showing {currentSales.length} of {filteredAndSortedSales.length}{" "}
                transactions
              </p>
            </div>
          </div>

          {viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {currentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="group relative bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:shadow-xl hover:border-amber-300 transition-all cursor-pointer overflow-hidden"
                  onClick={() => fetchSaleDetails(sale.id)}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-100 to-transparent rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-amber-700 to-orange-900 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-sm sm:text-base font-black text-white">
                          #{sale.id}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${getPaymentMethodBadge(
                          sale.payment_method
                        )}`}
                      >
                        {getPaymentMethodIcon(sale.payment_method)}
                        <span className="text-xs font-bold uppercase">
                          {sale.payment_method}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2">
                        {sale.cashier_name || "Unknown Cashier"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {formatDateShort(sale.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {formatTime(sale.created_at)}
                        </span>
                      </div>
                      {sale.reference_no && (
                        <p className="text-xs text-gray-500 mt-1.5 font-mono truncate">
                          Ref: {sale.reference_no}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t-2 border-dashed border-gray-200">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                          Total
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-gray-900">
                          {formatCurrency(sale.total)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button className="w-full text-center text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
                        View Details
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {currentSales.length === 0 && (
                <div className="col-span-full text-center py-12 sm:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                    No transactions found
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Try adjusting your search or filters
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-all"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                        Cashier
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-amber-50 transition-colors cursor-pointer"
                        onClick={() => fetchSaleDetails(sale.id)}
                      >
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-amber-700 to-orange-900 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-black text-white">
                                #{sale.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-sm font-bold text-gray-900">
                            {sale.cashier_name || "Unknown"}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {formatDateShort(sale.created_at)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatTime(sale.created_at)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border ${getPaymentMethodBadge(
                              sale.payment_method
                            )}`}
                          >
                            {getPaymentMethodIcon(sale.payment_method)}
                            <span className="text-xs font-bold uppercase hidden sm:inline">
                              {sale.payment_method}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-sm sm:text-base font-black text-gray-900">
                            {formatCurrency(sale.total)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {currentSales.length === 0 && (
                  <div className="text-center py-12 sm:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                      No transactions found
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Try adjusting your search or filters
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition-all"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedSales.length > itemsPerPage && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border-2 border-gray-200 rounded-xl p-4 shadow-md">
              <div className="text-sm text-gray-600 font-semibold">
                Page{" "}
                <span className="font-black text-gray-900">{currentPage}</span>{" "}
                of{" "}
                <span className="font-black text-gray-900">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-white border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    const isActive = pageNum === currentPage;
                    const shouldShow =
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 &&
                        pageNum <= currentPage + 1);

                    if (!shouldShow) {
                      if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <span key={index} className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                            : "bg-white border-2 border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <div className="sm:hidden text-sm font-bold text-gray-700">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-white border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-200 animate-slideUp">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white">
                    Filter & Sort
                  </h3>
                </div>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Method Filter */}
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["all", "cash", "card", "gcash"].map((method) => (
                    <button
                      key={method}
                      onClick={() => setFilterPayment(method)}
                      className={`px-4 py-3 rounded-xl font-bold text-sm capitalize transition-all ${
                        filterPayment === method
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Sort By
                </label>
                <div className="space-y-2">
                  {[
                    { value: "newest", label: "Newest First" },
                    { value: "oldest", label: "Oldest First" },
                    { value: "highest", label: "Highest Amount" },
                    { value: "lowest", label: "Lowest Amount" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`w-full px-4 py-3 rounded-xl font-bold text-sm text-left transition-all ${
                        sortBy === option.value
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t-2 border-gray-200 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {showSaleModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-gray-200 animate-slideUp">
            <div className="bg-gradient-to-r from-amber-800 via-orange-900 to-amber-900 p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        Transaction #{selectedSale.id}
                      </h3>
                      <p className="text-white/70 text-xs font-medium">
                        {formatDate(selectedSale.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  onClick={() => setShowSaleModal(false)}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Cashier
                  </label>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                    {selectedSale.cashier_name || "Unknown"}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">
                    Payment
                  </label>
                  <div className="flex items-center gap-1.5">
                    {getPaymentMethodIcon(selectedSale.payment_method)}
                    <p className="text-xs sm:text-sm font-bold text-gray-900 capitalize truncate">
                      {selectedSale.payment_method}
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-amber-200 col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">
                    Reference
                  </label>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 font-mono truncate">
                    {selectedSale.reference_no || "N/A"}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-emerald-200 col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">
                    Time
                  </label>
                  <p className="text-xs sm:text-sm font-bold text-gray-900">
                    {formatTime(selectedSale.created_at)}
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-4 sm:pt-6">
                <h4 className="text-base sm:text-lg font-black text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  Items Purchased
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {selectedSale.items &&
                    selectedSale.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg sm:rounded-xl border border-gray-200 hover:shadow-lg transition-all"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm sm:text-base font-black text-gray-900 mb-1 truncate">
                            {item.product_name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 font-semibold">
                            {formatCurrency(item.price)} ×{" "}
                            <span className="font-black">{item.quantity}</span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base sm:text-xl font-black text-gray-900">
                            {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t-2 border-dashed border-gray-300">
                  <div className="bg-gradient-to-r from-amber-800 via-orange-900 to-amber-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">
                          Total Amount
                        </p>
                        <p className="text-2xl sm:text-3xl font-black text-white">
                          {formatCurrency(selectedSale.total)}
                        </p>
                      </div>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t-2 border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSaleModal(false)}
                className="w-full bg-gradient-to-r from-amber-800 to-orange-900 hover:from-amber-700 hover:to-orange-800 text-white py-3 px-6 rounded-lg sm:rounded-xl font-black text-sm sm:text-base transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default Sales;