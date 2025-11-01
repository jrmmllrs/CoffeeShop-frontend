// src/components/Header.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Coffee,
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Header = ({ onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Define navigation items with role access
  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin"], // Only admin can see dashboard
    },
    {
      path: "/products",
      label: "Products",
      icon: Package,
      roles: ["admin", "manager"], // Admin and manager can see products
    },
    {
      path: "/pos",
      label: "POS",
      icon: ShoppingCart,
      roles: ["admin", "manager", "cashier"], // All roles can access POS
    },
    {
      path: "/sales",
      label: "Sales",
      icon: TrendingUp,
      roles: ["admin", "manager"], // Admin and manager can see sales
    },
    {
      path: "/reports",
      label: "Reports",
      icon: FileText,
      roles: ["admin"], // Only admin can see reports
    },
    {
      path: "/users",
      label: "Users",
      icon: Users,
      roles: ["admin"], // Only admin can see user management
    },
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  const isActive = (path) => location.pathname === path;

  const getUserInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="bg-gradient-to-r from-amber-50 via-white to-orange-50 border-b border-amber-200/50 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo Section - Responsive */}
          <Link
            to={user?.role === "cashier" ? "/pos" : "/dashboard"}
            className="flex items-center space-x-2 sm:space-x-3"
          >
            <div className="bg-gradient-to-br from-amber-600 to-orange-600 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-md">
              <Coffee className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                CoffeePOS
              </h1>
              <p className="text-xs text-amber-600/80 font-medium">
                Brew & Manage
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                CoffeePOS
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation - Show only on large screens */}
          <nav className="hidden lg:flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 xl:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200"
                      : "text-gray-600 hover:bg-amber-100/50 hover:text-amber-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section - Desktop Only */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-4">
            <div className="flex items-center space-x-2 xl:space-x-3 bg-white/80 backdrop-blur-sm px-3 xl:px-4 py-2 rounded-xl border border-amber-200/50 shadow-sm">
              <div className="w-8 h-8 xl:w-10 xl:h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs xl:text-sm shadow-md">
                {getUserInitials(user?.name)}
              </div>
              <div className="text-right">
                <p className="text-xs xl:text-sm font-semibold text-gray-900 max-w-[120px] truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-amber-600 capitalize font-medium">
                  {user?.role || "staff"}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-3 xl:px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline">Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-amber-100/50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation - Responsive */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                      : "text-gray-600 hover:bg-amber-100/50 hover:text-amber-700 bg-white/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Mobile User Info & Logout */}
            <div className="pt-3 mt-3 border-t border-amber-200/50">
              <div className="flex items-center space-x-3 px-4 py-3 bg-white/80 rounded-lg mb-2 border border-amber-200/30">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {getUserInitials(user?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-amber-600 capitalize font-medium">
                    {user?.role || "staff"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-sm"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
