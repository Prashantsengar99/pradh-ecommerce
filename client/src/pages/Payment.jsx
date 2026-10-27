import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import '/src/styles/payment.css';

const Payment = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [deliverySettings, setDeliverySettings] = useState({
    deliveryCharge: 49,
    freeDeliveryThreshold: 999,
  });
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState({ type: '', text: '' });
  const [couponInput, setCouponInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [status, setStatus] = useState({ show: false, type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });

  // ============================================
  // INIT
  // ============================================
  useEffect(() => {
    // ✅ Login check — bina login ke payment page pe nahi aa sakte
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to continue');
      navigate('/login?redirect=/payment');
      return;
    }

    const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
    setCart(storedCart);

    const loadDeliverySettings = async () => {
      try {
        const res = await fetch('/api/delivery-charge');
        const data = await res.json();
        if (data.success) {
          setDeliverySettings({
            deliveryCharge: data.deliveryCharge || 49,
            freeDeliveryThreshold: data.freeDeliveryThreshold || 999,
          });
        }
      } catch {
        // Use defaults
      }
    };

    loadDeliverySettings();

    // Prefill user data if logged in
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      if (user) {
        setForm((prev) => ({
          ...prev,
          name: user.username || user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          city: user.city || '',
          pincode: user.pincode || '',
        }));
      }
    } catch {}
  }, [navigate]);

  // ============================================
  // CALCULATIONS
  // ============================================
  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * (parseInt(item.quantity) || 1),
    0
  );
  const deliveryCharge = subtotal >= deliverySettings.freeDeliveryThreshold ? 0 : deliverySettings.deliveryCharge;
  const grandTotal = subtotal + deliveryCharge - couponDiscount;

  // ============================================
  // COUPON
  // ============================================
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setCouponMessage({ type: 'info', text: '💡 Enter a coupon code' });
      return;
    }

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount: subtotal }),
      });

      const data = await res.json();

      if (data.valid) {
        const discount = data.discountAmount || (subtotal * (data.discount / 100));
        setCouponDiscount(discount);
        setCouponApplied(true);
        setAppliedCouponCode(code);
        setCouponMessage({
          type: 'success',
          text: `✅ Coupon "${code}" applied! ${data.discount}% off (₹${discount.toFixed(2)})`,
        });
        toast.success('Coupon applied!');
      } else {
        setCouponDiscount(0);
        setCouponApplied(false);
        setAppliedCouponCode('');
        setCouponMessage({
          type: 'error',
          text: `❌ ${data.message || 'Invalid coupon code'}`,
        });
      }
    } catch (err) {
      setCouponMessage({
        type: 'error',
        text: `❌ Error validating coupon: ${err.message}`,
      });
    }
  };

  // ============================================
  // FORM CHANGE
  // ============================================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };

  // ============================================
  // PAYMENT METHOD
  // ============================================
  const selectPaymentMethod = (method) => {
    setPaymentMethod(method);
  };

  // ============================================
  // SHOW STATUS
  // ============================================
  const showStatus = (message, type) => {
    setStatus({ show: true, type, message });
  };

  // ============================================
  // INITIATE PAYMENT
  // ============================================
  const initiatePayment = async () => {
    // Validation
    if (!form.name || !form.phone || !form.address) {
      showStatus('Please fill all required fields', 'error');
      return;
    }

    if (cart.length === 0) {
      showStatus('Your cart is empty!', 'error');
      return;
    }

    // ✅ Login check before payment
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to continue');
      navigate('/login?redirect=/payment');
      return;
    }

    setLoading(true);
    showStatus('Creating order...', 'loading');

    try {
      // ✅ Step 1: Create Razorpay order on server — WITH AUTH HEADER
      const orderRes = await fetch('/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ Ye line add ki
        },
        body: JSON.stringify({
          amount: grandTotal,
          currency: 'INR',
        }),
      });

      // ✅ 401 handle
      if (orderRes.status === 401) {
        throw new Error('Session expired. Please login again.');
      }

      const orderText = await orderRes.text();

      if (!orderText || orderText.trim() === '') {
        throw new Error('Server returned empty response. Check server is running & Razorpay keys are in .env');
      }

      let orderData;
      try {
        orderData = JSON.parse(orderText);
      } catch (parseErr) {
        console.error('Invalid JSON from /create-order:', orderText);
        throw new Error('Server sent invalid response. Check server logs.');
      }

      if (!orderData.success) {
        throw new Error(orderData.error || orderData.message || 'Failed to create order');
      }

      // ✅ Step 2: Open Razorpay checkout
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_T4HPQRHmf5mAUo';

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'PRADH Desi Fuel',
        description: 'Premium Desi Nutrition',
        order_id: orderData.orderId,
        image: '/logo.jpeg',
        prefill: {
          name: form.name,
          email: form.email || 'customer@pradh.com',
          contact: form.phone,
        },
        notes: {
          address: form.address,
        },
        theme: {
          color: '#facc15',
        },
        handler: async function (response) {
          // ✅ Step 3: Verify payment — WITH AUTH HEADER
          showStatus('Verifying payment...', 'loading');

          try {
            const verifyRes = await fetch('/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // ✅ Ye line add ki
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderDetails: {
                  items: cart,
                  total: grandTotal,
                  deliveryCharge: deliveryCharge,
                  coupon: couponApplied ? appliedCouponCode : null,
                  discount: couponDiscount,
                  customer: {
                    name: form.name,
                    phone: form.phone,
                    email: form.email,
                    address: form.address,
                    city: form.city,
                    pincode: form.pincode,
                    paymentMethod: paymentMethod,
                  },
                },
              }),
            });

            if (verifyRes.status === 401) {
              throw new Error('Session expired. Please login again.');
            }

            const verifyText = await verifyRes.text();

            if (!verifyText || verifyText.trim() === '') {
              throw new Error('Empty response from /verify-payment');
            }

            let verifyData;
            try {
              verifyData = JSON.parse(verifyText);
            } catch (parseErr) {
              console.error('Invalid JSON from /verify-payment:', verifyText);
              throw new Error('Server sent invalid verification response');
            }

            if (verifyData.success) {
              // Clear cart
              localStorage.removeItem('cart');
              window.dispatchEvent(new Event('storage'));

              showStatus('✅ Payment successful! Order placed.', 'success');
              toast.success('Order placed successfully! 🎉');

              setTimeout(() => {
                navigate('/dashboard');
              }, 2000);
            } else {
              throw new Error(verifyData.error || verifyData.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error('Verification error:', err);
            showStatus('❌ Payment verification failed: ' + err.message, 'error');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            showStatus('Payment cancelled', 'error');
            setLoading(false);
          },
        },
      };

      // Check Razorpay SDK loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);
    } catch (err) {
      console.error('Payment error:', err);
      showStatus('❌ ' + err.message, 'error');
      setLoading(false);
    }
  };

  // ============================================
  // EMPTY CART VIEW
  // ============================================
  if (cart.length === 0) {
    return (
      <>
        <div className="checkout-hero">
          <h1>
            <i className="fas fa-credit-card" style={{ color: 'var(--primary)' }}></i>{' '}
            <span className="highlight">Checkout</span>
          </h1>
          <p>Complete your payment and place your order</p>
        </div>

        <div className="payment-page">
          <div className="payment-card">
            <div className="empty-cart-checkout">
              <i className="fas fa-shopping-cart"></i>
              <p>Your cart is empty</p>
              <Link to="/products">Browse Products →</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="checkout-hero">
        <h1>
          <i className="fas fa-credit-card" style={{ color: 'var(--primary)' }}></i>{' '}
          <span className="highlight">Checkout</span>
        </h1>
        <p>Complete your payment and place your order</p>
      </div>

      {/* PAYMENT PAGE */}
      <div className="payment-page">
        <div className="payment-container">
          {/* LEFT — Order Summary */}
          <div className="payment-card">
            <h3>
              <i className="fas fa-shopping-bag"></i> Order Summary
            </h3>

            <div className="order-items-list">
              {cart.map((item, index) => (
                <div className="order-item-payment" key={index}>
                  <div className="order-item-name">
                    <span>{item.name || 'Product'}</span>
                    <span className="qty-badge">×{item.quantity}</span>
                    {item.variant && <span className="variant-tag">({item.variant})</span>}
                  </div>
                  <div className="order-item-price">
                    ₹{(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-total-section">
              <div className="order-total-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="order-total-row" style={{ color: '#22c55e' }}>
                  <span>🎉 Discount</span>
                  <span>-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="order-total-row">
                <span>Delivery</span>
                <span>
                  {deliveryCharge === 0 ? (
                    <span className="delivery-free">FREE</span>
                  ) : (
                    `₹${deliveryCharge.toFixed(2)}`
                  )}
                </span>
              </div>

              <div className="order-total-row grand-total">
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="coupon-section">
              <div className="coupon-input-group">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  maxLength={20}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button onClick={handleApplyCoupon}>Apply</button>
              </div>
              {couponMessage.text && (
                <div className={`coupon-message ${couponMessage.type}`}>{couponMessage.text}</div>
              )}
            </div>
          </div>

          {/* RIGHT — Payment Details */}
          <div className="payment-card">
            <h3>
              <i className="fas fa-credit-card"></i> Payment Details
            </h3>

            <div className="form-group">
              <label>
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>
                  Phone <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Delivery Address <span className="required">*</span>
              </label>
              <input
                type="text"
                id="address"
                placeholder="Enter your full address"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  id="city"
                  placeholder="Your city"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  id="pincode"
                  placeholder="110001"
                  value={form.pincode}
                  onChange={handleChange}
                />
              </div>
            </div>

            <label
              style={{
                color: 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: '600',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Payment Method
            </label>

            <div className="payment-methods">
              {[
                { value: 'card', icon: '💳', label: 'Card' },
                { value: 'upi', icon: '📱', label: 'UPI' },
                { value: 'netbanking', icon: '🏦', label: 'Net Banking' },
              ].map((m) => (
                <label
                  key={m.value}
                  className={`payment-method ${paymentMethod === m.value ? 'active' : ''}`}
                  onClick={() => selectPaymentMethod(m.value)}
                >
                  <input type="radio" name="paymentMethod" value={m.value} checked={paymentMethod === m.value} readOnly />
                  <span className="method-icon">{m.icon}</span>
                  <span className="method-label">{m.label}</span>
                </label>
              ))}
            </div>

            {status.show && (
              <div className={`payment-status show ${status.type}`}>
                {status.type === 'success' && <span className="status-icon">✅</span>}
                {status.type === 'error' && <span className="status-icon">❌</span>}
                {status.type === 'loading' && <span className="status-icon">⏳</span>}
                {status.message}
              </div>
            )}

            <button className={`pay-btn ${loading ? 'loading' : ''}`} onClick={initiatePayment} disabled={loading}>
              <span className="btn-text">
                <i className="fas fa-lock"></i> Pay Now
              </span>
              <span className="spinner">
                <i className="fas fa-spinner fa-spin"></i>
              </span>
            </button>

            <div className="security-badge">
              <i className="fas fa-shield-alt"></i>
              Secure payment powered by Razorpay. Your data is safe.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Payment;