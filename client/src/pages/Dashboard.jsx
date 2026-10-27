import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBox, FaHeart, FaStar, FaMapMarkerAlt, FaUser, FaCog, FaSignOutAlt,
  FaShoppingBag, FaArrowRight, FaRedo, FaTrash, FaPlus,
  FaBell, FaChartLine, FaTruck, FaTimes, FaCheckCircle, FaBoxOpen,
  FaArrowUp, FaArrowDown, FaRupeeSign, FaShoppingCart, FaGift,
  FaInfoCircle, FaFileInvoiceDollar, FaDownload, FaPrint,
  FaCreditCard, FaPhone, FaEnvelope, FaMapMarkerAlt as FaMapPin,
  FaCheckCircle as FaCheckIcon, FaSpinner, FaBan, FaUndoAlt, FaExclamationTriangle,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import '/src/styles/dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const invoiceRef = useRef(null);

  // ✅ NEW: Cancel / Return state
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  // ============ LOAD USER ============
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (savedUser) setUser(savedUser);
    } catch {}
  }, [navigate]);

  // ============ FETCH REAL DATA ============
  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/auth/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch (err) { console.warn('Orders fetch failed:', err); }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const res = await fetch('/api/auth/profile', { headers });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch (err) { console.warn('Profile fetch failed:', err); }

      try {
        const res = await fetch('/api/auth/orders', { headers });
        const data = await res.json();
        if (data.success) setOrders(data.orders || []);
      } catch (err) { console.warn('Orders fetch failed:', err); }

      try {
        const res = await fetch('/api/auth/notifications', { headers });
        const data = await res.json();
        if (data.success) {
          const readIds = JSON.parse(localStorage.getItem('readNotifs') || '[]');
          const notifs = (data.notifications || []).map((n) => ({
            ...n,
            unread: n.unread && !readIds.includes(n.id),
          }));
          setNotifications(notifs);
        }
      } catch (err) { console.warn('Notifications fetch failed:', err); }

      try {
        const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlist(saved);
      } catch { setWishlist([]); }

      setLoading(false);
    };

    fetchAll();
  }, []);

  // ============ BODY SCROLL LOCK ============
  useEffect(() => {
    if (trackingOrder || invoiceOrder || cancelOrder || returnOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [trackingOrder, invoiceOrder, cancelOrder, returnOrder]);

  // ============ TRACKING ============
  useEffect(() => {
    if (!trackingOrder) {
      setTrackingData(null);
      return;
    }
    const fetchTracking = async () => {
      try {
        const res = await fetch(`/api/order/track/${trackingOrder.id}`);
        const data = await res.json();
        if (data.success) setTrackingData(data);
      } catch (err) { console.warn('Tracking fetch failed:', err); }
    };
    fetchTracking();
  }, [trackingOrder]);

  // ============ CANCEL ORDER ============
  const handleCancelOrder = async () => {
    if (!cancelOrder) return;
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }
    setCancelLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${cancelOrder.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order cancelled successfully ✅');
        setCancelOrder(null);
        setCancelReason('');
        await fetchOrders();
      } else {
        toast.error(data.message || 'Failed to cancel order');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  // ============ REQUEST RETURN ============
  const handleReturnRequest = async () => {
    if (!returnOrder) return;
    if (!returnReason.trim()) {
      toast.error('Please provide a return reason');
      return;
    }
    setReturnLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${returnOrder.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: returnReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Return request submitted! 📦 We will contact you soon.');
        setReturnOrder(null);
        setReturnReason('');
        await fetchOrders();
      } else {
        toast.error(data.message || 'Failed to submit return');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setReturnLoading(false);
    }
  };

  // ============ PDF DOWNLOAD ============
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) {
      toast.error('Invoice not loaded');
      return;
    }
    if (pdfGenerating) return;

    setPdfGenerating(true);
    const toastId = toast.loading('Generating PDF...');
    try {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `Invoice-${invoiceOrder.id || invoiceOrder.order_id || 'order'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2, useCORS: true, allowTaint: true,
          backgroundColor: '#ffffff', logging: false,
          windowWidth: invoiceRef.current.scrollWidth,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().set(opt).from(invoiceRef.current).save();
      toast.success('PDF downloaded! 📄', { id: toastId });
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('PDF generate nahi hui. Try again.', { id: toastId });
    } finally {
      setPdfGenerating(false);
    }
  };

  // ============ PRINT ============
  const handlePrint = async () => {
    if (!invoiceRef.current) return;
    if (pdfGenerating) return;

    setPdfGenerating(true);
    const toastId = toast.loading('Preparing print preview...');
    try {
      const opt = {
        margin: [8, 8, 8, 8],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2, useCORS: true, allowTaint: true,
          backgroundColor: '#ffffff', logging: false,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      const pdfBlob = await html2pdf().set(opt).from(invoiceRef.current).outputPdf('blob');
      const url = URL.createObjectURL(pdfBlob);
      const win = window.open(url, '_blank');
      if (win) {
        win.onload = () => {
          setTimeout(() => { try { win.print(); } catch {} }, 500);
        };
      }
      toast.success('Print preview opened', { id: toastId });
    } catch (err) {
      console.error('Print error:', err);
      toast.error('Print preview failed', { id: toastId });
    } finally {
      setPdfGenerating(false);
    }
  };

  // ============ HANDLERS ============
  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const removeFromWishlist = (id) => {
    const newWishlist = wishlist.filter((item) => item.id !== id);
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
    window.dispatchEvent(new Event('storage'));
    toast.success('Removed from wishlist');
  };

  const addToCart = (item) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((c) => c.id === item.id);
    if (existing) existing.quantity += 1;
    else cart.push({
      id: item.id, name: item.name, price: item.price,
      image: item.image, quantity: 1, variant: 'Standard',
    });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    toast.success('Added to cart! 🛒');
  };

  const markNotificationRead = (id) => {
    setNotifications(notifications.map((n) => n.id === id ? { ...n, unread: false } : n));
    const readIds = JSON.parse(localStorage.getItem('readNotifs') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('readNotifs', JSON.stringify(readIds));
    }
  };

  // ============ COMPUTED ============
  const unreadCount = notifications.filter((n) => n.unread).length;
  const totalSpent = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

  const getMonthlySpending = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthOrders = orders.filter((o) => {
        if (!o.date && !o.createdAt) return false;
        const od = new Date(o.date || o.createdAt);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });
      result.push({
        month: monthNames[d.getMonth()],
        value: monthOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0),
      });
    }
    return result;
  };

  const analyticsData = getMonthlySpending();
  const maxValue = Math.max(...analyticsData.map((d) => d.value), 1);

  const userAddresses = user && (user.address || user.city || user.pincode) ? [
    {
      id: 1, name: 'Primary',
      address: [user.address, user.city, user.pincode].filter(Boolean).join(', ') || 'Not set',
      phone: user.phone || 'Not set', default: true,
    },
  ] : [];

  const menuItems = [
    { key: 'orders', icon: <FaBox />, label: 'My Orders', badge: orderCount },
    { key: 'wishlist', icon: <FaHeart />, label: 'Wishlist', badge: wishlist.length },
    { key: 'notifications', icon: <FaBell />, label: 'Notifications', badge: unreadCount },
    { key: 'analytics', icon: <FaChartLine />, label: 'Analytics' },
    { key: 'addresses', icon: <FaMapMarkerAlt />, label: 'Addresses', badge: userAddresses.length },
    { key: 'profile', icon: <FaUser />, label: 'Profile' },
    { key: 'settings', icon: <FaCog />, label: 'Settings' },
  ];

  const getStatusClass = (status) => ({
    delivered: 'delivered', shipped: 'shipped', processing: 'processing',
    pending: 'processing', paid: 'shipped', cancelled: 'cancelled',
    return_requested: 'processing',
  }[status] || 'processing');

  const getStatusIcon = (status) => ({
    delivered: '✅', shipped: '🚚', processing: '⏳',
    pending: '⏳', paid: '💳', cancelled: '❌',
    return_requested: '↩️',
  }[status] || '⏳');

  const getNotifIcon = (type) => ({
    order: <FaBox />, offer: <FaGift />, system: <FaInfoCircle />, success: <FaCheckCircle />,
  }[type] || <FaInfoCircle />);

  // ✅ Can cancel? Only pending/paid
  const canCancel = (order) => ['pending', 'paid'].includes(order.status);
  // ✅ Can return? Only delivered, within 7 days
  const canReturn = (order) => {
    if (order.status !== 'delivered') return false;
    const d = new Date(order.date || order.createdAt);
    return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
  };

  // ============ LOADING / NOT AUTH ============
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FaSpinner className="fa-spin" style={{ fontSize: '40px', color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ color: '#fff' }}>Please login to view your dashboard</h2>
        <Link to="/login" className="dash-action-btn primary" style={{ display: 'inline-flex', marginTop: '20px' }}>
          <FaUser /> Login
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        {/* HEADER */}
        <div className="dash-header">
          <div className="dash-greeting">
            <h1>Welcome back, <span>{user?.username || 'User'}</span> 👋</h1>
            <p>Here's what's happening with your account today</p>
          </div>
          <div className="dash-header-actions">
            <Link to="/products" className="dash-action-btn primary"><FaShoppingBag /> Shop Now</Link>
            <button className="dash-action-btn secondary" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
          </div>
        </div>

        {/* STATS */}
        <div className="dash-stats">
          <div className="stat-card" onClick={() => setActiveTab('orders')}>
            <div className="stat-icon orders"><FaBox /></div>
            <div className="stat-info">
              <span className="stat-value">{orderCount}</span>
              <span className="stat-label">Total Orders</span>
            </div>
            <FaArrowRight className="stat-arrow" />
          </div>
          <div className="stat-card" onClick={() => setActiveTab('wishlist')}>
            <div className="stat-icon wishlist"><FaHeart /></div>
            <div className="stat-info">
              <span className="stat-value">{wishlist.length}</span>
              <span className="stat-label">Wishlist Items</span>
            </div>
            <FaArrowRight className="stat-arrow" />
          </div>
          <div className="stat-card" onClick={() => setActiveTab('notifications')}>
            <div className="stat-icon points"><FaBell /></div>
            <div className="stat-info">
              <span className="stat-value">{unreadCount}</span>
              <span className="stat-label">Unread Notifications</span>
            </div>
            <FaArrowRight className="stat-arrow" />
          </div>
          <div className="stat-card" onClick={() => setActiveTab('analytics')}>
            <div className="stat-icon addresses"><FaRupeeSign /></div>
            <div className="stat-info">
              <span className="stat-value">₹{totalSpent.toFixed(0)}</span>
              <span className="stat-label">Total Spent</span>
            </div>
            <FaArrowRight className="stat-arrow" />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="dash-grid">
          <aside className="dash-sidebar">
            <nav className="sidebar-menu">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  className={`sidebar-link ${activeTab === item.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.key)}
                >
                  {item.icon}
                  {item.label}
                  {item.badge > 0 && <span className="tab-badge">{item.badge}</span>}
                </button>
              ))}
              <div className="sidebar-divider"></div>
              <button className="sidebar-link logout" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </nav>
          </aside>

          <main className="dash-content">
            {/* ===== ORDERS ===== */}
            {activeTab === 'orders' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">My <span>Orders</span></h2>
                    <p className="content-subtitle">Track and manage your orders</p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3>No orders yet</h3>
                    <p>You haven't placed any orders yet. Start shopping now!</p>
                    <Link to="/products"><FaShoppingBag /> Shop Now</Link>
                  </div>
                ) : (
                  <div className="orders-list">
                    {orders.map((order) => (
                      <div className="order-card" key={order.id || order._id}>
                        <div className="order-header-row">
                          <div>
                            <div className="order-id">{order.id || order.order_id}</div>
                            <div className="order-date">
                              Placed on {new Date(order.date || order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div className={`order-status ${getStatusClass(order.status)}`}>
                            {getStatusIcon(order.status)} {order.status?.replace('_', ' ')}
                          </div>
                        </div>

                        <div className="order-items">
                          {(order.items || []).map((item, idx) => (
                            <div className="order-item-row" key={idx}>
                              <div className="order-item-img">
                                <img
                                  src={item.image || '/product1.jpeg'}
                                  alt={item.name}
                                  onError={(e) => (e.target.src = '/product1.jpeg')}
                                />
                              </div>
                              <div className="order-item-info">
                                <div className="order-item-name">{item.name}</div>
                                <div className="order-item-qty">Qty: {item.quantity || item.qty || 1}</div>
                              </div>
                              <div className="order-item-price">₹{item.price}</div>
                            </div>
                          ))}
                        </div>

                        {/* ✅ Cancellation reason banner */}
                        {order.status === 'cancelled' && order.cancellation_reason && (
                          <div className="order-reason-banner cancelled">
                            <FaBan /> <strong>Cancelled:</strong> {order.cancellation_reason}
                          </div>
                        )}

                        {order.status === 'return_requested' && order.cancellation_reason && (
                          <div className="order-reason-banner return">
                            <FaUndoAlt /> <strong>Return Requested:</strong> {order.cancellation_reason}
                          </div>
                        )}

                        <div className="order-footer">
                          <div className="order-total">
                            Total: <strong>₹{(parseFloat(order.total) || 0).toFixed(2)}</strong>
                          </div>
                          <div className="order-buttons">
                            <button className="order-btn" onClick={() => setTrackingOrder(order)}>
                              <FaTruck /> Track
                            </button>

                            <button className="order-btn invoice" onClick={() => setInvoiceOrder(order)}>
                              <FaFileInvoiceDollar /> Invoice
                            </button>

                            {/* ✅ Cancel button */}
                            {canCancel(order) && (
                              <button
                                className="order-btn cancel-btn"
                                onClick={() => {
                                  setCancelOrder(order);
                                  setCancelReason('');
                                }}
                              >
                                <FaBan /> Cancel
                              </button>
                            )}

                            {/* ✅ Return button */}
                            {canReturn(order) && (
                              <button
                                className="order-btn return-btn"
                                onClick={() => {
                                  setReturnOrder(order);
                                  setReturnReason('');
                                }}
                              >
                                <FaUndoAlt /> Return
                              </button>
                            )}

                            {order.status === 'delivered' && !canReturn(order) && (
                              <span className="return-expired" title="Return window (7 days) expired">
                                Return expired
                              </span>
                            )}

                            <button className="order-btn primary" onClick={() => navigate('/products')}>
                              <FaRedo /> Buy Again
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ===== WISHLIST ===== */}
            {activeTab === 'wishlist' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">My <span>Wishlist</span></h2>
                    <p className="content-subtitle">Your favorite products</p>
                  </div>
                  <Link to="/products" className="content-action"><FaPlus /> Add More</Link>
                </div>

                {wishlist.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">💔</div>
                    <h3>Your wishlist is empty</h3>
                    <p>Save your favorite products to buy them later.</p>
                    <Link to="/products"><FaShoppingBag /> Browse Products</Link>
                  </div>
                ) : (
                  <div className="wishlist-grid">
                    {wishlist.map((item) => (
                      <div className="wishlist-card" key={item.id}>
                        <div className="wishlist-img-wrap">
                          <img
                            src={item.image || '/product1.jpeg'}
                            alt={item.name}
                            onError={(e) => (e.target.src = '/product1.jpeg')}
                          />
                          <button className="wishlist-remove" onClick={() => removeFromWishlist(item.id)}>
                            <FaTrash />
                          </button>
                        </div>
                        <div className="wishlist-info">
                          <div className="wishlist-name">{item.name}</div>
                          <div className="wishlist-price">₹{item.price}</div>
                          <div className="wishlist-actions">
                            <button className="wishlist-btn add" onClick={() => addToCart(item)}>
                              <FaShoppingCart /> Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ===== NOTIFICATIONS ===== */}
            {activeTab === 'notifications' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">My <span>Notifications</span></h2>
                    <p className="content-subtitle">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔔</div>
                    <h3>No notifications</h3>
                    <p>You're all caught up! New updates will appear here.</p>
                  </div>
                ) : (
                  <div className="notifications-list">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notification-item ${n.unread ? 'unread' : ''}`}
                        onClick={() => markNotificationRead(n.id)}
                      >
                        <div className={`notification-icon ${n.type}`}>{getNotifIcon(n.type)}</div>
                        <div className="notification-content">
                          <div className="notification-title">{n.title}</div>
                          <div className="notification-message">{n.message}</div>
                          <div className="notification-time">{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ===== ANALYTICS ===== */}
            {activeTab === 'analytics' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">My <span>Analytics</span></h2>
                    <p className="content-subtitle">Your shopping insights</p>
                  </div>
                </div>

                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-card-header">
                      <span className="analytics-card-title">Total Spent</span>
                      <FaRupeeSign className="analytics-card-icon" />
                    </div>
                    <div className="analytics-value">₹{totalSpent.toLocaleString()}</div>
                    <div className="analytics-change up">
                      <FaArrowUp /> Based on {orderCount} order{orderCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="analytics-card">
                    <div className="analytics-card-header">
                      <span className="analytics-card-title">Total Orders</span>
                      <FaBox className="analytics-card-icon" />
                    </div>
                    <div className="analytics-value">{orderCount}</div>
                    <div className="analytics-change up"><FaArrowUp /> Lifetime</div>
                  </div>

                  <div className="analytics-card">
                    <div className="analytics-card-header">
                      <span className="analytics-card-title">Avg. Order Value</span>
                      <FaChartLine className="analytics-card-icon" />
                    </div>
                    <div className="analytics-value">₹{avgOrderValue.toLocaleString()}</div>
                    <div className="analytics-change up">Per order average</div>
                  </div>

                  <div className="analytics-card">
                    <div className="analytics-card-header">
                      <span className="analytics-card-title">Wishlist Items</span>
                      <FaStar className="analytics-card-icon" />
                    </div>
                    <div className="analytics-value">{wishlist.length}</div>
                    <div className="analytics-change up">Saved products</div>
                  </div>

                  <div className="analytics-chart">
                    <div className="chart-header">
                      <h3 className="chart-title">📊 Monthly Spending (Last 6 Months)</h3>
                    </div>
                    <div className="chart-bars">
                      {analyticsData.map((d) => (
                        <div key={d.month} className="chart-bar-wrap">
                          <div
                            className="chart-bar"
                            style={{ height: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%` }}
                            data-value={`₹${d.value}`}
                          ></div>
                          <span className="chart-label">{d.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ===== ADDRESSES ===== */}
            {activeTab === 'addresses' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">My <span>Addresses</span></h2>
                    <p className="content-subtitle">Manage your delivery addresses</p>
                  </div>
                </div>

                {userAddresses.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📍</div>
                    <h3>No address saved</h3>
                    <p>Update your profile to add a delivery address.</p>
                    <button onClick={() => setActiveTab('profile')} className="content-action">
                      <FaUser /> Go to Profile
                    </button>
                  </div>
                ) : (
                  <div className="orders-list">
                    {userAddresses.map((addr) => (
                      <div className={`address-card ${addr.default ? 'default' : ''}`} key={addr.id}>
                        {addr.default && <span className="default-badge">Default</span>}
                        <h4>{addr.name}</h4>
                        <p>{addr.address}</p>
                        <p style={{ marginTop: '6px', color: 'var(--primary)', fontWeight: '600' }}>
                          {addr.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ===== PROFILE ===== */}
            {activeTab === 'profile' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">My <span>Profile</span></h2>
                    <p className="content-subtitle">Your account information</p>
                  </div>
                </div>

                <div className="profile-info-card">
                  <div className="profile-field">
                    <span className="profile-field-label">Full Name</span>
                    <span className="profile-field-value">{user?.username || 'Guest User'}</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Email</span>
                    <span className="profile-field-value">{user?.email || 'Not set'}</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Phone</span>
                    <span className="profile-field-value">{user?.phone || 'Not set'}</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Address</span>
                    <span className="profile-field-value">{user?.address || 'Not set'}</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">City</span>
                    <span className="profile-field-value">{user?.city || 'Not set'}</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Pincode</span>
                    <span className="profile-field-value">{user?.pincode || 'Not set'}</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Account Status</span>
                    <span className="profile-field-value" style={{ color: '#22c55e' }}>✅ Active</span>
                  </div>
                </div>
              </>
            )}

            {/* ===== SETTINGS ===== */}
            {activeTab === 'settings' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title"><span>Settings</span></h2>
                    <p className="content-subtitle">Manage your preferences</p>
                  </div>
                </div>

                <div className="profile-info-card">
                  <div className="profile-field">
                    <span className="profile-field-label">Email Notifications</span>
                    <span className="profile-field-value" style={{ color: '#22c55e' }}>✅ Enabled</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">SMS Alerts</span>
                    <span className="profile-field-value" style={{ color: '#22c55e' }}>✅ Enabled</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Language</span>
                    <span className="profile-field-value">English (India)</span>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {/* ===== ORDER TRACKING MODAL ===== */}
      {trackingOrder && (
        <div className="tracking-modal-overlay" onClick={() => setTrackingOrder(null)}>
          <div className="tracking-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tracking-modal-header">
              <div>
                <h2><FaTruck style={{ color: 'var(--primary)' }} /> Track Your Order</h2>
                <p>Live updates on your delivery</p>
              </div>
              <button
                className="return-modal-close"
                onClick={() => setTrackingOrder(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', width: '36px', height: '36px', borderRadius: '50%',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="tracking-summary">
              <div className="tracking-summary-item">
                <span className="tracking-summary-label">Order ID</span>
                <span className="tracking-summary-value">{trackingOrder.id}</span>
              </div>
              <div className="tracking-summary-item">
                <span className="tracking-summary-label">Order Date</span>
                <span className="tracking-summary-value">
                  {new Date(trackingOrder.date || trackingOrder.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="tracking-summary-item">
                <span className="tracking-summary-label">Total</span>
                <span className="tracking-summary-value" style={{ color: 'var(--primary)' }}>
                  ₹{(parseFloat(trackingOrder.total) || 0).toFixed(2)}
                </span>
              </div>
              <div className="tracking-summary-item">
                <span className="tracking-summary-label">Status</span>
                <span className="tracking-summary-value" style={{ textTransform: 'capitalize' }}>
                  {getStatusIcon(trackingOrder.status)} {trackingOrder.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {trackingData ? (
              <div className="tracking-timeline">
                {trackingData.timeline.map((step, idx) => (
                  <div key={idx} className={`tracking-step ${step.completed ? 'completed' : ''}`}>
                    <div className="step-dot">
                      {step.completed ? <FaCheckCircle /> : <FaBoxOpen />}
                    </div>
                    <div className="tracking-step-info">
                      <h4>{step.status}</h4>
                      <p>{step.description}</p>
                      {step.time && <span className="step-time">{new Date(step.time).toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <FaSpinner className="fa-spin" style={{ fontSize: '24px', color: 'var(--primary)' }} />
                <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Loading tracking info...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CANCEL ORDER MODAL ===== */}
      {cancelOrder && (
        <div className="confirm-modal-overlay" onClick={() => !cancelLoading && setCancelOrder(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon danger">
              <FaExclamationTriangle />
            </div>
            <h2>Cancel Order?</h2>
            <p className="confirm-modal-order-id">{cancelOrder.id}</p>
            <p className="confirm-modal-text">
              Are you sure you want to cancel this order? This action cannot be undone.
              The amount will be refunded within 5-7 business days.
            </p>

            <label className="confirm-modal-label">
              Reason for cancellation <span className="required">*</span>
            </label>
            <select
              className="confirm-modal-select"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={cancelLoading}
            >
              <option value="">Select a reason...</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Found a better price elsewhere">Found a better price elsewhere</option>
              <option value="Changed my mind">Changed my mind</option>
              <option value="Delivery taking too long">Delivery taking too long</option>
              <option value="Product no longer needed">Product no longer needed</option>
              <option value="Other reason">Other reason</option>
            </select>

            <div className="confirm-modal-actions">
              <button
                className="confirm-btn secondary"
                onClick={() => setCancelOrder(null)}
                disabled={cancelLoading}
              >
                Keep Order
              </button>
              <button
                className="confirm-btn danger"
                onClick={handleCancelOrder}
                disabled={cancelLoading || !cancelReason}
              >
                {cancelLoading ? <><FaSpinner className="fa-spin" /> Cancelling...</> : <><FaBan /> Yes, Cancel</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RETURN REQUEST MODAL ===== */}
      {returnOrder && (
        <div className="confirm-modal-overlay" onClick={() => !returnLoading && setReturnOrder(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon warning">
              <FaUndoAlt />
            </div>
            <h2>Request Return?</h2>
            <p className="confirm-modal-order-id">{returnOrder.id}</p>
            <p className="confirm-modal-text">
              Request a return for this order. Our team will review and contact you within 24 hours.
              Refund will be processed after pickup.
            </p>

            <label className="confirm-modal-label">
              Reason for return <span className="required">*</span>
            </label>
            <select
              className="confirm-modal-select"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              disabled={returnLoading}
            >
              <option value="">Select a reason...</option>
              <option value="Damaged product">Damaged product</option>
              <option value="Wrong product delivered">Wrong product delivered</option>
              <option value="Product not as described">Product not as described</option>
              <option value="Quality issue">Quality issue</option>
              <option value="Missing items">Missing items</option>
              <option value="Other reason">Other reason</option>
            </select>

            <div className="confirm-modal-actions">
              <button
                className="confirm-btn secondary"
                onClick={() => setReturnOrder(null)}
                disabled={returnLoading}
              >
                Cancel
              </button>
              <button
                className="confirm-btn warning"
                onClick={handleReturnRequest}
                disabled={returnLoading || !returnReason}
              >
                {returnLoading ? <><FaSpinner className="fa-spin" /> Submitting...</> : <><FaUndoAlt /> Submit Return</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== INVOICE MODAL ===== */}
      {invoiceOrder && (
        <div className="invoice-modal-overlay" onClick={() => setInvoiceOrder(null)}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-actions">
              <div className="invoice-actions-left">
                <button
                  className="invoice-btn download"
                  onClick={handleDownloadPDF}
                  disabled={pdfGenerating}
                  style={{ opacity: pdfGenerating ? 0.6 : 1, cursor: pdfGenerating ? 'wait' : 'pointer' }}
                >
                  {pdfGenerating ? (<><FaSpinner className="fa-spin" /> Generating...</>) : (<><FaDownload /> Download PDF</>)}
                </button>
                <button
                  className="invoice-btn print"
                  onClick={handlePrint}
                  disabled={pdfGenerating}
                  style={{ opacity: pdfGenerating ? 0.6 : 1, cursor: pdfGenerating ? 'wait' : 'pointer' }}
                >
                  <FaPrint /> Print
                </button>
              </div>
              <button className="invoice-btn close" onClick={() => setInvoiceOrder(null)}>
                <FaTimes />
              </button>
            </div>

            <div className="invoice-content" ref={invoiceRef}>
              <div className="invoice-header">
                <div className="invoice-brand">
                  <img src="/logo.jpeg" alt="PRADH" onError={(e) => (e.target.style.display = 'none')} />
                  <div className="invoice-brand-text">
                    <div className="brand-name">PRADH<span>.</span></div>
                    <div className="brand-tagline">Desi Fuel</div>
                    <div className="brand-address">
                      Uttar Pradesh, India<br />
                      pradhfoods@gmail.com
                    </div>
                  </div>
                </div>

                <div className="invoice-meta">
                  <div className="invoice-title">INVOICE</div>
                  <span className="invoice-status-badge paid">✓ {invoiceOrder.status?.toUpperCase() || 'PAID'}</span>
                  <div className="invoice-meta-info">
                    <strong>Invoice #:</strong> INV-{invoiceOrder.id}<br />
                    <strong>Order Date:</strong> {new Date(invoiceOrder.date || invoiceOrder.createdAt).toLocaleDateString('en-IN')}<br />
                    <strong>Invoice Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="invoice-billing">
                <div className="billing-block">
                  <h4>Bill To</h4>
                  <div className="billing-name">{user?.username || 'Customer'}</div>
                  <div className="billing-detail">
                    {user?.email || 'N/A'}<br />
                    {user?.phone || 'N/A'}<br />
                    {user?.address || ''} {user?.city || ''} {user?.pincode || ''}
                  </div>
                </div>

                <div className="billing-block">
                  <h4>Ship To</h4>
                  <div className="billing-name">{invoiceOrder.customer?.name || user?.username || 'Customer'}</div>
                  <div className="billing-detail">
                    {invoiceOrder.customer?.address || user?.address || 'N/A'}<br />
                    {invoiceOrder.customer?.city || user?.city || ''} {invoiceOrder.customer?.pincode || user?.pincode || ''}<br />
                    Status: <strong style={{ textTransform: 'capitalize' }}>{invoiceOrder.status}</strong>
                  </div>
                </div>
              </div>

              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th className="center">Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoiceOrder.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td><span className="item-name">{item.name}</span></td>
                      <td className="center">{item.quantity || item.qty || 1}</td>
                      <td>₹{item.price}</td>
                      <td>₹{item.price * (item.quantity || item.qty || 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-totals">
                <div className="totals-box">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span>₹{((invoiceOrder.total || 0) - (invoiceOrder.deliveryCharge || 0) + (invoiceOrder.discount || 0)).toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>Delivery</span>
                    <span style={{ color: invoiceOrder.deliveryCharge === 0 ? '#22c55e' : '#fff', fontWeight: '700' }}>
                      {invoiceOrder.deliveryCharge === 0 ? 'FREE' : `₹${(invoiceOrder.deliveryCharge || 0).toFixed(2)}`}
                    </span>
                  </div>
                  {invoiceOrder.discount > 0 && (
                    <div className="total-row">
                      <span>Discount {invoiceOrder.coupon ? `(${invoiceOrder.coupon})` : ''}</span>
                      <span style={{ color: '#22c55e', fontWeight: '700' }}>-₹{(invoiceOrder.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="total-row grand">
                    <span>Grand Total</span>
                    <span className="amount">₹{(parseFloat(invoiceOrder.total) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="invoice-payment-method">
                <div className="payment-icon"><FaCreditCard /></div>
                <div className="payment-details">
                  <div className="payment-method-label">Payment Method</div>
                  <div className="payment-method-value">{invoiceOrder.customer?.paymentMethod || invoiceOrder.paymentMethod || 'Cash on Delivery'}</div>
                </div>
                <FaCheckIcon style={{ color: '#22c55e', fontSize: '24px' }} />
              </div>

              <div className="invoice-footer">
                <div className="thank-you">Thank You for Your Order! 🙏</div>
                <div className="footer-message">
                  For any queries, feel free to contact us. We're always here to help!
                </div>
                <div className="footer-contact">
                  <span><FaPhone /> +91 89799 93655</span>
                  <span><FaEnvelope /> pradhfoods@gmail.com</span>
                  <span><FaMapPin /> Uttar Pradesh, India</span>
                </div>
                <div className="generated-note">
                  This is a computer-generated invoice. No signature required.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;