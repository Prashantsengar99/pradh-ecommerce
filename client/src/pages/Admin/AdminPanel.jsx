import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  FaChartPie, FaBox, FaShoppingBag, FaTicketAlt, FaStar, FaUsers,
  FaSignOutAlt, FaSync, FaPlus, FaEye, FaEdit, FaTrash, FaSave,
  FaTruck, FaReceipt, FaRupeeSign, FaBars,
  FaArrowUp, FaArrowDown, FaClock, FaExclamationTriangle, FaBell,
  FaChartLine, FaShoppingCart, FaBoxOpen, FaUndoAlt, FaCheck, FaBan, FaWhatsapp,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../../styles/admin.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [deliveryCharge, setDeliveryCharge] = useState(49);
  const [freeThreshold, setFreeThreshold] = useState(999);
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [productModal, setProductModal] = useState(false);
  const [couponModal, setCouponModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('weekly');
  const [productForm, setProductForm] = useState({
    id: '', name: '', price: '', stock: '', maxPurchase: '', category: '', description: '', image: '',
  });
  const [couponForm, setCouponForm] = useState({ code: '', discount: '', expiry: '' });

  useEffect(() => {
    if (!localStorage.getItem('adminLoggedIn')) {
      navigate('/admin');
      return;
    }
    loadDashboard();
    loadProducts();
    loadOrders();
    loadCoupons();
    loadReviews();
    loadReturns();
    loadCustomers();
    loadDeliverySettings();
  }, [navigate]);

  const loadDashboard = async () => {
    try {
      const [prodRes, orderRes, reviewRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/get-orders'),
        fetch('/api/reviews'),
      ]);
      const prodData = await prodRes.json();
      if (prodData.success) setProducts(prodData.products || []);
      const orderData = await orderRes.json();
      if (orderData.success) setOrders(orderData.orders || []);
      const reviewData = await reviewRes.json();
      if (reviewData.success) setReviews(reviewData.reviews || []);
    } catch (err) { console.error(err); }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } catch (err) { console.error(err); }
  };

  const loadOrders = async () => {
    try {
      const res = await fetch('/get-orders');
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch (err) { console.error(err); }
  };

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      if (data.success) setCoupons(data.coupons || []);
    } catch (err) { console.error(err); }
  };

  const loadReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      if (data.success) setReviews(data.reviews || []);
    } catch (err) { console.error(err); }
  };

  const loadReturns = async () => {
  try {
    const res = await fetch('/api/return-requests');
    const data = await res.json();
    if (data.success) setReturnRequests(data.requests || []);
  } catch (err) { console.error(err); }
};

  const loadCustomers = async () => {
    try {
      const res = await fetch('/get-orders');
      const data = await res.json();
      if (data.success && data.orders) {
        const map = new Map();
        data.orders.forEach((o) => {
          if (o.customer?.phone) {
            if (!map.has(o.customer.phone)) {
              map.set(o.customer.phone, {
                name: o.customer.name || 'Guest',
                email: o.customer.email || 'N/A',
                phone: o.customer.phone,
                orders: 0,
                totalSpent: 0,
              });
            }
            const c = map.get(o.customer.phone);
            c.orders += 1;
            c.totalSpent += parseFloat(o.total) || 0;
          }
        });
        setCustomers(Array.from(map.values()));
      }
    } catch (err) { console.error(err); }
  };

  const loadDeliverySettings = async () => {
    try {
      const res = await fetch('/api/delivery-charge');
      const data = await res.json();
      if (data.success) {
        setDeliveryCharge(data.deliveryCharge || 49);
        setFreeThreshold(data.freeDeliveryThreshold || 999);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) { console.error(err); }
  };

  const navigateTo = (key) => {
    setSection(key);
    setSidebarOpen(false);
    if (key === 'products') loadProducts();
    if (key === 'orders') loadOrders();
    if (key === 'coupons') loadCoupons();
    if (key === 'reviews') loadReviews();
    if (key === 'customers') loadCustomers();
    if (key === 'returns') loadReturns();
    if (key === 'dashboard') loadDashboard();
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin');
  };

  // PRODUCTS
  const openAddProduct = () => {
    setProductForm({ id: '', name: '', price: '', stock: '', maxPurchase: '', category: '', description: '', image: '' });
    setProductModal(true);
  };

  const openEditProduct = (p) => {
    setProductForm({
      id: p.id,
      name: p.name || '',
      price: p.price || '',
      stock: p.stock || 0,
      maxPurchase: p.maxPurchasePerUser || 0,
      category: p.category || '',
      description: p.description || '',
      image: p.image || '',
    });
    setProductModal(true);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const isEdit = !!productForm.id;
    const url = isEdit ? `/api/admin/products/${productForm.id}` : '/api/admin/products';
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name.trim(),
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock) || 0,
          maxPurchasePerUser: parseInt(productForm.maxPurchase) || 0,
          category: productForm.category.trim(),
          description: productForm.description.trim(),
          image: productForm.image.trim() || 'product.jpeg',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? 'Product updated!' : 'Product added!');
        setProductModal(false);
        loadProducts();
        loadDashboard();
      }
    } catch (err) { toast.error('Error'); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Product deleted!');
        loadProducts();
        loadDashboard();
      }
    } catch (err) { toast.error('Error'); }
  };

  // ORDERS
  const updateOrderStatus = async (orderId, status) => {
    if (!window.confirm(`Update order status to "${status}"?`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Status updated!');
        loadOrders();
        loadDashboard();
      }
    } catch (err) { toast.error('Error'); }
  };

  // COUPONS
  const saveCoupon = async (e) => {
    e.preventDefault();
    const code = couponForm.code.trim().toUpperCase();
    const discount = couponForm.discount.trim();
    if (!code || !discount) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discount: parseInt(discount), expiry: couponForm.expiry }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Coupon created!');
        setCouponModal(false);
        setCouponForm({ code: '', discount: '', expiry: '' });
        loadCoupons();
        loadDashboard();
      }
    } catch (err) { toast.error('Error'); }
  };

  const deleteCoupon = async (code) => {
    if (!window.confirm(`Delete coupon "${code}"?`)) return;
    try {
      const res = await fetch(`/api/coupons/${code}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Coupon deleted!');
        loadCoupons();
        loadDashboard();
      }
    } catch (err) { toast.error('Error'); }
  };

  // REVIEWS
  const updateReviewStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this review?`)) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Review ${status}!`);
        loadReviews();
      }
    } catch (err) { toast.error('Error'); }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Review deleted!');
        loadReviews();
      }
    } catch (err) { toast.error('Error'); }
  };


  // RETURNS
const updateReturnStatus = async (id, status) => {
  if (!window.confirm(`Mark this request as "${status}"?`)) return;
  try {
    const res = await fetch(`/api/return-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`Request ${status}!`);
      loadReturns();
    }
  } catch (err) { toast.error('Error'); }
};

const deleteReturn = async (id) => {
  if (!window.confirm('Delete this request?')) return;
  try {
    const res = await fetch(`/api/return-requests/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast.success('Request deleted!');
      loadReturns();
    }
  } catch (err) { toast.error('Error'); }
};

  // DELIVERY
  const updateDeliveryCharge = async () => {
    const charge = parseFloat(deliveryCharge);
    if (isNaN(charge) || charge < 0) {
      toast.error('Invalid delivery charge');
      return;
    }
    if (!window.confirm(`Set delivery charge to ₹${charge}?`)) return;
    try {
      const res = await fetch('/api/delivery-charge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charge, freeThreshold }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Delivery charge updated to ₹${charge}`);
        loadDeliverySettings();
      }
    } catch (err) { toast.error('Error'); }
  };

  const updateFreeThreshold = async () => {
    const threshold = parseFloat(freeThreshold);
    if (isNaN(threshold) || threshold < 0) {
      toast.error('Invalid threshold');
      return;
    }
    if (!window.confirm(`Set free delivery for orders above ₹${threshold}?`)) return;
    try {
      const res = await fetch('/api/delivery-charge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charge: deliveryCharge, freeThreshold: threshold }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Free delivery above ₹${threshold}`);
        loadDeliverySettings();
      }
    } catch (err) { toast.error('Error'); }
  };

  // ============================================
  // CHART DATA HELPERS
  // ============================================
  const getWeeklySalesData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    return days.map((day, i) => {
      const dayOrders = orders.filter((o) => {
        if (!o.date) return false;
        const orderDate = new Date(o.date);
        const diffDays = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
        return diffDays === (6 - i);
      });
      return {
        day,
        sales: dayOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0),
      };
    });
  };

  const getMonthlySalesData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthOrders = orders.filter((o) => {
        if (!o.date) return false;
        const od = new Date(o.date);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });
      data.push({
        month: monthNames[d.getMonth()],
        sales: monthOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0),
      });
    }
    return data;
  };

  const getDailySalesData = () => {
    const today = new Date();
    const data = [];
    for (let i = 29; i >= 0; i -= 5) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      const dayEnd = new Date(today);
      dayEnd.setDate(today.getDate() - i + 4);

      const rangeOrders = orders.filter((o) => {
        if (!o.date) return false;
        const d = new Date(o.date);
        return d >= dayStart && d <= dayEnd;
      });

      data.push({
        day: dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        sales: rangeOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0),
      });
    }
    return data;
  };

  const getOrderStatusData = () => {
    const statusCount = { pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orders.forEach((o) => {
      if (statusCount[o.status] !== undefined) statusCount[o.status]++;
    });
    return Object.entries(statusCount)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  };

  const getTopProducts = () => {
    const productMap = new Map();
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const id = item.id || item.name;
        if (!productMap.has(id)) {
          productMap.set(id, {
            name: item.name,
            image: products.find((p) => p.id === item.id)?.image,
            qty: 0,
            revenue: 0,
          });
        }
        const p = productMap.get(id);
        p.qty += item.quantity || 1;
        p.revenue += (item.price || 0) * (item.quantity || 1);
      });
    });
    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  };

  const getTopCustomers = () => {
    const customerMap = new Map();
    orders.forEach((o) => {
      const phone = o.customer?.phone;
      if (!phone) return;
      if (!customerMap.has(phone)) {
        customerMap.set(phone, { name: o.customer.name || 'Guest', phone, orders: 0, spent: 0 });
      }
      const c = customerMap.get(phone);
      c.orders += 1;
      c.spent += parseFloat(o.total) || 0;
    });
    return Array.from(customerMap.values()).sort((a, b) => b.spent - a.spent).slice(0, 5);
  };

  const getLowStockProducts = () => {
    return products
      .filter((p) => (p.stock || 0) <= 10 && (p.stock || 0) >= 0)
      .sort((a, b) => (a.stock || 0) - (b.stock || 0))
      .slice(0, 5);
  };

  const getRecentActivity = () => {
    return orders.slice(-5).reverse().map((o) => ({
      text: `New order from ${o.customer?.name || 'Guest'}`,
      amount: o.total,
      time: o.date ? new Date(o.date).toLocaleString() : 'Just now',
    }));
  };

  // COMPUTED
  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const uniqueCustomers = new Set(orders.map(o => o.customer?.phone).filter(Boolean)).size;
  const pendingReviews = reviews.filter(r => r.status === 'pending').length;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;

  const thisMonthOrders = orders.filter((o) => {
    if (!o.date) return false;
    const d = new Date(o.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const lastMonthOrders = orders.filter((o) => {
    if (!o.date) return false;
    const d = new Date(o.date);
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
  });
  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const revenueChange = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
    : 0;

  const salesChartData = chartPeriod === 'weekly' ? getWeeklySalesData()
    : chartPeriod === 'monthly' ? getMonthlySalesData()
    : getDailySalesData();

  const lowStockProducts = getLowStockProducts();
  const topProducts = getTopProducts();
  const topCustomers = getTopCustomers();
  const orderStatusData = getOrderStatusData();
  const recentActivity = getRecentActivity();
  const COLORS = ['#facc15', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444'];

  const menuItems = [
    { key: 'dashboard', icon: <FaChartPie />, label: 'Dashboard' },
    { key: 'products', icon: <FaBox />, label: 'Products', badge: products.length },
    { key: 'orders', icon: <FaShoppingBag />, label: 'Orders', badge: orders.length },
    { key: 'coupons', icon: <FaTicketAlt />, label: 'Coupons' },
    { key: 'reviews', icon: <FaStar />, label: 'Reviews', badge: pendingReviews },
    { key: 'returns', icon: <FaUndoAlt />, label: 'Returns', badge: returnRequests.filter(r => r.status === 'pending').length },
    { key: 'customers', icon: <FaUsers />, label: 'Customers', badge: customers.length },
  ];

  return (
    <div className="admin-body">
      <div className="admin-wrapper">
        {/* SIDEBAR */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand">
            <img src="/logo.jpeg" alt="PRADH" onError={(e) => (e.target.style.display = 'none')} />
            <div>
              <h2>PRADH</h2>
              <span>Admin Panel</span>
            </div>
          </div>
          <nav>
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${section === item.key ? 'active' : ''}`}
                onClick={() => navigateTo(item.key)}
              >
                {item.icon}
                {item.label}
                {item.badge > 0 && <span className="badge">{item.badge}</span>}
              </button>
            ))}
            <button
              className="nav-item"
              onClick={handleLogout}
              style={{ marginTop: '20px', borderTop: '1px solid #334155', paddingTop: '16px', color: '#ef4444' }}
            >
              <FaSignOutAlt /> Logout
            </button>
          </nav>
        </aside>

        {/* MAIN */}
        <main className="main-content">
          <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FaBars />
          </button>

          {/* ===== DASHBOARD ===== */}
          {section === 'dashboard' && (
            <div className="page-section">
              {/* HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>📊 Dashboard</h1>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Welcome back! Here's your business overview</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {pendingOrders > 0 && (
                    <span className="pending-badge">
                      <FaBell /> {pendingOrders} Pending
                    </span>
                  )}
                  <button className="btn-primary" onClick={() => { loadDashboard(); loadProducts(); loadOrders(); }}>
                    <FaSync /> Refresh
                  </button>
                </div>
              </div>

              {/* STAT CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card-enhanced">
                  <div className="stat-card-top">
                    <div className="stat-icon-box yellow"><FaBox /></div>
                  </div>
                  <div className="stat-value-enhanced">{products.length}</div>
                  <div className="stat-label-enhanced">Total Products</div>
                  <div className="stat-trend up"><FaArrowUp /> Active</div>
                </div>
                <div className="stat-card-enhanced">
                  <div className="stat-card-top">
                    <div className="stat-icon-box blue"><FaShoppingCart /></div>
                  </div>
                  <div className="stat-value-enhanced">{orders.length}</div>
                  <div className="stat-label-enhanced">Total Orders</div>
                  <div className="stat-trend up"><FaArrowUp /> {thisMonthOrders.length} this month</div>
                </div>
                <div className="stat-card-enhanced">
                  <div className="stat-card-top">
                    <div className="stat-icon-box green"><FaRupeeSign /></div>
                  </div>
                  <div className="stat-value-enhanced">₹{totalRevenue.toFixed(0)}</div>
                  <div className="stat-label-enhanced">Total Revenue</div>
                  <div className={`stat-trend ${revenueChange >= 0 ? 'up' : 'down'}`}>
                    {revenueChange >= 0 ? <FaArrowUp /> : <FaArrowDown />} {Math.abs(revenueChange)}% vs last month
                  </div>
                </div>
                <div className="stat-card-enhanced">
                  <div className="stat-card-top">
                    <div className="stat-icon-box purple"><FaUsers /></div>
                  </div>
                  <div className="stat-value-enhanced">{uniqueCustomers}</div>
                  <div className="stat-label-enhanced">Total Customers</div>
                  <div className="stat-trend neutral">All time</div>
                </div>
              </div>

              {/* CHARTS ROW */}
              <div className="dashboard-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <div className="chart-title"><FaChartLine className="chart-title-icon" /> Sales Overview</div>
                    <div className="chart-controls">
                      <button className={`chart-btn ${chartPeriod === 'weekly' ? 'active' : ''}`} onClick={() => setChartPeriod('weekly')}>Week</button>
                      <button className={`chart-btn ${chartPeriod === 'monthly' ? 'active' : ''}`} onClick={() => setChartPeriod('monthly')}>Month</button>
                      <button className={`chart-btn ${chartPeriod === 'daily' ? 'active' : ''}`} onClick={() => setChartPeriod('daily')}>30 Days</button>
                    </div>
                  </div>
                  <div className="chart-body">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={salesChartData}>
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#facc15" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#facc15" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey={chartPeriod === 'weekly' ? 'day' : chartPeriod === 'monthly' ? 'month' : 'day'} stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#fff' }}
                          formatter={(value) => [`₹${value.toFixed(0)}`, 'Sales']}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#facc15" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <div className="chart-title"><FaShoppingBag className="chart-title-icon" /> Order Status</div>
                  </div>
                  <div className="chart-body">
                    {orderStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                            {orderStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#fff' }} />
                          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state"><FaBoxOpen /><p>No orders yet</p></div>
                    )}
                  </div>
                </div>
              </div>

              {/* TOP LISTS */}
              <div className="dashboard-grid-3">
                <div className="chart-card">
                  <div className="chart-header">
                    <div className="chart-title"><FaBox className="chart-title-icon" /> Top Products</div>
                  </div>
                  <div className="top-list">
                    {topProducts.length > 0 ? topProducts.map((p, i) => (
                      <div className="top-item" key={i}>
                        <div className={`top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
                        {p.image && <img src={p.image} alt={p.name} className="top-img" onError={(e) => (e.target.style.display = 'none')} />}
                        <div className="top-info">
                          <div className="top-name">{p.name}</div>
                          <div className="top-meta">{p.qty} sold</div>
                        </div>
                        <div className="top-value">₹{p.revenue.toFixed(0)}</div>
                      </div>
                    )) : <div className="empty-state"><FaBoxOpen /><p>No sales yet</p></div>}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <div className="chart-title"><FaUsers className="chart-title-icon" /> Top Customers</div>
                  </div>
                  <div className="top-list">
                    {topCustomers.length > 0 ? topCustomers.map((c, i) => (
                      <div className="top-item" key={i}>
                        <div className={`top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
                        <div className="top-info">
                          <div className="top-name">{c.name}</div>
                          <div className="top-meta">{c.phone} • {c.orders} orders</div>
                        </div>
                        <div className="top-value">₹{c.spent.toFixed(0)}</div>
                      </div>
                    )) : <div className="empty-state"><FaUsers /><p>No customers yet</p></div>}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <div className="chart-title"><FaClock className="chart-title-icon" /> Recent Activity</div>
                  </div>
                  <div className="activity-feed">
                    {recentActivity.length > 0 ? recentActivity.map((a, i) => (
                      <div className="activity-item" key={i}>
                        <div className="activity-icon order"><FaShoppingCart /></div>
                        <div className="activity-content">
                          <div className="activity-text">{a.text} <strong>₹{(a.amount || 0).toFixed(0)}</strong></div>
                          <div className="activity-time">{a.time}</div>
                        </div>
                      </div>
                    )) : <div className="empty-state"><FaClock /><p>No activity yet</p></div>}
                  </div>
                </div>
              </div>

              {/* LOW STOCK */}
              {lowStockProducts.length > 0 && (
                <div className="chart-card" style={{ marginBottom: '20px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <div className="chart-header">
                    <div className="chart-title" style={{ color: '#ef4444' }}>
                      <FaExclamationTriangle className="chart-title-icon" style={{ color: '#ef4444' }} /> Low Stock Alert ({lowStockProducts.length})
                    </div>
                  </div>
                  <div className="low-stock-list">
                    {lowStockProducts.map((p, i) => (
                      <div className="low-stock-item" key={i}>
                        {p.image && <img src={p.image} alt={p.name} className="top-img" onError={(e) => (e.target.style.display = 'none')} />}
                        <div className="low-stock-info">
                          <div className="low-stock-name">{p.name}</div>
                          <div className="low-stock-qty">Only {p.stock} left in stock!</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DELIVERY SETTINGS */}
              <div className="stat-card" style={{ borderColor: '#22c55e', marginTop: '20px' }}>
                <h3 style={{ color: '#22c55e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaTruck /> Delivery Settings
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'end' }}>
                  <div>
                    <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '5px' }}>Delivery Charge (₹)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px', fontWeight: '700', color: '#facc15' }}>₹</span>
                      <input type="number" value={deliveryCharge} onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)} style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', fontSize: '18px', width: '140px', fontWeight: '600' }} step="0.5" min="0" />
                      <button onClick={updateDeliveryCharge} className="btn-primary" style={{ padding: '10px 20px' }}><FaSave /> Update</button>
                    </div>
                    <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>Set 0 for FREE delivery</small>
                  </div>
                  <div>
                    <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '5px' }}>Free Delivery Threshold (₹)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px', fontWeight: '700', color: '#facc15' }}>₹</span>
                      <input type="number" value={freeThreshold} onChange={(e) => setFreeThreshold(parseFloat(e.target.value) || 0)} style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', fontSize: '18px', width: '140px', fontWeight: '600' }} step="100" min="0" />
                      <button onClick={updateFreeThreshold} className="btn-info" style={{ padding: '10px 20px', background: '#8b5cf6' }}><FaSave /> Set</button>
                    </div>
                    <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>Orders above this get FREE delivery</small>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #334155', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Current Status</span>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '3px' }}>
                      {deliveryCharge === 0 ? (
                        <span className="status-badge" style={{ background: '#22c55e', color: '#0f172a' }}>🎉 FREE Delivery</span>
                      ) : (
                        <span className="status-badge status-active">₹{deliveryCharge.toFixed(2)} Delivery</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Free Delivery Above</span>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '3px', color: '#22c55e' }}>₹{freeThreshold.toFixed(0)}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Last Updated</span>
                    <div style={{ fontSize: '13px', marginTop: '3px', color: '#94a3b8' }}>{lastUpdated}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== PRODUCTS ===== */}
          {section === 'products' && (
            <div className="page-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>📦 Product Management</h1>
                  <p style={{ color: '#94a3b8' }}>Add, edit, and manage your products</p>
                </div>
                <button className="btn-primary" onClick={openAddProduct}><FaPlus /> Add New Product</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td><img src={p.image || '/product.jpeg'} className="product-img-thumb" onError={(e) => (e.target.src = '/product1.jpeg')} alt={p.name} /></td>
                        <td><strong>{p.name}</strong><br /><small style={{ color: '#64748b' }}>{p.sku || 'No SKU'}</small></td>
                        <td style={{ color: '#facc15' }}>₹{parseFloat(p.price).toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${p.stock > 20 ? 'status-active' : p.stock > 0 ? 'status-low-stock' : 'status-inactive'}`}>
                            {p.stock > 20 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{p.category || 'General'}</td>
                        <td><span className={`status-badge ${p.status === 'active' ? 'status-active' : 'status-inactive'}`}>{p.status || 'active'}</span></td>
                        <td>
                          <button className="btn-warning" onClick={() => openEditProduct(p)} style={{ padding: '4px 12px', fontSize: '12px', marginRight: '5px' }}><FaEdit /></button>
                          <button className="btn-danger" onClick={() => deleteProduct(p.id)} style={{ padding: '4px 12px', fontSize: '12px' }}><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No products added yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== ORDERS ===== */}
          {section === 'orders' && (
            <div className="page-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>🚚 Orders</h1>
                  <p style={{ color: '#94a3b8' }}>View and manage customer orders</p>
                </div>
                <button className="btn-primary" onClick={loadOrders}><FaSync /> Refresh</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id || o.order_id}>
                        <td><span style={{ color: '#facc15', fontFamily: 'monospace', fontSize: '13px' }}>{o.id || o.order_id}</span></td>
                        <td><strong>{o.customer?.name || 'Guest'}</strong></td>
                        <td style={{ color: '#94a3b8' }}>{o.customer?.phone || 'N/A'}</td>
                        <td style={{ color: '#94a3b8', fontSize: '13px' }}>{o.items ? o.items.length : 0} items</td>
                        <td style={{ color: '#facc15', fontWeight: '600' }}>₹{(o.total || 0).toFixed(2)}</td>
                        <td>
                          <select value={o.status || 'pending'} onChange={(e) => updateOrderStatus(o.id || o.order_id, e.target.value)} style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px' }}>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '13px' }}>{o.date ? new Date(o.date).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <button className="btn-info" onClick={() => setSelectedOrder(o)} style={{ padding: '4px 12px', fontSize: '12px' }}>
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No orders found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== COUPONS ===== */}
          {section === 'coupons' && (
            <div className="page-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>🎟️ Coupons</h1>
                  <p style={{ color: '#94a3b8' }}>Manage discount coupons</p>
                </div>
                <button className="btn-primary" onClick={() => setCouponModal(true)}><FaPlus /> Create Coupon</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Discount</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => {
                      const isExpired = c.expiry ? new Date(c.expiry) < new Date() : false;
                      return (
                        <tr key={c.code}>
                          <td><span style={{ color: '#facc15', fontWeight: '700' }}>{c.code}</span></td>
                          <td style={{ color: '#22c55e', fontWeight: '600' }}>{c.discount}%</td>
                          <td style={{ color: '#94a3b8' }}>{c.expiry || 'No expiry'}</td>
                          <td><span className={`status-badge ${isExpired ? 'status-inactive' : 'status-active'}`}>{isExpired ? 'Expired' : 'Active'}</span></td>
                          <td><button className="btn-danger" onClick={() => deleteCoupon(c.code)} style={{ padding: '4px 12px' }}><FaTrash /></button></td>
                        </tr>
                      );
                    })}
                    {coupons.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No coupons</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== REVIEWS ===== */}
          {section === 'reviews' && (
            <div className="page-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>⭐ Reviews</h1>
                  <p style={{ color: '#94a3b8' }}>Manage customer reviews</p>
                </div>
                <button className="btn-primary" onClick={loadReviews}><FaSync /> Refresh</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id}>
                        <td style={{ color: '#94a3b8' }}>{r.productName || 'Product'}</td>
                        <td>{r.userName || 'Anonymous'}</td>
                        <td style={{ color: '#facc15' }}>{'★'.repeat(r.rating)}</td>
                        <td style={{ color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.comment}</td>
                        <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                        <td>
                          {r.status === 'pending' ? (
                            <>
                              <button className="btn-success" onClick={() => updateReviewStatus(r.id, 'approved')} style={{ padding: '4px 8px', fontSize: '11px', marginRight: '4px' }}>Approve</button>
                              <button className="btn-danger" onClick={() => updateReviewStatus(r.id, 'rejected')} style={{ padding: '4px 8px', fontSize: '11px' }}>Reject</button>
                            </>
                          ) : (
                            <button className="btn-danger" onClick={() => deleteReview(r.id)} style={{ padding: '4px 8px', fontSize: '11px' }}><FaTrash /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No reviews</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}




          {section === 'returns' && (
  <div className="page-section">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>↩️ Return / Replace Requests</h1>
        <p style={{ color: '#94a3b8' }}>Manage customer return, replace & refund requests</p>
      </div>
      <button className="btn-primary" onClick={loadReturns}><FaSync /> Refresh</button>
    </div>

    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Customer</th>
            <th>Order ID</th>
            <th>Type</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {returnRequests.map((r) => {
            const typeLabel = { return: 'Return', replace: 'Replace', refund: 'Refund' }[r.requestType] || 'Return';
            const typeColor = { return: '#3b82f6', replace: '#8b5cf6', refund: '#22c55e' }[r.requestType] || '#3b82f6';
            const reasonLabel = {
              damaged: 'Damaged', wrong: 'Wrong Product', missing: 'Missing Item',
              quality: 'Quality Issue', other: 'Other',
            }[r.reason] || r.reason;
            const statusClass = {
              pending: 'status-low-stock',
              approved: 'status-active',
              rejected: 'status-inactive',
              resolved: 'status-active',
            }[r.status] || 'status-pending';

            return (
              <tr key={r.id}>
                <td>
                  <span style={{ color: '#facc15', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700' }}>{r.id}</span>
                </td>
                <td>
                  <strong>{r.name}</strong><br />
                  <small style={{ color: '#64748b' }}>{r.phone}</small>
                </td>
                <td>
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>{r.orderId}</span>
                  {r.productName && <><br /><small style={{ color: '#64748b' }}>{r.productName}</small></>}
                </td>
                <td>
                  <span className="status-badge" style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}50` }}>
                    {typeLabel}
                  </span>
                </td>
                <td style={{ color: '#94a3b8', fontSize: '13px' }}>{reasonLabel}</td>
                <td>
                  <span className={`status-badge ${statusClass}`}>
                    {r.status}
                  </span>
                </td>
                <td style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-info"
                      onClick={() => setSelectedReturn(r)}
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      title="View details"
                    >
                      <FaEye />
                    </button>
                    {r.status === 'pending' && (
                      <>
                        <button
                          className="btn-success"
                          onClick={() => updateReturnStatus(r.id, 'approved')}
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          title="Approve"
                        >
                          <FaCheck />
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => updateReturnStatus(r.id, 'rejected')}
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          title="Reject"
                        >
                          <FaBan />
                        </button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <button
                        className="btn-primary"
                        onClick={() => updateReturnStatus(r.id, 'resolved')}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Mark as resolved"
                      >
                        <FaCheck /> Resolve
                      </button>
                    )}
                    {['rejected', 'resolved'].includes(r.status) && (
                      <button
                        className="btn-danger"
                        onClick={() => deleteReturn(r.id)}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {returnRequests.length === 0 && (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                No return requests yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

          {/* ===== CUSTOMERS ===== */}
          {section === 'customers' && (
            <div className="page-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>👥 Customers</h1>
                  <p style={{ color: '#94a3b8' }}>Manage your customer base</p>
                </div>
                <button className="btn-primary" onClick={loadCustomers}><FaSync /> Refresh</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Orders</th>
                      <th>Total Spent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.sort((a, b) => b.totalSpent - a.totalSpent).map((c) => {
                      let status = 'Active', statusClass = 'status-active';
                      if (c.totalSpent > 5000) { status = 'VIP'; statusClass = 'status-vip'; }
                      return (
                        <tr key={c.phone}>
                          <td><strong>{c.name}</strong></td>
                          <td style={{ color: '#94a3b8' }}>{c.email}</td>
                          <td style={{ color: '#94a3b8' }}>{c.phone}</td>
                          <td style={{ color: '#facc15' }}>{c.orders}</td>
                          <td style={{ color: '#facc15', fontWeight: '600' }}>₹{c.totalSpent.toFixed(2)}</td>
                          <td><span className={`status-badge ${statusClass}`}>{status}</span></td>
                        </tr>
                      );
                    })}
                    {customers.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>No customers</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* PRODUCT MODAL */}
      {productModal && (
        <div className="modal-overlay" onClick={() => setProductModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setProductModal(false)}>&times;</button>
            <h3>{productForm.id ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={saveProduct}>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Product Name *</label>
                <input type="text" className="form-input" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label className="form-label">Price (₹) *</label>
                  <input type="number" className="form-input" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Stock</label>
                  <input type="number" className="form-input" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Max Purchase Per User (0 = Unlimited)</label>
                <input type="number" className="form-input" value={productForm.maxPurchase} onChange={(e) => setProductForm({ ...productForm, maxPurchase: e.target.value })} min="0" />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Category</label>
                <input type="text" className="form-input" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="3" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}></textarea>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Image URL</label>
                <input type="text" className="form-input" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} placeholder="product.jpeg" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><FaSave /> Save Product</button>
                <button type="button" className="btn-danger" onClick={() => setProductModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COUPON MODAL */}
      {couponModal && (
        <div className="modal-overlay" onClick={() => setCouponModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCouponModal(false)}>&times;</button>
            <h3>Create Coupon</h3>
            <form onSubmit={saveCoupon}>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Coupon Code *</label>
                <input type="text" className="form-input" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} required />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Discount (%) *</label>
                <input type="number" className="form-input" value={couponForm.discount} onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })} required />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="form-label">Expiry Date</label>
                <input type="date" className="form-input" value={couponForm.expiry} onChange={(e) => setCouponForm({ ...couponForm, expiry: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><FaPlus /> Create Coupon</button>
                <button type="button" className="btn-danger" onClick={() => setCouponModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}





      {/* RETURN DETAILS MODAL */}
{selectedReturn && (
  <div className="modal-overlay" onClick={() => setSelectedReturn(null)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <button className="modal-close" onClick={() => setSelectedReturn(null)}>&times;</button>
      <h3><FaUndoAlt /> Return Request Details</h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Request ID</span>
          <div style={{ color: '#facc15', fontWeight: '700', fontSize: '18px' }}>{selectedReturn.id}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Status</span>
          <div><span className={`status-badge status-${selectedReturn.status === 'approved' ? 'active' : selectedReturn.status === 'rejected' ? 'inactive' : 'pending'}`}>{(selectedReturn.status || 'pending').toUpperCase()}</span></div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-item"><div className="label">Customer Name</div><div className="value">{selectedReturn.name}</div></div>
        <div className="detail-item"><div className="label">Phone (WhatsApp)</div><div className="value">{selectedReturn.phone}</div></div>
        <div className="detail-item"><div className="label">Email</div><div className="value">{selectedReturn.email || 'N/A'}</div></div>
        <div className="detail-item"><div className="label">Order ID</div><div className="value gold">{selectedReturn.orderId}</div></div>
        <div className="detail-item"><div className="label">Product</div><div className="value">{selectedReturn.productName || 'N/A'}</div></div>
        <div className="detail-item"><div className="label">Request Type</div><div className="value">{selectedReturn.requestType || 'return'}</div></div>
        <div className="detail-item"><div className="label">Reason</div><div className="value">{selectedReturn.reason}</div></div>
        <div className="detail-item"><div className="label">Delivery Date</div><div className="value">{selectedReturn.issueDate || 'N/A'}</div></div>
        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
          <div className="label">Issue Description</div>
          <div className="value" style={{ lineHeight: 1.6 }}>{selectedReturn.description}</div>
        </div>
        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
          <div className="label">Submitted On</div>
          <div className="value">{new Date(selectedReturn.createdAt).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div style={{ marginTop: '15px', padding: '12px 16px', background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <FaWhatsapp style={{ color: '#25D366', fontSize: '20px' }} />
        <span style={{ color: '#94a3b8', fontSize: '13px', flex: 1 }}>Contact customer on WhatsApp to resolve</span>
        <a
          href={`https://wa.me/${selectedReturn.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedReturn.name}, regarding your ${selectedReturn.requestType} request (${selectedReturn.id}) for order ${selectedReturn.orderId}. Let's resolve this!`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-success"
          style={{ padding: '8px 16px', fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <FaWhatsapp /> WhatsApp
        </a>
      </div>

      {selectedReturn.adminNote && (
        <div style={{ marginTop: '15px', padding: '10px 15px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#3b82f6', fontSize: '13px' }}>
          <strong>Admin Note:</strong> {selectedReturn.adminNote}
        </div>
      )}

      {selectedReturn.status === 'pending' && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            className="btn-success"
            onClick={() => { updateReturnStatus(selectedReturn.id, 'approved'); setSelectedReturn(null); }}
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          >
            <FaCheck /> Approve
          </button>
          <button
            className="btn-danger"
            onClick={() => { updateReturnStatus(selectedReturn.id, 'rejected'); setSelectedReturn(null); }}
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
          >
            <FaBan /> Reject
          </button>
        </div>
      )}
    </div>
  </div>
)}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedOrder(null)}>&times;</button>
            <h3><FaReceipt /> Order Details</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Order ID</span>
                <div style={{ color: '#facc15', fontWeight: '700', fontSize: '18px' }}>{selectedOrder.id || selectedOrder.order_id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Status</span>
                <div><span className={`status-badge status-${selectedOrder.status || 'pending'}`}>{(selectedOrder.status || 'pending').toUpperCase()}</span></div>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <div className="label">Order Date</div>
                <div className="value">{selectedOrder.date ? new Date(selectedOrder.date).toLocaleString() : 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="label">Payment ID</div>
                <div className="value gold" style={{ fontSize: '12px', fontFamily: 'monospace' }}>{selectedOrder.payment_id || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="label">Payment Method</div>
                <div className="value">{selectedOrder.customer?.paymentMethod || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="label">Coupon Applied</div>
                <div className="value" style={{ color: selectedOrder.coupon ? '#22c55e' : '#64748b' }}>{selectedOrder.coupon || 'None'}</div>
              </div>
              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                <div className="label">Customer Name</div>
                <div className="value">{selectedOrder.customer?.name || 'Guest'}</div>
              </div>
              <div className="detail-item">
                <div className="label">Email</div>
                <div className="value" style={{ fontSize: '13px' }}>{selectedOrder.customer?.email || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="label">Phone</div>
                <div className="value">{selectedOrder.customer?.phone || 'N/A'}</div>
              </div>
              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                <div className="label">Delivery Address</div>
                <div className="value">{selectedOrder.customer?.address || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="label">City</div>
                <div className="value">{selectedOrder.customer?.city || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="label">Pincode</div>
                <div className="value">{selectedOrder.customer?.pincode || 'N/A'}</div>
              </div>
            </div>

            <div style={{ margin: '15px 0' }}>
              <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
                Order Items ({(selectedOrder.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} items)
              </div>
              <div className="order-items-list">
                {(selectedOrder.items || []).length > 0 ? (
                  selectedOrder.items.map((item, i) => (
                    <div key={i} className="item-row">
                      <span className="item-name">
                        {item.name || 'Product'}
                        <span className="qty-badge">×{item.quantity || 1}</span>
                      </span>
                      <span className="item-price">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', padding: '10px', textAlign: 'center' }}>No items in this order</div>
                )}
              </div>
            </div>

            <div style={{ background: '#0f172a', borderRadius: '8px', padding: '15px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#94a3b8' }}>
                <span>Subtotal</span>
                <span>₹{(selectedOrder.total || 0).toFixed(2)}</span>
              </div>
              {selectedOrder.deliveryCharge !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#94a3b8' }}>
                  <span>Delivery Charge</span>
                  <span style={{ color: selectedOrder.deliveryCharge === 0 ? '#22c55e' : '#94a3b8' }}>
                    {selectedOrder.deliveryCharge === 0 ? 'FREE' : `₹${selectedOrder.deliveryCharge.toFixed(2)}`}
                  </span>
                </div>
              )}
              {selectedOrder.coupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#22c55e' }}>
                  <span>Discount ({selectedOrder.coupon})</span>
                  <span>-₹{(selectedOrder.discount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 5px 0', borderTop: '2px solid #334155', marginTop: '5px' }}>
                <span style={{ fontWeight: '700', fontSize: '18px' }}>Total</span>
                <span style={{ color: '#facc15', fontWeight: '700', fontSize: '20px' }}>₹{(selectedOrder.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.cancellation_reason && (
              <div style={{ marginTop: '15px', padding: '10px 15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '14px' }}>
                <strong>Cancellation Reason:</strong> {selectedOrder.cancellation_reason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;