// src/components/POS.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

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
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
        <p className="text-amber-600 font-medium">
          ₱{parseFloat(item.price).toFixed(2)}
        </p>
        <p className="text-sm text-gray-500">
          Subtotal: ₱{(parseFloat(item.price) * item.quantity).toFixed(2)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={decrement}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            <span className="text-gray-700 font-bold">−</span>
          </button>

          <span className="w-8 text-center font-semibold text-gray-800">
            {quantity}
          </span>

          <button
            onClick={increment}
            className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors"
          >
            <span className="text-white font-bold">+</span>
          </button>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="text-red-500 hover:text-red-700 p-1 transition-colors"
        >
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

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
    // Check if product is in stock
    if (product.stock === 0) {
      alert("❌ This product is out of stock!");
      return;
    }

    if (product.stock <= 10) {
      alert(`⚠️ Low stock! Only ${product.stock} units remaining.`);
    }

    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      // Check if adding more than available stock
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

      // Transform cart items for backend
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
      // Refresh products to update stock levels
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

  // Filter products by category
  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  // Get stock status color
  const getStockStatusColor = (stock) => {
    if (stock === 0) return "text-red-600 bg-red-50";
    if (stock <= 10) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  // Get stock status text
  const getStockStatusText = (stock) => {
    if (stock === 0) return "Out of Stock";
    if (stock <= 10) return `Only ${stock} left`;
    return "In Stock";
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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
                  className="text-green-700 border-b-2 border-green-700 px-3 py-2 text-sm font-medium"
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
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
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

      {/* Main POS Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Point of Sale
          </h1>
          <p className="text-gray-600 mb-6">
            Manage your sales and orders efficiently
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ===================== ORDER SUMMARY - LEFT SIDE ===================== */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    🧾 Order Summary
                  </h2>
                  <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                      <span className="bg-amber-500 text-white px-2 py-1 rounded-full text-sm font-medium">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                        items
                      </span>
                    )}
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🛒</div>
                    <p className="text-gray-500 text-lg">Your cart is empty</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Add products from the menu
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto mb-4">
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          onUpdate={updateCartItem}
                          onRemove={removeFromCart}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* TOTAL */}
                {cart.length > 0 && (
                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-amber-700">
                        ₱{total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* PAYMENT METHOD */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method:
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="gcash">📱 GCash</option>
                  </select>
                </div>

                {/* REFERENCE NUMBER */}
                {(paymentMethod === "card" || paymentMethod === "gcash") && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {paymentMethod === "card" ? "Card" : "GCash"} Reference
                      Number:
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
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                )}

                {/* CHECKOUT BUTTON */}
                <button
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
                    loading || cart.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-amber-600 hover:bg-amber-700 hover:shadow-lg transform hover:-translate-y-0.5"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Checkout - ₱${total.toFixed(2)}`
                  )}
                </button>
              </div>
            </div>

            {/* ===================== PRODUCTS WITH IMAGES - RIGHT SIDE ===================== */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">☕ Menu</h2>
                  <div className="text-sm text-gray-500">
                    {filteredProducts.length} products available
                  </div>
                </div>

                {/* CATEGORY FILTERS */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-4 py-2 rounded-full font-medium transition ${
                        activeCategory === category
                          ? "bg-amber-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* PRODUCTS GRID WITH IMAGES */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className={`bg-white border rounded-xl p-3 transition-all duration-200 transform hover:-translate-y-1 flex flex-col items-center text-center group ${
                        product.stock === 0
                          ? "border-gray-200 opacity-50 cursor-not-allowed"
                          : "border-gray-200 hover:shadow-lg hover:border-amber-300"
                      }`}
                    >
                      {/* PRODUCT IMAGE */}
                      <div className="w-20 h-20 mb-3 rounded-lg overflow-hidden border border-gray-200">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* PRODUCT NAME */}
                      <div className="font-semibold text-gray-800 mb-1 line-clamp-2 text-sm leading-tight">
                        {product.name}
                      </div>

                      {/* PRODUCT CATEGORY */}
                      {product.category && (
                        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full mb-2">
                          {product.category}
                        </div>
                      )}

                      {/* PRODUCT PRICE */}
                      <div className="text-lg font-bold text-amber-700 mb-2">
                        ₱{parseFloat(product.price).toFixed(2)}
                      </div>

                      {/* STOCK STATUS */}
                      <div
                        className={`text-xs px-2 py-1 rounded-full ${getStockStatusColor(
                          product.stock
                        )}`}
                      >
                        {getStockStatusText(product.stock)}
                      </div>

                      {/* ADD TO CART HINT */}
                      {product.stock > 0 && (
                        <div className="mt-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to add to cart
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">😕</div>
                    <p className="text-gray-500 text-lg">No products found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {activeCategory === "All"
                        ? "No products available"
                        : `No products in ${activeCategory} category`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
