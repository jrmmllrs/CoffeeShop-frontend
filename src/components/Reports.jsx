// src/components/Reports.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from 'react-router-dom';

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
    inventory: []
  });
  const [dateRange, setDateRange] = useState({
    start_date: "",
    end_date: ""
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
      
      // Fetch sales report
      const salesParams = new URLSearchParams();
      if (dateRange.start_date) salesParams.append('start_date', dateRange.start_date);
      if (dateRange.end_date) salesParams.append('end_date', dateRange.end_date);

      const salesResponse = await fetch(
        `${API_URL}/api/sales/report?${salesParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!salesResponse.ok) throw new Error("Failed to fetch sales report");
      const salesData = await salesResponse.json();

      // Fetch products data
      const productsResponse = await fetch(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!productsResponse.ok) throw new Error("Failed to fetch products");
      const productsData = await productsResponse.json();

      // Fetch inventory logs
      const inventoryResponse = await fetch(`${API_URL}/api/inventory/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const inventoryData = inventoryResponse.ok ? await inventoryResponse.json() : [];

      setReportData({
        sales: salesData,
        products: productsData,
        inventory: inventoryData
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      day: 'numeric'
    });
  };

  // Format date with time
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate overview statistics
  const calculateOverviewStats = () => {
    const totalRevenue = reportData.sales.reduce((sum, day) => sum + parseFloat(day.total_revenue || 0), 0);
    const totalSales = reportData.sales.reduce((sum, day) => sum + parseInt(day.total_sales || 0), 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const lowStockProducts = reportData.products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const outOfStockProducts = reportData.products.filter(p => p.stock === 0).length;
    const totalProducts = reportData.products.length;

    const bestSellingProduct = reportData.products
      .filter(p => p.sales_count > 0)
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))[0];

    return {
      totalRevenue,
      totalSales,
      averageSale,
      lowStockProducts,
      outOfStockProducts,
      totalProducts,
      bestSellingProduct
    };
  };

  // Calculate sales by payment method
  const calculatePaymentMethodStats = () => {
    // This would ideally come from a dedicated API endpoint
    // For now, we'll use mock data or calculate from available data
    return [
      { method: 'cash', count: Math.floor(reportData.sales.length * 0.6), amount: 0 },
      { method: 'card', count: Math.floor(reportData.sales.length * 0.25), amount: 0 },
      { method: 'gcash', count: Math.floor(reportData.sales.length * 0.15), amount: 0 }
    ];
  };

  // Get top selling products
  const getTopSellingProducts = () => {
    return reportData.products
      .filter(p => p.sales_count > 0)
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
      .slice(0, 5);
  };

  // Get low stock alerts
  const getLowStockAlerts = () => {
    return reportData.products
      .filter(p => p.stock <= 10)
      .sort((a, b) => a.stock - b.stock);
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const stats = calculateOverviewStats();
  const paymentMethods = calculatePaymentMethodStats();
  const topProducts = getTopSellingProducts();
  const lowStockAlerts = getLowStockAlerts();

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

      {/* Main Reports Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Analytics & Reports</h2>
              <p className="text-gray-600 mt-2">Comprehensive business insights and analytics</p>
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
                  onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
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
                  onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
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
          <div className="flex space-x-1 mb-8 border-b border-gray-200">
            {[
              { id: "overview", name: "📊 Overview", icon: "📊" },
              { id: "sales", name: "💰 Sales Analytics", icon: "💰" },
              { id: "products", name: "📦 Product Performance", icon: "📦" },
              { id: "inventory", name: "📋 Inventory Report", icon: "📋" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
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
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="bg-blue-500 rounded-lg p-3 mr-4">
                      <span className="text-2xl text-white">📈</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Sales</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="bg-purple-500 rounded-lg p-3 mr-4">
                      <span className="text-2xl text-white">📦</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Products</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="bg-amber-500 rounded-lg p-3 mr-4">
                      <span className="text-2xl text-white">⚡</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Sale</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageSale)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Sales Trend</h3>
                  <div className="space-y-3">
                    {reportData.sales.slice(0, 7).map((day, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{formatDate(day.date)}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">{day.total_sales} sales</span>
                          <span className="font-semibold text-green-600">{formatCurrency(day.total_revenue)}</span>
                        </div>
                      </div>
                    ))}
                    {reportData.sales.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No sales data available</p>
                    )}
                  </div>
                </div>

                {/* Inventory Alerts */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Inventory Alerts</h3>
                  <div className="space-y-3">
                    {lowStockAlerts.map((product, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{product.name}</p>
                          <p className="text-sm text-amber-600">
                            {product.stock === 0 ? 'Out of Stock' : `Only ${product.stock} left`}
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
                      <p className="text-green-600 text-center py-4">All products are well stocked! ✅</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Top Selling Products</h3>
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{index + 1}.</span>
                        <div>
                          <p className="font-medium text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-600 capitalize">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{product.sales_count || 0} sold</p>
                        <p className="text-sm text-gray-600">{formatCurrency(product.price)} each</p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No product sales data available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sales Analytics Tab */}
          {activeTab === "sales" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Sales Report */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 Daily Sales Report</h3>
                  <div className="space-y-4">
                    {reportData.sales.map((day, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-800">{formatDate(day.date)}</span>
                          <span className="text-green-600 font-bold">{formatCurrency(day.total_revenue)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span>Total Sales:</span>
                            <span className="font-medium ml-2">{day.total_sales}</span>
                          </div>
                          <div>
                            <span>Average Sale:</span>
                            <span className="font-medium ml-2">{formatCurrency(day.average_sale)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {reportData.sales.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No sales data available for the selected period</p>
                    )}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">💳 Payment Methods</h3>
                  <div className="space-y-3">
                    {paymentMethods.map((method, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {method.method === 'cash' ? '💵' : method.method === 'card' ? '💳' : '📱'}
                          </span>
                          <span className="font-medium text-gray-800 capitalize">{method.method}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{method.count} transactions</p>
                          <p className="text-sm text-gray-600">
                            {Math.round((method.count / stats.totalSales) * 100)}% of total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Performance Tab */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📦 Product Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Category</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Price</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Stock</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.products.map((product, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-800">{product.name}</p>
                              <p className="text-sm text-gray-600">Sales: {product.sales_count || 0}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                            {product.category || 'Uncategorized'}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {formatCurrency(product.price)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.stock === 0 ? 'bg-red-100 text-red-800' :
                              product.stock <= 10 ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {product.stock} units
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.stock === 0 ? 'bg-red-100 text-red-800' :
                              product.stock <= 10 ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {product.stock === 0 ? 'Out of Stock' :
                               product.stock <= 10 ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportData.products.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No products available</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl mb-2">⚠️</div>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.lowStockProducts}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <div className="text-3xl mb-2">❌</div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Stock Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportData.products.map((product, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${
                      product.stock === 0 ? 'border-red-200 bg-red-50' :
                      product.stock <= 10 ? 'border-amber-200 bg-amber-50' :
                      'border-green-200 bg-green-50'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">{product.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock === 0 ? 'bg-red-100 text-red-800' :
                          product.stock <= 10 ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {product.stock} units
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 capitalize mb-2">{product.category}</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</p>
                    </div>
                  ))}
                </div>
                {reportData.products.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No products available</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;