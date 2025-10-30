// src/components/Sales.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from 'react-router-dom';

// Get API URL from environment variables
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch all sales
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

  // Fetch sale details
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

  // Fetch sales report
  const fetchSalesReport = async () => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/api/sales/report`;
      
      // Add date range if provided
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'gcash': return '📱';
      default: return '💰';
    }
  };

  // Calculate totals
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
  const totalSales = sales.length;
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  useEffect(() => {
    fetchSales();
    fetchSalesReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading sales data...</div>
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
                <h1 className="text-2xl font-bold text-gray-900">☕ CoffeePOS</h1>
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
                  className="text-green-700 border-b-2 border-green-700 px-3 py-2 text-sm font-medium"
                >
                  Sales
                </Link>
                                <Link
                  to="/reports"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Reports
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
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

      {/* Main Sales Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sales History & Reports</h2>
            <p className="text-gray-600 mt-2">View all sales transactions and generate reports</p>
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center">
                <div className="bg-blue-500 rounded-lg p-3 mr-4">
                  <span className="text-2xl text-white">💰</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center">
                <div className="bg-green-500 rounded-lg p-3 mr-4">
                  <span className="text-2xl text-white">📊</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center">
                <div className="bg-purple-500 rounded-lg p-3 mr-4">
                  <span className="text-2xl text-white">📈</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Sale</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(averageSale)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Report Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">📈 Sales Report</h3>
                
                {/* Date Range Filter */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.start_date}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.end_date}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <button
                    onClick={fetchSalesReport}
                    disabled={reportLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {reportLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      "Generate Report"
                    )}
                  </button>
                </div>

                {/* Report Results */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reportData.map((report, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-800">{report.date}</span>
                        <span className="text-green-600 font-bold">{formatCurrency(report.total_revenue)}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Sales Count:</span>
                          <span className="font-medium">{report.total_sales}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Sale:</span>
                          <span className="font-medium">{formatCurrency(report.average_sale)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {reportData.length === 0 && !reportLoading && (
                    <div className="text-center py-4 text-gray-500">
                      No report data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sales History Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">📋 Sales History</h3>
                  <button
                    onClick={fetchSales}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>

                {/* Sales List */}
                <div className="space-y-4">
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                      onClick={() => fetchSaleDetails(sale.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-800">Sale #{sale.id}</h4>
                          <p className="text-sm text-gray-600">
                            by {sale.cashier_name || 'Unknown'} • {formatDate(sale.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{formatCurrency(sale.total)}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span>{getPaymentMethodIcon(sale.payment_method)}</span>
                            <span className="capitalize">{sale.payment_method}</span>
                            {sale.reference_no && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                Ref: {sale.reference_no}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Click to view details
                      </div>
                    </div>
                  ))}

                  {sales.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-3">📄</div>
                      <p className="text-gray-500 text-lg">No sales found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Sales will appear here after transactions are made
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Details Modal */}
      {showSaleModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Sale #{selectedSale.id} Details
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                onClick={() => setShowSaleModal(false)}
              >
                <svg
                  className="w-6 h-6"
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

            {/* Modal Content */}
            <div className="p-6">
              {/* Sale Information */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <p className="text-gray-900">{formatDate(selectedSale.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cashier</label>
                  <p className="text-gray-900">{selectedSale.cashier_name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-gray-900 capitalize flex items-center gap-2">
                    {getPaymentMethodIcon(selectedSale.payment_method)}
                    {selectedSale.payment_method}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference No</label>
                  <p className="text-gray-900">{selectedSale.reference_no || 'N/A'}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-4">Items Purchased</h4>
                <div className="space-y-3">
                  {selectedSale.items && selectedSale.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{item.product_name}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-green-600">{formatCurrency(selectedSale.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSaleModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-6 rounded-lg font-medium transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;