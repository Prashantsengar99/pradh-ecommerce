import { apiFetch } from '../services/api';
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
  FaShieldAlt, FaMobileAlt, FaDesktop, FaTabletAlt, FaClock, FaMapMarkedAlt,
  FaSignOutAlt as FaLogoutOther, FaSyncAlt, FaQuestionCircle,
  FaEdit, FaHome, FaBuilding, FaTag, FaStar as FaStarIcon, FaCheck, FaGlobe,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import {
  formatRelativeTime, getDeviceIcon, formatTimeUntilExpiry, getTokenExpiry,
} from '../utils/authSecurity';
import '/src/styles/dashboard.css';
import '/src/styles/tracking.css';

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

  // 🛡️ NEW: Security / Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [sessionExpiryTime, setSessionExpiryTime] = useState(null);

  // 🆕 ADDRESSES state
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Home', name: '', phone: '', address: '', city: '', pincode: '',
  });
  const [addressSaving, setAddressSaving] = useState(false);

  // 🆕 PREFERENCES state (functional Settings)
  const [preferences, setPreferences] = useState({
    emailNotifications: true, smsAlerts: true, marketingEmails: false,
    orderUpdates: true, language: 'en', theme: 'light',
  });
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // 🆕 PROFILE EDIT state
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '', email: '', phone: '', address: '', city: '', pincode: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

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
      // 🛡️ Track session expiry for display
      const expiry = getTokenExpiry(token);
      if (expiry) setSessionExpiryTime(expiry);
    } catch {}
  }, [navigate]);

  // ============ FETCH REAL DATA ============
  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await apiFetch('/api/auth/orders', {
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
        const res = await apiFetch('/api/auth/profile', { headers });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch (err) { console.warn('Profile fetch failed:', err); }

      try {
        const res = await apiFetch('/api/auth/orders', { headers });
        const data = await res.json();
        if (data.success) setOrders(data.orders || []);
      } catch (err) { console.warn('Orders fetch failed:', err); }

      try {
        const res = await apiFetch('/api/auth/notifications', { headers });
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

  // 🛡️ FETCH SESSIONS — called when Security tab is opened
  const fetchSessions = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSessionsLoading(true);
    try {
      const res = await apiFetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.warn('Sessions fetch failed:', err);
      // If 401 (session revoked), force logout
      if (err?.status === 401) {
        handleForceLogout('Your session was revoked from another device.');
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  // Auto-fetch sessions when Security tab is opened
  useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
    }
  }, [activeTab]);

  // 🆕 FETCH ADDRESSES — called when Addresses tab is opened
  const fetchAddresses = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setAddressesLoading(true);
    try {
      const res = await apiFetch('/api/auth/addresses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.warn('Addresses fetch failed:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  // 🆕 FETCH PREFERENCES — called when Settings tab is opened
  const fetchPreferences = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setPrefsLoading(true);
    try {
      const res = await apiFetch('/api/auth/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.warn('Preferences fetch failed:', err);
    } finally {
      setPrefsLoading(false);
    }
  };

  // Auto-fetch when Addresses or Settings tab is opened
  useEffect(() => {
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'settings') fetchPreferences();
  }, [activeTab]);

  // 🆕 ADDRESS HANDLERS
  const openAddAddressModal = () => {
    setEditingAddress(null);
    setAddressForm({ label: 'Home', name: user?.username || '', phone: user?.phone || '', address: '', city: '', pincode: '' });
    setShowAddressModal(true);
  };

  const openEditAddressModal = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label || 'Home',
      name: addr.name || '',
      phone: addr.phone || '',
      address: addr.address || '',
      city: addr.city || '',
      pincode: addr.pincode || '',
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async () => {
    if (!addressForm.name.trim() || !addressForm.phone.trim() || !addressForm.address.trim() || !addressForm.city.trim() || !addressForm.pincode.trim()) {
      toast.error('Please fill all required fields');
      return;
    }
    setAddressSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingAddress
        ? `/api/auth/addresses/${editingAddress.id || editingAddress._id}`
        : '/api/auth/addresses';
      const method = editingAddress ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingAddress ? 'Address updated! 📍' : 'Address added! 📍');
        setShowAddressModal(false);
        setAddresses(data.addresses || []);
      } else {
        toast.error(data.message || 'Failed to save address');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/api/auth/addresses/${addrId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Address deleted');
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addrId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/api/auth/addresses/${addrId}/default`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Default address updated ⭐');
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      toast.error('Failed to set default');
    }
  };

  // 🆕 PREFERENCES HANDLER — toggle/save settings
  const handlePreferenceChange = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    setPrefsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/auth/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Setting updated ✅', { duration: 1500 });
      }
    } catch (err) {
      // Revert on error
      setPreferences(preferences);
      toast.error('Failed to update setting');
    } finally {
      setPrefsSaving(false);
    }
  };

  // 🆕 PROFILE EDIT HANDLER
  const openProfileEditModal = () => {
    setProfileForm({
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      pincode: user?.pincode || '',
    });
    setShowProfileEditModal(true);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profile updated! ✅');
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowProfileEditModal(false);
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  // 🛡️ Refresh session expiry display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        const expiry = getTokenExpiry(token);
        setSessionExpiryTime(expiry);
      }
    }, 60000);
    return () => clearInterval(interval);
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

  // ============ TRACKING (ENHANCED with auto-refresh) ============
  useEffect(() => {
    if (!trackingOrder) {
      setTrackingData(null);
      return;
    }
    const fetchTracking = async () => {
      try {
        const res = await apiFetch(`/api/order/track/${trackingOrder.id}`);
        const data = await res.json();
        if (data.success) setTrackingData(data);
      } catch (err) { console.warn('Tracking fetch failed:', err); }
    };
    fetchTracking();
    const interval = setInterval(fetchTracking, 15000);
    return () => clearInterval(interval);
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
      const res = await apiFetch(`/api/orders/${cancelOrder.id}/cancel`, {
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
      const res = await apiFetch(`/api/orders/${returnOrder.id}/return`, {
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
  // 🛡️ Enhanced logout — calls backend to revoke session
  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    const token = localStorage.getItem('token');
    // Best-effort: tell backend to revoke session (don't block on failure)
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('sessionExpiresAt');
    toast.success('Logged out successfully');
    navigate('/');
  };

  // 🛡️ Force logout (when session revoked from another device)
  const handleForceLogout = (message) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('sessionExpiresAt');
    toast.error(message || 'Session expired. Please login again.');
    setTimeout(() => navigate('/login?reason=expired'), 1500);
  };

  // 🛡️ Revoke a specific session (logout from one device)
  const handleRevokeSession = async (sessionId) => {
    if (!sessionId) return;
    if (!window.confirm('Logout from this device? The user on that device will need to login again.')) return;
    setRevokingSessionId(sessionId);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Device logged out successfully 📴');
        await fetchSessions();
      } else {
        toast.error(data.message || 'Failed to revoke session');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // 🛡️ Logout from ALL other devices
  const handleLogoutAllOthers = async () => {
    if (!window.confirm('Logout from ALL other devices? Only this device will stay logged in.')) return;
    setLogoutAllLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/auth/sessions-all-others', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.revokedCount} device(s) logged out 📴`);
        await fetchSessions();
      } else {
        toast.error(data.message || 'Failed to logout other devices');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLogoutAllLoading(false);
    }
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

  // 🆕 Use fetched addresses (from DB) instead of legacy single address
  const userAddresses = addresses;

  // 🛡️ Active session count for badge
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  const menuItems = [
    { key: 'orders', icon: <FaBox />, label: 'My Orders', badge: orderCount },
    { key: 'wishlist', icon: <FaHeart />, label: 'Wishlist', badge: wishlist.length },
    { key: 'notifications', icon: <FaBell />, label: 'Notifications', badge: unreadCount },
    { key: 'analytics', icon: <FaChartLine />, label: 'Analytics' },
    { key: 'addresses', icon: <FaMapMarkerAlt />, label: 'Addresses', badge: userAddresses.length || null },
    { key: 'security', icon: <FaShieldAlt />, label: 'Security', badge: otherSessionsCount > 0 ? otherSessionsCount : null },
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

  // 🛡️ Get device icon component for sessions
  const getDeviceIconComponent = (deviceType) => {
    switch (deviceType) {
      case 'Mobile': return <FaMobileAlt />;
      case 'Tablet': return <FaTabletAlt />;
      case 'Desktop': return <FaDesktop />;
      default: return <FaDesktop />;
    }
  };

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

  // 🛡️ Format session expiry for display
  const token = localStorage.getItem('token');
  const timeUntilExpiry = token ? formatTimeUntilExpiry(token) : 'Unknown';

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
          <div className="stat-card" onClick={() => setActiveTab('security')}>
            <div className="stat-icon addresses"><FaShieldAlt /></div>
            <div className="stat-info">
              <span className="stat-value">{sessions.length || 0}</span>
              <span className="stat-label">Active Devices</span>
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
                  {item.badge != null && item.badge > 0 && <span className="tab-badge">{item.badge}</span>}
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
                    <p className="content-subtitle">Save multiple addresses — select at checkout, no need to type every time</p>
                  </div>
                  <button onClick={openAddAddressModal} className="content-action">
                    <FaPlus /> Add Address
                  </button>
                </div>

                {addressesLoading ? (
                  <div className="empty-state">
                    <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: 'var(--pf-gold-deep)' }} />
                    <h3>Loading addresses...</h3>
                  </div>
                ) : userAddresses.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📍</div>
                    <h3>No addresses saved yet</h3>
                    <p>Add your Home, Office, or any address — select it at checkout to save time.</p>
                    <button onClick={openAddAddressModal} className="content-action">
                      <FaPlus /> Add Your First Address
                    </button>
                  </div>
                ) : (
                  <div className="addresses-grid">
                    {userAddresses.map((addr) => (
                      <div className={`address-card ${addr.isDefault ? 'default' : ''}`} key={addr.id || addr._id}>
                        <div className="address-card-header">
                          <div className="address-label">
                            {addr.label === 'Home' ? <FaHome /> : addr.label === 'Office' ? <FaBuilding /> : <FaTag />}
                            <span>{addr.label || 'Address'}</span>
                          </div>
                          {addr.isDefault && <span className="default-badge"><FaStar /> Default</span>}
                        </div>
                        <h4>{addr.name}</h4>
                        <p className="address-text">{addr.address}</p>
                        <p className="address-text">{addr.city} — {addr.pincode}</p>
                        <p className="address-phone">
                          <FaPhone /> {addr.phone}
                        </p>
                        <div className="address-actions">
                          {!addr.isDefault && (
                            <button
                              className="addr-btn set-default"
                              onClick={() => handleSetDefaultAddress(addr.id || addr._id)}
                              title="Set as default"
                            >
                              <FaStar /> Set Default
                            </button>
                          )}
                          <button
                            className="addr-btn edit"
                            onClick={() => openEditAddressModal(addr)}
                            title="Edit address"
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            className="addr-btn delete"
                            onClick={() => handleDeleteAddress(addr.id || addr._id)}
                            title="Delete address"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Address CTA at bottom if user has addresses */}
                {userAddresses.length > 0 && (
                  <div className="add-address-cta" onClick={openAddAddressModal}>
                    <FaPlus />
                    <span>Add New Address</span>
                  </div>
                )}
              </>
            )}

            {/* ===== 🛡️ SECURITY / SESSIONS ===== */}
            {activeTab === 'security' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">Account <span>Security</span></h2>
                    <p className="content-subtitle">Manage your active sessions and devices</p>
                  </div>
                </div>

                {/* Session info banner */}
                <div className="security-info-banner">
                  <div className="security-info-icon"><FaClock /></div>
                  <div className="security-info-content">
                    <div className="security-info-title">Session expires in {timeUntilExpiry}</div>
                    <div className="security-info-subtitle">
                      For your security, you'll be automatically logged out after 24 hours.
                      You'll need to login again to continue.
                    </div>
                  </div>
                </div>

                {/* Action: Logout all other devices */}
                {otherSessionsCount > 0 && (
                  <div className="security-action-bar">
                    <div className="security-action-info">
                      <strong>{otherSessionsCount}</strong> other device{otherSessionsCount !== 1 ? 's' : ''} currently active
                    </div>
                    <button
                      className="security-btn-danger"
                      onClick={handleLogoutAllOthers}
                      disabled={logoutAllLoading}
                    >
                      {logoutAllLoading ? (
                        <><FaSyncAlt className="fa-spin" /> Logging out...</>
                      ) : (
                        <><FaLogoutOther /> Logout All Other Devices</>
                      )}
                    </button>
                  </div>
                )}

                {/* Sessions list */}
                <div className="sessions-header">
                  <h3>📱 Active Devices ({sessions.length})</h3>
                  <button
                    className="security-btn-refresh"
                    onClick={fetchSessions}
                    disabled={sessionsLoading}
                    title="Refresh"
                  >
                    <FaSyncAlt className={sessionsLoading ? 'fa-spin' : ''} />
                  </button>
                </div>

                {sessionsLoading ? (
                  <div className="empty-state">
                    <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: 'var(--pf-gold-deep)' }} />
                    <h3>Loading sessions...</h3>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔒</div>
                    <h3>No active sessions</h3>
                    <p>Couldn't load session data. Try refreshing.</p>
                  </div>
                ) : (
                  <div className="sessions-list">
                    {sessions.map((s) => (
                      <div
                        key={s.sessionId}
                        className={`session-card ${s.isCurrent ? 'current' : ''}`}
                      >
                        <div className="session-device-icon">
                          {getDeviceIconComponent(s.deviceType)}
                        </div>
                        <div className="session-info">
                          <div className="session-header-row">
                            <h4>{s.deviceType} • {s.browser}</h4>
                            {s.isCurrent && <span className="session-current-badge">This Device</span>}
                          </div>
                          <div className="session-meta">
                            <span className="session-meta-item">
                              <FaDesktop /> {s.os}
                            </span>
                            <span className="session-meta-item">
                              <FaMapMarkedAlt /> {s.location || 'Unknown'}
                            </span>
                            <span className="session-meta-item">
                              <FaClock /> Active {formatRelativeTime(s.lastActive)}
                            </span>
                          </div>
                          <div className="session-meta-sub">
                            Logged in: {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {!s.isCurrent && (
                          <button
                            className="session-revoke-btn"
                            onClick={() => handleRevokeSession(s.sessionId)}
                            disabled={revokingSessionId === s.sessionId}
                            title="Logout from this device"
                          >
                            {revokingSessionId === s.sessionId ? (
                              <FaSyncAlt className="fa-spin" />
                            ) : (
                              <><FaSignOutAlt /> Revoke</>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Security tips */}
                <div className="security-tips">
                  <h4><FaShieldAlt /> Security Tips</h4>
                  <ul>
                    <li>If you see a device you don't recognize, revoke it immediately and change your password.</li>
                    <li>Always logout from public/shared computers after use.</li>
                    <li>Your session automatically expires after 24 hours for safety.</li>
                    <li>Never share your login credentials with anyone.</li>
                  </ul>
                </div>
              </>
            )}

            {/* ===== PROFILE ===== */}
            {activeTab === 'profile' && (
              <>
                <div className="content-header">
                  <div>
                    <h2 className="content-title">My <span>Profile</span></h2>
                    <p className="content-subtitle">Your account information — tap edit to update</p>
                  </div>
                  <button onClick={openProfileEditModal} className="content-action">
                    <FaEdit /> Edit Profile
                  </button>
                </div>

                <div className="profile-info-card">
                  <div className="profile-field">
                    <span className="profile-field-label">Full Name</span>
                    <span className="profile-field-value">{user?.username || 'Not set'}</span>
                    <button className="field-edit-btn" onClick={openProfileEditModal} title="Edit">
                      <FaEdit />
                    </button>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Email</span>
                    <span className="profile-field-value">{user?.email || 'Not set'}</span>
                    <button className="field-edit-btn" onClick={openProfileEditModal} title="Edit">
                      <FaEdit />
                    </button>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Phone</span>
                    <span className="profile-field-value">{user?.phone || 'Not set'}</span>
                    <button className="field-edit-btn" onClick={openProfileEditModal} title="Edit">
                      <FaEdit />
                    </button>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Address</span>
                    <span className="profile-field-value">{user?.address || 'Not set'}</span>
                    <button className="field-edit-btn" onClick={openProfileEditModal} title="Edit">
                      <FaEdit />
                    </button>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">City</span>
                    <span className="profile-field-value">{user?.city || 'Not set'}</span>
                    <button className="field-edit-btn" onClick={openProfileEditModal} title="Edit">
                      <FaEdit />
                    </button>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Pincode</span>
                    <span className="profile-field-value">{user?.pincode || 'Not set'}</span>
                    <button className="field-edit-btn" onClick={openProfileEditModal} title="Edit">
                      <FaEdit />
                    </button>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Account Status</span>
                    <span className="profile-field-value" style={{ color: '#22c55e' }}>✅ Active</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Member Since</span>
                    <span className="profile-field-value">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently'}
                    </span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Total Orders</span>
                    <span className="profile-field-value">{user?.orderCount || 0} orders</span>
                  </div>
                  <div className="profile-field">
                    <span className="profile-field-label">Total Spent</span>
                    <span className="profile-field-value">₹{(user?.totalSpent || 0).toLocaleString('en-IN')}</span>
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
                    <p className="content-subtitle">Manage your preferences — changes save automatically</p>
                  </div>
                </div>

                {prefsLoading ? (
                  <div className="empty-state">
                    <FaSpinner className="fa-spin" style={{ fontSize: '32px', color: 'var(--pf-gold-deep)' }} />
                    <h3>Loading settings...</h3>
                  </div>
                ) : (
                  <>
                    {/* Notifications section */}
                    <div className="settings-section">
                      <h3 className="settings-section-title">
                        <FaBell /> Notifications
                      </h3>
                      <div className="settings-list">
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Email Notifications</span>
                            <span className="setting-desc">Receive order updates and offers via email</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.emailNotifications}
                              onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                              disabled={prefsSaving}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">SMS Alerts</span>
                            <span className="setting-desc">Get order status alerts on your phone</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.smsAlerts}
                              onChange={(e) => handlePreferenceChange('smsAlerts', e.target.checked)}
                              disabled={prefsSaving}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Order Updates</span>
                            <span className="setting-desc">Shipped, out-for-delivery, delivered notifications</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.orderUpdates}
                              onChange={(e) => handlePreferenceChange('orderUpdates', e.target.checked)}
                              disabled={prefsSaving}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Marketing Emails</span>
                            <span className="setting-desc">New products, special offers, and discounts</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={preferences.marketingEmails}
                              onChange={(e) => handlePreferenceChange('marketingEmails', e.target.checked)}
                              disabled={prefsSaving}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Preferences section */}
                    <div className="settings-section">
                      <h3 className="settings-section-title">
                        <FaCog /> Preferences
                      </h3>
                      <div className="settings-list">
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Language</span>
                            <span className="setting-desc">Display language for the app</span>
                          </div>
                          <select
                            className="setting-select"
                            value={preferences.language}
                            onChange={(e) => handlePreferenceChange('language', e.target.value)}
                            disabled={prefsSaving}
                          >
                            <option value="en">English</option>
                            <option value="hi">हिंदी (Hindi)</option>
                          </select>
                        </div>
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Theme</span>
                            <span className="setting-desc">Choose your preferred appearance</span>
                          </div>
                          <select
                            className="setting-select"
                            value={preferences.theme}
                            onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                            disabled={prefsSaving}
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System Default</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Security info section */}
                    <div className="settings-section">
                      <h3 className="settings-section-title">
                        <FaShieldAlt /> Security
                      </h3>
                      <div className="settings-list">
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Session Timeout</span>
                            <span className="setting-desc">You'll be auto-logged out after 24 hours</span>
                          </div>
                          <span className="setting-static-value">24 hours</span>
                        </div>
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Session expires in</span>
                            <span className="setting-desc">Time until current session auto-logout</span>
                          </div>
                          <span className="setting-static-value">{timeUntilExpiry}</span>
                        </div>
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Active Devices</span>
                            <span className="setting-desc">Manage your logged-in devices</span>
                          </div>
                          <button
                            className="setting-link-btn"
                            onClick={() => setActiveTab('security')}
                          >
                            <FaShieldAlt /> View Devices
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Danger zone */}
                    <div className="settings-section danger-zone">
                      <h3 className="settings-section-title">
                        <FaExclamationTriangle /> Account Actions
                      </h3>
                      <div className="settings-list">
                        <div className="setting-row">
                          <div className="setting-info">
                            <span className="setting-label">Logout</span>
                            <span className="setting-desc">End your current session on this device</span>
                          </div>
                          <button className="setting-danger-btn" onClick={handleLogout}>
                            <FaSignOutAlt /> Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
                <h2><FaTruck style={{ color: 'var(--pf-gold-deep, #A67C2E)' }} /> Track Your Order</h2>
                <p>Live updates on your delivery</p>
              </div>
              <button
                className="return-modal-close"
                onClick={() => setTrackingOrder(null)}
                style={{
                  background: 'var(--pf-cream, #F8F5EF)',
                  border: '1px solid var(--pf-border, rgba(57, 37, 27, 0.10))',
                  color: 'var(--pf-chocolate, #39251B)', width: '36px', height: '36px', borderRadius: '50%',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div className="tracking-auto-refresh">
              <span className="refresh-dot"></span>
              Auto-updating every 15 seconds
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
                <span className="tracking-summary-value" style={{ color: 'var(--pf-gold-deep, #A67C2E)' }}>
                  ₹{(parseFloat(trackingOrder.total) || 0).toFixed(2)}
                </span>
              </div>
              <div className="tracking-summary-item">
                <span className="tracking-summary-label">Payment</span>
                <span className="tracking-summary-value">
                  {trackingData?.order?.paymentMethod || trackingOrder.customer?.paymentMethod || 'N/A'}
                </span>
              </div>
            </div>

            {trackingData ? (
              (() => {
                const EXCEPTIONAL_STATUSES = ['cancelled', 'return_requested', 'returned', 'refund_initiated', 'refunded', 'rejected'];
                const isExceptional = trackingData.isExceptional || EXCEPTIONAL_STATUSES.includes(trackingOrder.status);

                const exceptionalStatus = trackingData.exceptionalStatus || (isExceptional ? {
                  status: trackingOrder.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  statusKey: trackingOrder.status,
                  description: trackingOrder.status === 'cancelled' ? 'This order has been cancelled.' :
                    trackingOrder.status === 'return_requested' ? 'Return request submitted.' :
                    trackingOrder.status === 'returned' ? 'Product returned successfully.' :
                    trackingOrder.status === 'refund_initiated' ? 'Refund process started.' :
                    trackingOrder.status === 'refunded' ? 'Refund completed successfully.' : 'Order status updated.',
                  reason: trackingOrder.cancellation_reason || null,
                  time: trackingOrder.cancelled_at || trackingOrder.date || trackingOrder.createdAt,
                } : null);

                return (
              <>
                {(trackingData.trackingNumber || trackingData.shippingPartner || trackingData.estimatedDelivery) && (
                  <div className="tracking-shipping-info">
                    {trackingData.shippingPartner && (
                      <div className="tracking-shipping-item">
                        📦 <strong>{trackingData.shippingPartner}</strong>
                      </div>
                    )}
                    {trackingData.trackingNumber && (
                      <div className="tracking-shipping-item">
                        🔖 Tracking: <strong>{trackingData.trackingNumber}</strong>
                      </div>
                    )}
                    {trackingData.estimatedDelivery && (
                      <div className="tracking-shipping-item">
                        📅 ETA: <strong>{new Date(trackingData.estimatedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</strong>
                      </div>
                    )}
                  </div>
                )}

                {isExceptional && exceptionalStatus && (
                  <div className={`tracking-exceptional ${
                    exceptionalStatus.statusKey === 'cancelled' ? 'cancelled' :
                    exceptionalStatus.statusKey === 'refunded' || exceptionalStatus.statusKey === 'rejected' ? 'resolved' :
                    exceptionalStatus.statusKey?.includes('refund') ? 'refund' : 'return'
                  }`}>
                    <div className="tracking-exceptional-icon">{getStatusIcon(exceptionalStatus.statusKey)}</div>
                    <div className="tracking-exceptional-content">
                      <h4>{exceptionalStatus.status}</h4>
                      <p>{exceptionalStatus.description}</p>
                      {exceptionalStatus.reason && (
                        <p style={{ marginTop: '4px' }}><strong>Reason:</strong> {exceptionalStatus.reason}</p>
                      )}
                      {exceptionalStatus.time && (
                        <span className="step-time">{new Date(exceptionalStatus.time).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                )}

                {!isExceptional && (
                  <div className="tracking-progress-bar">
                    <div className="tracking-progress-fill" style={{ width: `${trackingData.progress || 0}%` }}></div>
                  </div>
                )}

                {!isExceptional && trackingData.timeline && (
                  <div className="tracking-timeline">
                    {trackingData.timeline.map((step, idx) => (
                      <div
                        key={idx}
                        className={`tracking-step ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}`}
                      >
                        <div className="step-dot">
                          {step.completed ? <FaCheckCircle /> : step.current ? <FaBoxOpen /> : <FaBox />}
                        </div>
                        <div className="tracking-step-info">
                          <h4>{step.status}</h4>
                          <p>{step.description}</p>
                          {step.time && (
                            <span className="step-time">
                              {new Date(step.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="tracking-items">
                  <div className="tracking-items-title">Order Items</div>
                  {(trackingData.order?.items || trackingOrder.items || []).map((item, idx) => (
                    <div className="tracking-item-row" key={idx}>
                      <img
                        src={item.image || '/product1.jpeg'}
                        alt={item.name}
                        className="tracking-item-img"
                        onError={(e) => (e.target.src = '/product1.jpeg')}
                      />
                      <div className="tracking-item-name">{item.name}</div>
                      <div className="tracking-item-qty">×{item.quantity || 1}</div>
                      <div className="tracking-item-price">₹{item.price}</div>
                    </div>
                  ))}
                </div>
              </>
                );
              })()
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <FaSpinner className="fa-spin" style={{ fontSize: '24px', color: 'var(--pf-gold-deep, #A67C2E)' }} />
                <p style={{ marginTop: '10px', color: 'var(--pf-text-muted, #8A7560)' }}>Loading tracking info...</p>
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

      {/* ===== 🆕 ADDRESS ADD/EDIT MODAL ===== */}
      {showAddressModal && (
        <div className="confirm-modal-overlay" onClick={() => !addressSaving && setShowAddressModal(false)}>
          <div className="confirm-modal address-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon" style={{ background: 'rgba(196, 154, 69, 0.12)', color: 'var(--pf-gold-deep)' }}>
              <FaMapMarkerAlt />
            </div>
            <h2>{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
            <p className="confirm-modal-text">
              {editingAddress ? 'Update your delivery address' : 'Save a delivery address for quick checkout'}
            </p>

            {/* Label selector */}
            <label className="confirm-modal-label">Address Label</label>
            <div className="address-label-selector">
              {['Home', 'Office', 'Other'].map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  className={`label-chip ${addressForm.label === lbl ? 'active' : ''}`}
                  onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                >
                  {lbl === 'Home' ? <FaHome /> : lbl === 'Office' ? <FaBuilding /> : <FaTag />}
                  {lbl}
                </button>
              ))}
            </div>

            <label className="confirm-modal-label">Full Name <span className="required">*</span></label>
            <input
              className="confirm-modal-input"
              type="text"
              value={addressForm.name}
              onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
              placeholder="Recipient's name"
              disabled={addressSaving}
            />

            <label className="confirm-modal-label">Phone <span className="required">*</span></label>
            <input
              className="confirm-modal-input"
              type="tel"
              value={addressForm.phone}
              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
              disabled={addressSaving}
            />

            <label className="confirm-modal-label">Address <span className="required">*</span></label>
            <textarea
              className="confirm-modal-input"
              value={addressForm.address}
              onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
              placeholder="House no, street, area, landmark"
              rows={2}
              disabled={addressSaving}
            />

            <div className="address-form-row">
              <div>
                <label className="confirm-modal-label">City <span className="required">*</span></label>
                <input
                  className="confirm-modal-input"
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder="City"
                  disabled={addressSaving}
                />
              </div>
              <div>
                <label className="confirm-modal-label">Pincode <span className="required">*</span></label>
                <input
                  className="confirm-modal-input"
                  type="text"
                  value={addressForm.pincode}
                  onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  disabled={addressSaving}
                />
              </div>
            </div>

            <div className="confirm-modal-actions">
              <button
                className="confirm-btn secondary"
                onClick={() => setShowAddressModal(false)}
                disabled={addressSaving}
              >
                Cancel
              </button>
              <button
                className="confirm-btn primary"
                onClick={handleSaveAddress}
                disabled={addressSaving}
              >
                {addressSaving ? <><FaSpinner className="fa-spin" /> Saving...</> : <><FaCheck /> Save Address</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 🆕 PROFILE EDIT MODAL ===== */}
      {showProfileEditModal && (
        <div className="confirm-modal-overlay" onClick={() => !profileSaving && setShowProfileEditModal(false)}>
          <div className="confirm-modal address-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon" style={{ background: 'rgba(196, 154, 69, 0.12)', color: 'var(--pf-gold-deep)' }}>
              <FaUser />
            </div>
            <h2>Edit Profile</h2>
            <p className="confirm-modal-text">Update your account information</p>

            <label className="confirm-modal-label">Full Name</label>
            <input
              className="confirm-modal-input"
              type="text"
              value={profileForm.username}
              onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
              placeholder="Your name"
              disabled={profileSaving}
            />

            <label className="confirm-modal-label">Email</label>
            <input
              className="confirm-modal-input"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              placeholder="your@email.com"
              disabled={profileSaving}
            />

            <label className="confirm-modal-label">Phone</label>
            <input
              className="confirm-modal-input"
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
              disabled={profileSaving}
            />

            <label className="confirm-modal-label">Address</label>
            <textarea
              className="confirm-modal-input"
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              placeholder="Your address"
              rows={2}
              disabled={profileSaving}
            />

            <div className="address-form-row">
              <div>
                <label className="confirm-modal-label">City</label>
                <input
                  className="confirm-modal-input"
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  placeholder="City"
                  disabled={profileSaving}
                />
              </div>
              <div>
                <label className="confirm-modal-label">Pincode</label>
                <input
                  className="confirm-modal-input"
                  type="text"
                  value={profileForm.pincode}
                  onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                  placeholder="Pincode"
                  maxLength={6}
                  disabled={profileSaving}
                />
              </div>
            </div>

            <div className="confirm-modal-actions">
              <button
                className="confirm-btn secondary"
                onClick={() => setShowProfileEditModal(false)}
                disabled={profileSaving}
              >
                Cancel
              </button>
              <button
                className="confirm-btn primary"
                onClick={handleSaveProfile}
                disabled={profileSaving}
              >
                {profileSaving ? <><FaSpinner className="fa-spin" /> Saving...</> : <><FaCheck /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
