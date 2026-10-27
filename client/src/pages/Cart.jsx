import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import '/src/styles/cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [deliverySettings, setDeliverySettings] = useState({
    deliveryCharge: 40,
    freeDeliveryThreshold: 499,
  });
  const [purchaseLimits, setPurchaseLimits] = useState({});
  const [loading, setLoading] = useState(true);

  // Load cart from localStorage
  const loadCart = () => {
    const stored = JSON.parse(localStorage.getItem('cart')) || [];
    setCart(stored);
    setLoading(false);
  };

  // Load delivery settings
  const loadDeliverySettings = async () => {
    try {
      const res = await fetch('/api/delivery-charge');
      const data = await res.json();
      if (data.success) {
        setDeliverySettings({
          deliveryCharge: data.deliveryCharge || 40,
          freeDeliveryThreshold: data.freeDeliveryThreshold || 499,
        });
      }
    } catch {
      // Use defaults
    }
  };

  // ✅ Load purchase limits (bulk) from DB
  const loadPurchaseLimits = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // Guest user — no limits check

    const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
    const productIds = storedCart.map((i) => i.id).filter(Boolean);
    if (productIds.length === 0) return;

    try {
      const res = await fetch('/api/purchase-limits/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productIds }),
      });
      const data = await res.json();
      if (data.success && data.limits) {
        setPurchaseLimits(data.limits);
      }
    } catch (err) {
      console.warn('Purchase limits fetch failed:', err);
    }
  };

  useEffect(() => {
    loadDeliverySettings();
    loadCart();
    loadPurchaseLimits();

    const handleStorage = () => {
      loadCart();
      loadPurchaseLimits();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ============================================
  // CART OPERATIONS
  // ============================================
  const updateQuantity = (index, change) => {
    const newCart = [...cart];
    const currentQty = parseInt(newCart[index].quantity) || 1;
    const newQty = currentQty + change;

    if (newQty < 1) return;

    // ✅ Max purchase limit check (sirf tab jab increase ho raha ho)
    if (change > 0) {
      const itemId = newCart[index].id;
      const limit = purchaseLimits[itemId];

      if (limit && !limit.unlimited) {
        if (newQty > limit.remaining) {
          if (limit.remaining === 0) {
            toast.error(
              `❌ You've already purchased the maximum allowed (${limit.maxPurchase}) of this product.`,
              { duration: 4000 }
            );
          } else {
            toast.error(
              `❌ Max ${limit.maxPurchase} allowed. You've already bought ${limit.purchased}. Only ${limit.remaining} more can be added.`,
              { duration: 4000 }
            );
          }
          return;
        }
      }
    }

    newCart[index].quantity = newQty;
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
    window.dispatchEvent(new Event('storage'));
  };

  const removeItem = (index) => {
    if (!window.confirm('Remove this item from your cart?')) return;
    const newCart = [...cart];
    newCart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
    window.dispatchEvent(new Event('storage'));
    toast.success('Item removed');
  };

  const clearCart = () => {
    if (!window.confirm('Clear your entire cart?')) return;
    localStorage.removeItem('cart');
    setCart([]);
    window.dispatchEvent(new Event('storage'));
    toast.success('Cart cleared successfully!');
  };

  // ✅ Checkout pe login + limit check
  const proceedToCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to proceed to checkout');
      navigate('/login?redirect=/payment');
      return;
    }

    // Final limit check (in case purchaseLimits still loading)
    for (const item of cart) {
      const limit = purchaseLimits[item.id];
      if (limit && !limit.unlimited) {
        const qty = parseInt(item.quantity) || 1;
        if (qty > limit.remaining) {
          toast.error(
            `❌ ${item.name}: Only ${limit.remaining} more allowed (already bought ${limit.purchased}/${limit.maxPurchase})`,
            { duration: 5000 }
          );
          return;
        }
      }
    }

    navigate('/payment');
  };

  // ============================================
  // CALCULATIONS
  // ============================================
  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * (parseInt(item.quantity) || 1),
    0
  );
  const deliveryCharge =
    subtotal >= deliverySettings.freeDeliveryThreshold
      ? 0
      : deliverySettings.deliveryCharge;
  const grandTotal = subtotal + deliveryCharge;
  const totalItems = cart.reduce(
    (sum, item) => sum + (parseInt(item.quantity) || 1),
    0
  );

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          <div
            className="empty-cart"
            style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <i
              className="fas fa-spinner fa-spin"
              style={{ fontSize: '30px', color: 'var(--primary)' }}
            ></i>
            <p style={{ marginTop: '10px' }}>Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="cart-hero">
        <h1>
          <i
            className="fas fa-shopping-cart"
            style={{ color: 'var(--primary)' }}
          ></i>{' '}
          Your <span className="highlight">Shopping Cart</span>
        </h1>
        <p>Review your items and proceed to checkout</p>
      </div>

      {/* CART PAGE */}
      <div className="cart-page">
        <div className="cart-container">
          {/* Cart Header */}
          <div className="cart-header">
            <h2>
              <i className="fas fa-shopping-cart"></i> Cart
              <span className="cart-count-badge">{totalItems}</span>
            </h2>
            <div className="delivery-info">
              <i className="fas fa-truck"></i>{' '}
              {subtotal >= deliverySettings.freeDeliveryThreshold ? (
                <span className="free">✓ Free Delivery</span>
              ) : (
                <>Free above ₹{deliverySettings.freeDeliveryThreshold}</>
              )}
            </div>
          </div>

          {/* Cart Items or Empty */}
          {cart.length === 0 ? (
            <div className="empty-cart">
              <span className="icon">🛒</span>
              <h2>Your Cart is Empty</h2>
              <p>Time to fuel your fitness journey! Browse our premium desi blends.</p>
              <Link to="/products" className="btn-shop-now">
                <i className="fas fa-shopping-bag"></i> Start Shopping
              </Link>
            </div>
          ) : (
            <>
              <div className="cart-items-list">
                {cart.map((item, index) => {
                  const price = parseFloat(item.price) || 0;
                  const qty = parseInt(item.quantity) || 1;
                  const itemTotal = price * qty;

                  // ✅ Limit info for this item
                  const limit = purchaseLimits[item.id];
                  const isAtLimit = limit && !limit.unlimited && qty >= limit.remaining;
                  const isMaxed = limit && !limit.unlimited && limit.remaining === 0;

                  return (
                    <div
                      className="cart-item"
                      key={index}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="cart-item-image">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name || 'Product'}
                            loading="lazy"
                            onError={(e) => (e.target.style.display = 'none')}
                          />
                        ) : (
                          <span className="no-image">💪</span>
                        )}
                      </div>

                      <div className="cart-item-details">
                        <div className="cart-item-name">{item.name || 'Product'}</div>
                        <div className="cart-item-price">₹{price.toFixed(0)}</div>
                        {item.variant && (
                          <div className="cart-item-variant">📦 {item.variant}</div>
                        )}

                        {/* ✅ Limit info badge */}
                        {limit && !limit.unlimited && (
                          <div
                            className="cart-item-limit"
                            style={{
                              fontSize: '11px',
                              marginTop: '6px',
                              padding: '3px 8px',
                              display: 'inline-block',
                              borderRadius: '4px',
                              background:
                                isMaxed
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : isAtLimit
                                  ? 'rgba(250, 204, 21, 0.15)'
                                  : 'rgba(34, 197, 94, 0.12)',
                              color: isMaxed
                                ? '#ef4444'
                                : isAtLimit
                                ? '#facc15'
                                : '#22c55e',
                              fontWeight: '600',
                            }}
                          >
                            {isMaxed
                              ? `❌ Max ${limit.maxPurchase} bought`
                              : `Max ${limit.maxPurchase} per user · ${limit.remaining} left`}
                          </div>
                        )}
                      </div>

                      <div className="cart-item-actions">
                        <div className="quantity-control">
                          <button
                            className="quantity-btn"
                            onClick={() => updateQuantity(index, -1)}
                            disabled={qty <= 1}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="quantity-number">{qty}</span>
                          <button
                            className="quantity-btn"
                            onClick={() => updateQuantity(index, 1)}
                            disabled={isAtLimit || isMaxed}
                            title={
                              isAtLimit || isMaxed
                                ? `Max ${limit?.maxPurchase} allowed per user`
                                : 'Increase quantity'
                            }
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>

                        <div className="item-total">₹{itemTotal.toFixed(0)}</div>

                        <button
                          className="remove-btn"
                          onClick={() => removeItem(index)}
                          title="Remove item"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Summary */}
              <div className="cart-summary">
                <div className="cart-summary-left">
                  <Link to="/products" className="btn-secondary-cart">
                    <i className="fas fa-arrow-left"></i> Continue Shopping
                  </Link>
                  <button className="btn-danger-cart" onClick={clearCart}>
                    <i className="fas fa-trash-alt"></i> Clear Cart
                  </button>
                </div>

                <div className="cart-summary-right">
                  <div className="cart-total-label">Subtotal</div>
                  <div className="cart-total-amount">₹{subtotal.toFixed(0)}</div>
                  <div className="cart-total-sub">
                    {deliveryCharge > 0 ? (
                      <>
                        <i className="fas fa-truck"></i> Delivery: ₹
                        {deliveryCharge.toFixed(0)}
                      </>
                    ) : (
                      <span className="free">
                        <i className="fas fa-check-circle"></i> Free Delivery
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: '8px',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: '700',
                    }}
                  >
                    Total: ₹{grandTotal.toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <div className="cart-actions">
                <button
                  className="btn-primary-cart"
                  onClick={proceedToCheckout}
                >
                  <i className="fas fa-lock"></i> Proceed to Checkout
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Cart;