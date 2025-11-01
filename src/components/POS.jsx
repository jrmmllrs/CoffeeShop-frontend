// src/components/POS.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header";

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Cart Item Component
const CartItem = ({ item, onUpdate, onRemove }) => {
  const [quantity, setQuantity] = useState(item.quantity);

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    setQuantity(newQuantity);
    onUpdate({ ...item, quantity: newQuantity });
  };

  const increment = () => handleQuantityChange(quantity + 1);
  const decrement = () => {
    if (quantity > 1) {
      handleQuantityChange(quantity - 1);
    } else {
      onRemove(item.id);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 hover:shadow-md transition-all">
      <div className="flex-1 min-w-0 mr-3">
        <h4 className="font-bold text-gray-900 truncate text-sm sm:text-base">
          {item.name}
        </h4>
        <p className="text-amber-700 font-semibold text-xs sm:text-sm">
          ₱{parseFloat(item.price).toFixed(2)}
        </p>
        <p className="text-xs text-gray-600 font-medium mt-0.5">
          Subtotal:{" "}
          <span className="font-bold text-gray-900">
            ₱{(parseFloat(item.price) * item.quantity).toFixed(2)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-full p-1 shadow-sm border border-amber-200">
          <button
            onClick={decrement}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 flex items-center justify-center transition-all shadow-sm active:scale-95"
          >
            <span className="text-gray-700 font-bold text-lg">−</span>
          </button>

          <span className="w-7 sm:w-8 text-center font-bold text-gray-900 text-sm sm:text-base">
            {quantity}
          </span>

          <button
            onClick={increment}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 flex items-center justify-center transition-all shadow-md active:scale-95"
          >
            <span className="text-white font-bold text-lg">+</span>
          </button>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="text-red-500 hover:text-red-700 p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-all active:scale-95"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Main POS Component
const POS = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCartModal, setShowCartModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error("Fetch products failed:", err);
    }
  };

  // Add product to cart
  const addToCart = (product) => {
    if (product.stock === 0) {
      alert("❌ This product is out of stock!");
      return;
    }

    if (product.stock <= 10) {
      alert(`⚠️ Low stock! Only ${product.stock} units remaining.`);
    }

    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      if (existing.quantity + 1 > product.stock) {
        alert(`❌ Only ${product.stock} units available in stock!`);
        return;
      }
      setCart(
        cart.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Update item quantity
  const updateCartItem = (updatedItem) => {
    const product = products.find((p) => p.id === updatedItem.id);
    if (product && updatedItem.quantity > product.stock) {
      alert(`❌ Only ${product.stock} units available in stock!`);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
  };

  // Remove item from cart
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  // Compute total
  const total = cart.reduce(
    (sum, i) => sum + parseFloat(i.price) * i.quantity,
    0
  );

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");

    if (
      (paymentMethod === "card" || paymentMethod === "gcash") &&
      !referenceNo
    ) {
      return alert(`Please enter a ${paymentMethod} reference number.`);
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const saleItems = cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      const response = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: saleItems,
          payment_method: paymentMethod,
          reference_no: referenceNo || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record sale");
      }

      const result = await response.json();

      alert(
        `✅ Sale #${result.sale.id} recorded successfully (${paymentMethod})!`
      );
      setCart([]);
      setReferenceNo("");
      setPaymentMethod("cash");
      fetchProducts();
    } catch (err) {
      console.error("Checkout failed:", err);
      alert("❌ Failed to record sale: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Are you sure you want to clear the cart?")) {
      setCart([]);
    }
  };

  // Get unique categories
  const categories = [
    "All",
    ...new Set(products.map((p) => p.category || "Uncategorized")),
  ];

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get stock status color
  const getStockStatusColor = (stock) => {
    if (stock === 0) return "text-red-700 bg-red-100 border-red-200";
    if (stock <= 10) return "text-amber-700 bg-amber-100 border-amber-200";
    return "text-green-700 bg-green-100 border-green-200";
  };

  // Get stock status text
  const getStockStatusText = (stock) => {
    if (stock === 0) return "Out of Stock";
    if (stock <= 10) return `${stock} left`;
    return "In Stock";
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <Header onLogout={handleLogout} />

      {/* Floating Cart Button for Mobile/Tablet */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowCartModal(true)}
          className="relative bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95"
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
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Main POS Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
            Live POS System
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-900 mb-1">
            Point of Sale
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Process orders and manage transactions efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ===================== ORDER SUMMARY - DESKTOP ONLY ===================== */}
          <div className="hidden lg:block lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-xl p-4 sm:p-6 lg:sticky lg:top-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Order Summary
                </h2>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <>
                      <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                        items
                      </span>
                      <button
                        onClick={clearCart}
                        className="text-red-500 hover:text-red-700 text-xs sm:text-sm font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-base sm:text-lg font-semibold">
                    Cart is empty
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">
                    Add products from the menu
                  </p>
                </div>
              ) : (
                <div className="max-h-60 sm:max-h-96 overflow-y-auto mb-4 pr-2 space-y-2 sm:space-y-3 custom-scrollbar">
                  {cart.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdate={updateCartItem}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>
              )}

              {/* TOTAL */}
              {cart.length > 0 && (
                <div className="border-t-2 border-dashed border-amber-200 pt-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base font-bold text-gray-600">
                      Subtotal:
                    </span>
                    <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* PAYMENT METHOD */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Payment Method:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border-2 border-amber-200 bg-white rounded-xl p-2.5 sm:p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm sm:text-base font-semibold text-gray-700"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="gcash">📱 GCash</option>
                </select>
              </div>

              {/* REFERENCE NUMBER */}
              {(paymentMethod === "card" || paymentMethod === "gcash") && (
                <div className="mb-4 animate-slideDown">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    {paymentMethod === "card" ? "Card" : "GCash"} Reference:
                  </label>
                  <input
                    type="text"
                    placeholder={
                      paymentMethod === "card"
                        ? "Enter transaction ID"
                        : "Enter GCash reference number"
                    }
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full border-2 border-amber-200 rounded-xl p-2.5 sm:p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm sm:text-base"
                  />
                </div>
              )}

              {/* CHECKOUT BUTTON */}
              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className={`w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base text-white transition-all shadow-lg ${
                  loading || cart.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Checkout - ₱{total.toFixed(2)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ===================== PRODUCTS - RIGHT SIDE ===================== */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white border-2 border-amber-200 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                  Menu
                </h2>
                <div className="flex items-center gap-2">
                  <div className="text-xs sm:text-sm text-gray-600 font-semibold bg-amber-100 px-3 py-1.5 rounded-full">
                    {filteredProducts.length} products
                  </div>
                  {/* Mobile Cart Summary Badge */}
                  <button
                    onClick={() => setShowCartModal(true)}
                    className="lg:hidden flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-lg"
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
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    {cart.length > 0 && (
                      <span>
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* SEARCH BAR */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-amber-50 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm sm:text-base"
                />
                <svg
                  className="w-5 h-5 text-amber-600 absolute left-3 top-1/2 transform -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* CATEGORY FILTERS */}
              <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold transition-all text-xs sm:text-sm ${
                      activeCategory === category
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg scale-105"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>

              {/* PRODUCTS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className={`bg-white border-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-200 transform hover:-translate-y-1 flex flex-col items-center text-center group ${
                      product.stock === 0
                        ? "border-gray-200 opacity-50 cursor-not-allowed"
                        : "border-amber-200 hover:shadow-xl hover:border-amber-400 active:scale-95"
                    }`}
                  >
                    {/* PRODUCT IMAGE */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 sm:mb-3 rounded-xl overflow-hidden border-2 border-amber-200 shadow-md group-hover:shadow-lg transition-all">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* PRODUCT NAME */}
                    <div className="font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-2 text-xs sm:text-sm leading-tight min-h-[2.5rem] sm:min-h-[3rem]">
                      {product.name}
                    </div>

                    {/* PRODUCT CATEGORY */}
                    {product.category && (
                      <div className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mb-1 sm:mb-2 font-semibold">
                        {product.category}
                      </div>
                    )}

                    {/* PRODUCT PRICE */}
                    <div className="text-base sm:text-lg font-black bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent mb-2">
                      ₱{parseFloat(product.price).toFixed(2)}
                    </div>

                    {/* STOCK STATUS */}
                    <div
                      className={`text-xs px-2 py-1 rounded-full font-bold border ${getStockStatusColor(
                        product.stock
                      )}`}
                    >
                      {getStockStatusText(product.stock)}
                    </div>

                    {/* ADD TO CART HINT */}
                    {product.stock > 0 && (
                      <div className="mt-2 text-xs text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        Click to add
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-base sm:text-lg font-semibold mb-1">
                    No products found
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    {searchQuery
                      ? `No results for "${searchQuery}"`
                      : activeCategory === "All"
                      ? "No products available"
                      : `No products in ${activeCategory} category`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MOBILE/TABLET CART MODAL ===================== */}
      {showCartModal && (
        <div className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end animate-fadeIn">
          <div className="bg-white w-full rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-slideUp">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-700 to-orange-800 p-4 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
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
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Shopping Cart
                    </h3>
                    <p className="text-white/80 text-xs font-medium">
                      {cart.length === 0
                        ? "Empty cart"
                        : `${cart.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )} items`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all"
                >
                  <svg
                    className="w-6 h-6 text-white"
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-lg font-semibold">
                    Cart is empty
                  </p>
                  <p className="text-gray-400 text-sm mt-1 mb-4">
                    Add products from the menu
                  </p>
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-2 rounded-xl font-bold text-sm"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {cart.map((item) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onUpdate={updateCartItem}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>

                  {/* Subtotal */}
                  <div className="border-t-2 border-dashed border-amber-200 pt-4 mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-gray-600">
                        Subtotal:
                      </span>
                      <span className="text-xl font-black bg-gradient-to-r from-amber-700 to-amber-900 bg-clip-text text-transparent">
                        ₱{total.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                      in cart
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Payment Method:
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border-2 border-amber-200 bg-white rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-semibold text-gray-700"
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="card">💳 Card</option>
                      <option value="gcash">📱 GCash</option>
                    </select>
                  </div>

                  {/* Reference Number */}
                  {(paymentMethod === "card" || paymentMethod === "gcash") && (
                    <div className="mb-4 animate-slideDown">
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        {paymentMethod === "card" ? "Card" : "GCash"} Reference:
                      </label>
                      <input
                        type="text"
                        placeholder={
                          paymentMethod === "card"
                            ? "Enter transaction ID"
                            : "Enter GCash reference number"
                        }
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        className="w-full border-2 border-amber-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer - Checkout Button */}
            {cart.length > 0 && (
              <div className="sticky bottom-0 bg-white border-t-2 border-amber-200 p-4 rounded-b-3xl">
                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold text-sm transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      handleCheckout();
                      setShowCartModal(false);
                    }}
                    disabled={loading}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg ${
                      loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl active:scale-95"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Checkout - ₱{total.toFixed(2)}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(100%);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #fef3c7;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f59e0b;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d97706;
        }
      `}</style>
    </div>
  );
};

export default POS;
