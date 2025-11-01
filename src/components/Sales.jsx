// src/components/Sales.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Sales = () => {
  const { user, logout } = useAuth();
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
    end_date: ""
  });
  const [viewMode, setViewMode] = useState('grid');

  const handleLogout = () => {
    logout();
    navigate("/login");
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
      if (dateRange.start_date) params.append('start_date', dateRange.start_date);
      if (dateRange.end_date) params.append('end_date', dateRange.end_date);
      
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const utcTime = date.getTime();
    const phTime = new Date(utcTime + (8 * 60 * 60 * 1000));
    
    return phTime.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    const utcTime = date.getTime();
    const phTime = new Date(utcTime + (8 * 60 * 60 * 1000));
    
    return phTime.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const utcTime = date.getTime();
    const phTime = new Date(utcTime + (8 * 60 * 60 * 1000));
    
    return phTime.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPaymentMethodBadge = (method) => {
    const styles = {
      cash: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      card: 'bg-blue-50 text-blue-700 border-blue-200',
      gcash: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return styles[method] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getPaymentMethodIcon = (method) => {
    switch(method) {
      case 'cash':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'card':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'gcash':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
  const totalSales = sales.length;
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  const salesByPayment = sales.reduce((acc, sale) => {
    acc[sale.payment_method] = (acc[sale.payment_method] || 0) + parseFloat(sale.total);
    return acc;
  }, {});

  useEffect(() => {
    fetchSales();
    fetchSalesReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-slate-700 font-semibold">Loading sales dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Ultra-Modern Header */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-10">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-12">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <span className="text-2xl">☕</span>
                  </div>
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-800 block leading-none">CoffeePOS</span>
                  <span className="text-xs text-slate-500 font-medium">Sales Analytics</span>
                </div>
              </Link>
              
              <nav className="hidden lg:flex gap-2">
                {[
                  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
                  { name: 'Products', path: '/products', icon: '📦' },
                  { name: 'POS', path: '/pos', icon: '🛒' },
                  { name: 'Sales', path: '/sales', active: true, icon: '💰' },
                  { name: 'Reports', path: '/reports', icon: '📈' },
                  { name: 'Users', path: '/users', icon: '👥' }
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                      item.active
                        ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200/50">
                <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-none mb-0.5">{user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize font-medium">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all shadow-lg shadow-slate-800/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-6 lg:px-10 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-md">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800 mb-0.5">Error Loading Data</h3>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Stats Section */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-3">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                Live Dashboard
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-1 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                Sales Overview
              </h1>
              <p className="text-sm text-slate-600">Real-time revenue tracking and transaction analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-white rounded-lg p-1 shadow-md border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  List
                </button>
              </div>
              <button
                onClick={fetchSales}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 shadow-md hover:shadow-lg text-slate-700 font-bold text-xs transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Premium Dashboard Stats - More Compact */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            {/* Total Revenue - Featured */}
            <div className="md:col-span-2 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl opacity-10 group-hover:opacity-15 transition-opacity"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl blur-2xl opacity-20"></div>
              <div className="relative bg-white/90 backdrop-blur-xl border-2 border-emerald-200/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-0.5">Total Revenue</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-slate-900">{formatCurrency(totalRevenue)}</p>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">+12.5%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-0.5">Cash</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(salesByPayment.cash || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-0.5">Card</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(salesByPayment.card || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-0.5">GCash</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(salesByPayment.gcash || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Transactions */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl blur-xl opacity-20"></div>
              <div className="relative bg-white/90 backdrop-blur-xl border-2 border-blue-200/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Transactions</p>
                <p className="text-3xl font-black text-slate-900 mb-1">{totalSales}</p>
                <p className="text-xs text-blue-600 font-semibold">View all →</p>
              </div>
            </div>

            {/* Average Sale */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl blur-xl opacity-20"></div>
              <div className="relative bg-white/90 backdrop-blur-xl border-2 border-violet-200/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Avg Transaction</p>
                <p className="text-3xl font-black text-slate-900 mb-1">{formatCurrency(averageSale)}</p>
                <p className="text-xs text-violet-600 font-semibold">Per sale</p>
              </div>
            </div>
          </div>

          {/* Quick Report Widget - More Compact */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200/50 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-black text-slate-900">Generate Sales Report</h3>
                </div>
                <p className="text-xs text-slate-600">Select date range to analyze sales performance</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                  className="bg-white border-2 border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                  className="bg-white border-2 border-amber-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={fetchSalesReport}
                  disabled={reportLoading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {reportLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Report Results */}
            {reportData.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-amber-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Report Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {reportData.map((report, index) => {
                    const reportDate = new Date(report.date);
                    const utcTime = reportDate.getTime();
                    const phDate = new Date(utcTime + (8 * 60 * 60 * 1000));
                    const formattedDate = phDate.toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    
                    return (
                      <div key={index} className="bg-white border-2 border-amber-200 rounded-xl p-4 hover:shadow-lg transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">{formattedDate}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">{report.total_sales} sales</span>
                        </div>
                        <p className="text-xl font-black text-slate-900 mb-2">{formatCurrency(report.total_revenue)}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          <span className="font-semibold">Avg: {formatCurrency(report.average_sale)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transactions Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-0.5">Transaction History</h2>
              <p className="text-xs text-slate-600">Click any transaction to view detailed information</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              {totalSales} Transactions
            </div>
          </div>

          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sales.map((sale, index) => (
                <div
                  key={sale.id}
                  className="group relative bg-white/90 backdrop-blur-xl border-2 border-slate-200/60 rounded-2xl p-5 hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer overflow-hidden"
                  onClick={() => fetchSaleDetails(sale.id)}
                  style={{ 
                    animationDelay: `${index * 50}ms`,
                    animation: 'slideInUp 0.4s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-100 to-transparent rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-base font-black text-white">#{sale.id}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 ${getPaymentMethodBadge(sale.payment_method)}`}>
                        {getPaymentMethodIcon(sale.payment_method)}
                        <span className="text-xs font-bold uppercase">{sale.payment_method}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-base font-bold text-slate-900 mb-2">{sale.cashier_name || 'Unknown Cashier'}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateShort(sale.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTime(sale.created_at)}
                        </span>
                      </div>
                      {sale.reference_no && (
                        <p className="text-xs text-slate-500 mt-1.5 font-mono">Ref: {sale.reference_no}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t-2 border-dashed border-slate-200">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total</span>
                        <span className="text-2xl font-black text-slate-900">{formatCurrency(sale.total)}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <button className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2 group-hover:gap-3 transition-all">
                        View Details
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {sales.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">No transactions yet</h3>
                  <p className="text-sm text-slate-500">Sales will appear here as they're processed</p>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="bg-white/90 backdrop-blur-xl border-2 border-slate-200/60 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Cashier</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sales.map((sale, index) => (
                      <tr 
                        key={sale.id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => fetchSaleDetails(sale.id)}
                        style={{ 
                          animationDelay: `${index * 30}ms`,
                          animation: 'slideInUp 0.3s ease-out forwards',
                          opacity: 0
                        }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-black text-white">#{sale.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-900">{sale.cashier_name || 'Unknown'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatDateShort(sale.created_at)}</div>
                          <div className="text-xs text-slate-600">{formatTime(sale.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${getPaymentMethodBadge(sale.payment_method)}`}>
                            {getPaymentMethodIcon(sale.payment_method)}
                            <span className="text-xs font-bold uppercase">{sale.payment_method}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 font-mono">
                          {sale.reference_no || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-base font-black text-slate-900">{formatCurrency(sale.total)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button className="text-slate-600 hover:text-slate-900 font-semibold text-xs">
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sales.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No transactions yet</h3>
                    <p className="text-sm text-slate-500">Sales will appear here as they're processed</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium Modal */}
      {showSaleModal && selectedSale && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-slate-200 animate-slideUp">
            <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">Transaction #{selectedSale.id}</h3>
                      <p className="text-white/70 text-xs font-medium">{formatDate(selectedSale.created_at)}</p>
                    </div>
                  </div>
                </div>
                <button
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
                  onClick={() => setShowSaleModal(false)}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cashier</label>
                  <p className="text-sm font-bold text-slate-900">{selectedSale.cashier_name || 'Unknown'}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Payment</label>
                  <div className="flex items-center gap-1.5">
                    {getPaymentMethodIcon(selectedSale.payment_method)}
                    <p className="text-sm font-bold text-slate-900 capitalize">{selectedSale.payment_method}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                  <label className="block text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Reference</label>
                  <p className="text-sm font-bold text-slate-900 font-mono">{selectedSale.reference_no || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200">
                  <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Time</label>
                  <p className="text-sm font-bold text-slate-900">{formatTime(selectedSale.created_at)}</p>
                </div>
              </div>

              <div className="border-t-2 border-slate-200 pt-6">
                <h4 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Items Purchased
                </h4>
                <div className="space-y-3">
                  {selectedSale.items && selectedSale.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border-2 border-slate-200 hover:shadow-lg transition-all">
                      <div className="flex-1">
                        <p className="text-base font-black text-slate-900 mb-1">{item.product_name}</p>
                        <p className="text-sm text-slate-600 font-semibold">
                          {formatCurrency(item.price)} × <span className="font-black">{item.quantity}</span>
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xl font-black text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-300">
                  <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Total Amount</p>
                        <p className="text-3xl font-black text-white">{formatCurrency(selectedSale.total)}</p>
                      </div>
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t-2 border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowSaleModal(false)}
                className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white py-3 px-6 rounded-xl font-black text-base transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #94a3b8, #64748b);
        }
      `}</style>
    </div>
  );
};

export default Sales;