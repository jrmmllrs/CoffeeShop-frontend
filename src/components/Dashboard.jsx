// src/components/Dashboard.jsx
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Quick stats data (you can replace this with actual data from your API)
  const stats = [
    { title: "Total Products", value: "24", color: "bg-blue-500", icon: "📦" },
    { title: "Low Stock Items", value: "3", color: "bg-yellow-500", icon: "⚠️" },
    { title: "Today's Sales", value: "₱5,240", color: "bg-green-500", icon: "💰" },
    { title: "Pending Orders", value: "2", color: "bg-purple-500", icon: "⏳" }
  ];

  const quickActions = [
    {
      title: "Manage Products",
      description: "Add, edit, or remove products",
      icon: "📦",
      path: "/products",
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "New Sale",
      description: "Process a new customer order",
      icon: "💰",
      path: "/sales",
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "View Inventory",
      description: "Check stock levels and logs",
      icon: "📊",
      path: "/inventory",
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "Sales Report",
      description: "View sales analytics",
      icon: "📈",
      path: "/reports",
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">☕ CoffeePOS</h1>
              <nav className="ml-10 flex space-x-8">
                <Link 
                  to="/dashboard" 
                  className="text-green-700 border-b-2 border-green-700 px-3 py-2 text-sm font-medium"
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name}! 👋
            </h2>
            <p className="text-gray-600">
              Here's what's happening with your coffee shop today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-lg p-3 mr-4`}>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className={`${action.color} text-white rounded-lg p-6 block transition-colors duration-200 hover:shadow-md`}
                >
                  <div className="text-3xl mb-3">{action.icon}</div>
                  <h4 className="font-semibold text-lg mb-2">{action.title}</h4>
                  <p className="text-white text-opacity-90 text-sm">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity (Placeholder) */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Sales</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">Order #00{item}</p>
                      <p className="text-sm text-gray-500">2 items • Just now</p>
                    </div>
                    <span className="font-semibold text-green-600">₱245.00</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Low Stock Alert</h3>
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-yellow-500 mr-3">⚠️</span>
                      <div>
                        <p className="font-medium text-gray-900">Product {item}</p>
                        <p className="text-sm text-gray-600">Only 2 items left</p>
                      </div>
                    </div>
                    <Link 
                      to="/products" 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Restock
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;