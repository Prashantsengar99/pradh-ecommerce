require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ============================================
// MONGODB CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pradh_db';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas Connected Successfully!');
    console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// ============================================
// SCHEMAS
// ============================================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  pincode: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  orderCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  rewards: { type: Number, default: 0 },
  level: { type: String, default: 'Bronze' },
});

const productSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  category: String,
  image: String,
  stock: { type: Number, default: 0 },
  maxPurchasePerUser: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  order_id: String,
  payment_id: String,
  status: { type: String, default: 'pending' },
  date: { type: Date, default: Date.now },
  items: [{ id: String, name: String, price: Number, quantity: Number }],
  total: Number,
  deliveryCharge: Number,
  coupon: String,
  discount: Number,
  customer: {
    name: String,
    phone: String,
    email: String,
    address: String,
    city: String,
    pincode: String,
    paymentMethod: String,
  },
  userId: { type: String, default: null },
  cancellation_reason: String,
  cancelled_at: Date,
  // ✅ TRACKING SYSTEM FIELDS
  trackingHistory: [{
    status: String,
    timestamp: Date,
    description: String,
    updatedBy: { type: String, default: 'system' }, // 'admin' | 'system' | 'user'
  }],
  trackingNumber: { type: String, default: '' },
  shippingPartner: { type: String, default: '' },
  estimatedDelivery: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  discount: { type: Number, required: true },
  expiry: Date,
  createdAt: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  productId: { type: String, required: true },
  productName: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
  userName: String,
  userEmail: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});


const returnRequestSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: { type: String, default: null },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, required: true },
  orderId: { type: String, required: true },
  productName: { type: String, default: '' },
  reason: { type: String, required: true },
  issueDate: { type: String, default: '' },
  description: { type: String, required: true },
  requestType: { type: String, default: 'return' }, // 'return' | 'replace' | 'refund'
  status: { type: String, default: 'pending' }, // pending | approved | rejected | resolved
  adminNote: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  deliveryCharge: { type: Number, default: 49 },
  freeDeliveryThreshold: { type: Number, default: 999 },
  wheelCouponCode: { type: String, default: 'PRADH20' },
  wheelDiscountPercent: { type: Number, default: 20 },
  wheelLabel: { type: String, default: '20% OFF' },
  wheelEnabled: { type: Boolean, default: true },
  // Announcement Bar + CTA Banner settings
  announcementEnabled: { type: Boolean, default: true },
  announcementText: { type: String, default: 'Use code PRADH20 for 20% OFF on your first order — Limited time only' },
  announcementCoupon: { type: String, default: 'PRADH20' },
  announcementDiscount: { type: Number, default: 20 },
  ctaEnabled: { type: Boolean, default: true },
  ctaTitle: { type: String, default: 'Ready to Fuel Your Desi Strength?' },
  ctaDesc: { type: String, default: 'Use this coupon code and get flat 20% off on your first order.' },
  lastUpdated: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Coupon = mongoose.model('Coupon', couponSchema);
const Review = mongoose.model('Review', reviewSchema);
const Setting = mongoose.model('Setting', settingsSchema);
const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);

// ============================================
// JWT CONFIG
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'pradh_desi_fuel_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Please login to continue' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// ============================================
// RAZORPAY SETUP
// ============================================
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('❌ ERROR: Razorpay keys not found in .env file');
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log('✅ Razorpay initialized');

// ============================================
// DELIVERY SETTINGS
// ============================================
let deliverySettings = {
  deliveryCharge: 49,
  freeDeliveryThreshold: 999,
  lastUpdated: new Date(),
};

async function loadDeliverySettingsFromDB() {
  try {
    let setting = await Setting.findOne({ key: 'delivery' });
    if (!setting) {
      setting = new Setting({
        key: 'delivery',
        deliveryCharge: 49,
        freeDeliveryThreshold: 999,
        lastUpdated: new Date(),
      });
      await setting.save();
      console.log('✅ Default delivery settings created in MongoDB');
    }
    deliverySettings.deliveryCharge = setting.deliveryCharge;
    deliverySettings.freeDeliveryThreshold = setting.freeDeliveryThreshold;
    deliverySettings.lastUpdated = setting.lastUpdated;
    console.log('✅ Delivery settings loaded from MongoDB:', deliverySettings);
    return true;
  } catch (error) {
    console.error('❌ Error loading delivery settings:', error);
    return false;
  }
}

async function saveDeliverySettingsToDB() {
  try {
    const result = await Setting.findOneAndUpdate(
      { key: 'delivery' },
      {
        deliveryCharge: deliverySettings.deliveryCharge,
        freeDeliveryThreshold: deliverySettings.freeDeliveryThreshold,
        lastUpdated: new Date(),
      },
      { new: true, upsert: true }
    );
    try {
      fs.writeFileSync(
        'settings.json',
        JSON.stringify(
          {
            deliveryCharge: result.deliveryCharge,
            freeDeliveryThreshold: result.freeDeliveryThreshold,
            lastUpdated: result.lastUpdated,
          },
          null,
          2
        )
      );
    } catch (fileError) {}
    console.log('✅ Delivery settings saved to MongoDB:', result);
    return true;
  } catch (error) {
    console.error('❌ Error saving delivery settings:', error);
    return false;
  }
}

// ============================================
// DELIVERY SETTINGS API
// ============================================
app.get('/api/delivery-charge', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'delivery' });
    if (!setting) {
      return res.json({ success: true, deliveryCharge: 49, freeDeliveryThreshold: 999 });
    }
    res.json({
      success: true,
      deliveryCharge: setting.deliveryCharge,
      freeDeliveryThreshold: setting.freeDeliveryThreshold,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/delivery-charge', verifyAdminToken, async (req, res) => {
  try {
    const { charge, freeThreshold } = req.body;
    if (charge !== undefined && (isNaN(charge) || charge < 0)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery charge' });
    }
    if (freeThreshold !== undefined && (isNaN(freeThreshold) || freeThreshold < 0)) {
      return res.status(400).json({ success: false, message: 'Invalid free threshold' });
    }
    const updateData = { lastUpdated: new Date() };
    if (charge !== undefined) updateData.deliveryCharge = parseFloat(charge);
    if (freeThreshold !== undefined) updateData.freeDeliveryThreshold = parseFloat(freeThreshold);
    const setting = await Setting.findOneAndUpdate({ key: 'delivery' }, updateData, {
      new: true,
      upsert: true,
    });
    deliverySettings.deliveryCharge = setting.deliveryCharge;
    deliverySettings.freeDeliveryThreshold = setting.freeDeliveryThreshold;
    deliverySettings.lastUpdated = setting.lastUpdated;
    try {
      fs.writeFileSync(
        'settings.json',
        JSON.stringify(
          {
            deliveryCharge: setting.deliveryCharge,
            freeDeliveryThreshold: setting.freeDeliveryThreshold,
            lastUpdated: setting.lastUpdated,
          },
          null,
          2
        )
      );
    } catch (fileError) {}
    console.log('✅ Delivery settings updated:', setting);
    res.json({
      success: true,
      message: 'Delivery settings updated',
      settings: {
        deliveryCharge: setting.deliveryCharge,
        freeDeliveryThreshold: setting.freeDeliveryThreshold,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, phone, address, city, pincode } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password required' });
    }
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      city: city || '',
      pincode: pincode || '',
      isVerified: true,
    });
    await user.save();
    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Account created!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
        orderCount: user.orderCount,
        totalSpent: user.totalSpent,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const { phone, address, city, pincode } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (city) user.city = city;
    if (pincode) user.pincode = pincode;
    await user.save();
    res.json({
      success: true,
      message: 'Profile updated!',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        pincode: user.pincode,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/orders', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const orders = await Order.find({
      $or: [
        { userId: String(user._id) },
        { 'customer.phone': user.phone },
        { 'customer.email': user.email },
      ],
    }).sort({ createdAt: -1 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// USER NOTIFICATIONS
// ============================================
app.get('/api/auth/notifications', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const orders = await Order.find({
      $or: [
        { userId: String(user._id) },
        { 'customer.phone': user.phone },
        { 'customer.email': user.email },
      ],
    }).sort({ createdAt: -1 }).limit(10);

    const notifications = [];

    orders.forEach((o) => {
      if (o.status === 'delivered') {
        notifications.push({
          id: 'notif-del-' + o.id,
          type: 'order',
          title: 'Order Delivered! 🎉',
          message: `Your order ${o.id} has been delivered successfully.`,
          time: o.date ? new Date(o.date).toLocaleString('en-IN') : 'Recently',
          unread: false,
          createdAt: o.date,
        });
      } else if (o.status === 'shipped') {
        notifications.push({
          id: 'notif-ship-' + o.id,
          type: 'order',
          title: 'Order Shipped 🚚',
          message: `Your order ${o.id} has been shipped and is on the way.`,
          time: o.date ? new Date(o.date).toLocaleString('en-IN') : 'Recently',
          unread: true,
          createdAt: o.date,
        });
      } else if (o.status === 'paid' || o.status === 'pending') {
        notifications.push({
          id: 'notif-paid-' + o.id,
          type: 'success',
          title: 'Order Confirmed ✅',
          message: `Your order ${o.id} has been confirmed. We'll notify you when it ships.`,
          time: o.date ? new Date(o.date).toLocaleString('en-IN') : 'Recently',
          unread: true,
          createdAt: o.date,
        });
      }
    });

    const coupons = await Coupon.find({
      $or: [{ expiry: { $gte: new Date() } }, { expiry: null }],
    }).limit(3);

    coupons.forEach((c) => {
      notifications.push({
        id: 'notif-coupon-' + c.code,
        type: 'offer',
        title: `${c.discount}% OFF — Use ${c.code}`,
        message: `Limited time offer! Use code ${c.code} at checkout.`,
        time: c.expiry ? `Valid till ${new Date(c.expiry).toLocaleDateString('en-IN')}` : 'Limited time',
        unread: true,
        createdAt: c.createdAt,
      });
    });

    notifications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      success: true,
      notifications,
      unreadCount: notifications.filter((n) => n.unread).length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// OLD USER ROUTES
// ============================================
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).send('All fields required');
    }
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).send('Username or email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).send('Signup successful! Please login.');
  } catch (error) {
    res.status(500).send('Server error');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send('Username and password required');
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send('Invalid username or password');
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).send('Invalid username or password');
    }
    res.status(200).send('Login successful');
  } catch (error) {
    res.status(500).send('Server error');
  }
});

app.get('/api/admin/users', verifyAdminToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/user/:username', verifyAdminToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PRODUCT ROUTES
// ============================================
// NOTE: This route is also used by the PUBLIC storefront (Home.jsx, Products.jsx, ProductDetail.jsx)
// To avoid breaking the storefront, we keep it public BUT only return active products.
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: list ALL products (including inactive) — requires admin token.
app.get('/api/admin/products', verifyAdminToken, async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: get a single product by id (only if active).
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id, status: 'active' });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/products', verifyAdminToken, async (req, res) => {
  try {
    const { name, price, description, category, image, stock, maxPurchasePerUser } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    const product = new Product({
      id: 'PROD' + Date.now().toString().slice(-6),
      name,
      price: parseFloat(price),
      description: description || '',
      category: category || 'General',
      image: image || 'product.jpeg',
      stock: parseInt(stock) || 0,
      maxPurchasePerUser: parseInt(maxPurchasePerUser) || 0,
      status: 'active',
    });
    await product.save();
    res.json({ success: true, message: 'Product added!', product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/products/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, category, image, stock, maxPurchasePerUser, status } = req.body;
    const product = await Product.findOne({ id });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    if (name) product.name = name;
    if (price) product.price = parseFloat(price);
    if (description) product.description = description;
    if (category) product.category = category;
    if (image) product.image = image;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (maxPurchasePerUser !== undefined) product.maxPurchasePerUser = parseInt(maxPurchasePerUser);
    if (status) product.status = status;
    product.updatedAt = new Date();
    await product.save();
    res.json({ success: true, message: 'Product updated!', product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/products/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Product.deleteOne({ id });
    res.json({ success: true, message: 'Product deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// STOCK MANAGEMENT
// ============================================
app.get('/api/products/:id/stock', async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, stock: product.stock || 0, name: product.name });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function updateStockAfterOrder(items) {
  try {
    for (let item of items) {
      const product = await Product.findOne({ id: item.id });
      if (product) {
        const newStock = Math.max(0, (product.stock || 0) - (item.quantity || 1));
        product.stock = newStock;
        await product.save();
        console.log('✅ Stock updated for ' + product.name + ': ' + newStock + ' left');
      }
    }
    return true;
  } catch (error) {
    console.error('Error updating stock:', error);
    return false;
  }
}

// ============================================
// PURCHASE LIMIT (single product)
// ============================================
app.get('/api/products/:id/purchase-limit', async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.query.userId;
    const phone = req.query.phone;

    const product = await Product.findOne({ id: productId });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.maxPurchasePerUser === 0) {
      return res.json({ success: true, maxPurchase: 0, purchased: 0, remaining: 0, canPurchase: true, message: 'Unlimited' });
    }

    let userPhone = phone;
    if (userId) {
      const user = await User.findById(userId);
      if (user) userPhone = user.phone;
    }

    if (!userPhone) {
      return res.json({
        success: true,
        maxPurchase: product.maxPurchasePerUser,
        purchased: 0,
        remaining: product.maxPurchasePerUser,
        canPurchase: true,
        message: 'No orders found',
      });
    }

    const orders = await Order.find({
      'customer.phone': userPhone,
      status: { $in: ['paid', 'shipped', 'delivered'] },
    });

    let totalQuantity = 0;
    orders.forEach((order) => {
      if (order.items) {
        order.items.forEach((item) => {
          if (item.id === productId) {
            totalQuantity += item.quantity || 1;
          }
        });
      }
    });

    const canPurchase = totalQuantity < product.maxPurchasePerUser;
    const remaining = Math.max(0, product.maxPurchasePerUser - totalQuantity);

    res.json({
      success: true,
      maxPurchase: product.maxPurchasePerUser,
      purchased: totalQuantity,
      remaining,
      canPurchase,
      message: canPurchase
        ? 'You can purchase ' + remaining + ' more'
        : '❌ Limit reached! Max ' + product.maxPurchasePerUser + ' allowed.',
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BULK PURCHASE LIMITS (cart ke liye)
// ============================================
app.post('/api/purchase-limits/bulk', verifyToken, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ success: false, error: 'productIds array required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const prevOrders = await Order.find({
      $or: [
        { userId: String(user._id) },
        { 'customer.phone': user.phone },
        { 'customer.email': user.email },
      ],
      status: { $in: ['paid', 'shipped', 'delivered'] },
    });

    const products = await Product.find({ id: { $in: productIds } });

    const result = {};
    products.forEach((product) => {
      const productId = product.id;

      let alreadyBought = 0;
      prevOrders.forEach((o) => {
        (o.items || []).forEach((i) => {
          if (i.id === productId) alreadyBought += (i.quantity || 1);
        });
      });

      const maxPurchase = product.maxPurchasePerUser || 0;
      const canPurchase = maxPurchase === 0 || alreadyBought < maxPurchase;
      const remaining = maxPurchase === 0 ? 999 : Math.max(0, maxPurchase - alreadyBought);

      result[productId] = {
        maxPurchase,
        purchased: alreadyBought,
        remaining,
        canPurchase,
        unlimited: maxPurchase === 0,
      };
    });

    res.json({ success: true, limits: result });
  } catch (error) {
    console.error('Bulk limit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ORDER ROUTES
// ============================================
// Admin: list ALL orders (with full customer PII) — requires admin token.
// Kept the legacy path /get-orders for backward compat with the admin frontend,
// but now protected. Frontend should migrate to /api/admin/orders.
app.get('/get-orders', verifyAdminToken, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ VALID STATUS TRANSITIONS — prevent invalid jumps
const VALID_TRANSITIONS = {
  'pending': ['confirmed', 'cancelled', 'paid'],
  'paid': ['confirmed', 'cancelled'],
  'confirmed': ['packed', 'cancelled'],
  'packed': ['shipped', 'cancelled'],
  'shipped': ['out_for_delivery', 'delivered'],
  'out_for_delivery': ['delivered'],
  'delivered': ['return_requested'],
  'return_requested': ['returned', 'rejected'],
  'returned': ['refund_initiated'],
  'refund_initiated': ['refunded'],
  'refunded': [],
  'cancelled': [],
  'rejected': [],
};

// ✅ STATUS DISPLAY INFO
const STATUS_INFO = {
  'pending': { label: 'Order Placed', icon: 'fa-box', color: '#C49A45', desc: 'Your order has been placed' },
  'paid': { label: 'Payment Confirmed', icon: 'fa-credit-card', color: '#22c55e', desc: 'Payment verified successfully' },
  'confirmed': { label: 'Order Confirmed', icon: 'fa-check-circle', color: '#22c55e', desc: 'We confirmed your order' },
  'packed': { label: 'Packed', icon: 'fa-box-open', color: '#C49A45', desc: 'Your order is packed and ready' },
  'shipped': { label: 'Shipped', icon: 'fa-truck', color: '#8A5A3C', desc: 'Your order is on the way! 🚚' },
  'out_for_delivery': { label: 'Out for Delivery', icon: 'fa-map-pin', color: '#A67C2E', desc: 'Delivery agent is on the way' },
  'delivered': { label: 'Delivered', icon: 'fa-check-circle', color: '#22c55e', desc: 'Order delivered successfully! 🎉' },
  'cancelled': { label: 'Cancelled', icon: 'fa-ban', color: '#ef4444', desc: 'Order was cancelled' },
  'return_requested': { label: 'Return Requested', icon: 'fa-undo', color: '#f59e0b', desc: 'Return request submitted' },
  'returned': { label: 'Returned', icon: 'fa-undo', color: '#8b5cf6', desc: 'Product returned successfully' },
  'refund_initiated': { label: 'Refund Initiated', icon: 'fa-money-bill-wave', color: '#3b82f6', desc: 'Refund process started' },
  'refunded': { label: 'Refunded', icon: 'fa-check-circle', color: '#22c55e', desc: 'Refund completed successfully' },
  'rejected': { label: 'Return Rejected', icon: 'fa-times', color: '#ef4444', desc: 'Return request rejected' },
};

// ✅ NORMAL DELIVERY FLOW (for timeline display)
const DELIVERY_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

// ✅ EXCEPTIONAL STATUSES (shown separately, not in normal timeline)
const EXCEPTIONAL_STATUSES = ['cancelled', 'return_requested', 'returned', 'refund_initiated', 'refunded', 'rejected'];

// Admin: change order status — ENHANCED with tracking history + validation
app.put('/api/orders/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellation_reason } = req.body;

    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    // ✅ Validate status transition
    if (status && status !== order.status) {
      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot change status from "${order.status}" to "${status}". Valid transitions: ${allowed.join(', ') || 'none'}`,
        });
      }

      // Add to tracking history
      const info = STATUS_INFO[status] || { desc: `Status updated to ${status}` };
      order.trackingHistory.push({
        status,
        timestamp: new Date(),
        description: info.desc,
        updatedBy: 'admin',
      });
      order.status = status;
    }

    if (cancellation_reason) order.cancellation_reason = cancellation_reason;
    if (status === 'cancelled' && !order.cancelled_at) order.cancelled_at = new Date();

    await order.save();
    console.log(`✅ Order ${id} status → ${order.status} (by admin)`);
    res.json({ success: true, message: 'Order updated!', order });
  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ NEW: Admin update shipping info (tracking number, partner, ETA)
app.put('/api/orders/:id/tracking', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNumber, shippingPartner, estimatedDelivery } = req.body;

    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber.trim();
    if (shippingPartner !== undefined) order.shippingPartner = shippingPartner.trim();
    if (estimatedDelivery !== undefined) {
      order.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    }

    await order.save();
    console.log(`✅ Order ${id} shipping info updated: ${trackingNumber} / ${shippingPartner}`);
    res.json({ success: true, message: 'Shipping info updated!', order });
  } catch (error) {
    console.error('Shipping update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ============================================
// CANCEL ORDER (user)
// ============================================
app.post('/api/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Ownership check
    const isOwner =
      order.userId === String(user._id) ||
      order.customer?.phone === user.phone ||
      order.customer?.email === user.email;

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }

    // Can only cancel if pending/paid (not shipped/delivered/cancelled)
    if (!['pending', 'paid'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order with status "${order.status}". Only pending/paid orders can be cancelled.`,
      });
    }

    order.status = 'cancelled';
    order.cancellation_reason = reason?.trim() || 'Cancelled by user';
    order.cancelled_at = new Date();
    await order.save();

    // Restore stock
    for (const item of order.items || []) {
      const product = await Product.findOne({ id: item.id });
      if (product) {
        product.stock = (product.stock || 0) + (item.quantity || 1);
        await product.save();
      }
    }

    // Update user stats
    if (user.orderCount > 0) user.orderCount -= 1;
    if (user.totalSpent > 0) {
      user.totalSpent = Math.max(0, (user.totalSpent || 0) - (order.total || 0));
    }
    await user.save();

    console.log(`✅ Order ${id} cancelled by user ${user.username}. Reason: ${order.cancellation_reason}`);
    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// REQUEST RETURN (user) — only for delivered orders
// ============================================
app.post('/api/orders/:id/return', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const order = await Order.findOne({ id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isOwner =
      order.userId === String(user._id) ||
      order.customer?.phone === user.phone ||
      order.customer?.email === user.email;

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be returned',
      });
    }

    // 7-day return window check
    const deliveredAt = order.date ? new Date(order.date) : new Date(order.createdAt);
    const daysSinceDelivered = Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceDelivered > 7) {
      return res.status(400).json({
        success: false,
        message: 'Return window (7 days) has expired',
      });
    }

    // Mark as return requested (we'll track in a field)
    order.status = 'return_requested';
    order.cancellation_reason = reason?.trim() || 'Return requested by user';
    order.cancelled_at = new Date();
    await order.save();

    console.log(`📦 Return requested for ${id} by ${user.username}. Reason: ${order.cancellation_reason}`);
    res.json({ success: true, message: 'Return requested successfully. We will contact you soon.', order });
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// COUPON ROUTES
// ============================================
// Admin: list ALL coupons (including expired) — requires admin token.
app.get('/api/coupons', verifyAdminToken, async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: create a new coupon — requires admin token.
app.post('/api/coupons', verifyAdminToken, async (req, res) => {
  try {
    const { code, discount, expiry } = req.body;
    if (!code || !discount) return res.status(400).json({ success: false, error: 'Code and discount required' });
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ success: false, error: 'Coupon already exists' });
    const coupon = new Coupon({ code: code.toUpperCase(), discount: parseInt(discount), expiry: expiry || null });
    await coupon.save();
    res.json({ success: true, message: 'Coupon created!', coupon });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, amount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.json({ valid: false, message: 'Invalid coupon' });
    if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
      return res.json({ valid: false, message: 'Coupon expired' });
    }
    const discountAmount = amount ? amount * (coupon.discount / 100) : 0;
    res.json({ valid: true, coupon, discount: coupon.discount, discountAmount, message: coupon.discount + '% off applied!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: delete a coupon — requires admin token.
app.delete('/api/coupons/:code', verifyAdminToken, async (req, res) => {
  try {
    const { code } = req.params;
    await Coupon.deleteOne({ code: code.toUpperCase() });
    res.json({ success: true, message: 'Coupon deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET APPROVED REVIEWS FOR A PRODUCT
// ============================================
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({
      productId,
      status: 'approved',
    }).sort({ createdAt: -1 });

    const total = reviews.length;
    const avgRating = total > 0
      ? Number((reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1))
      : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) distribution[r.rating]++;
    });

    res.json({
      success: true,
      reviews,
      total,
      avgRating,
      distribution,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET RATINGS FOR MULTIPLE PRODUCTS (bulk)
// ============================================
app.get('/api/reviews/ratings/all', async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' }).lean();
    const allProducts = await Product.find().lean();

    console.log(`📊 Bulk ratings: ${reviews.length} approved reviews, ${allProducts.length} products`);

    const idLookup = {};
    allProducts.forEach((p) => {
      const canonical = p.id || String(p._id);
      idLookup[String(p._id)] = canonical;
      if (p.id) idLookup[p.id] = canonical;
    });

    const agg = {};
    const unmapped = [];

    reviews.forEach((r) => {
      const rawPid = String(r.productId || '').trim();
      if (!rawPid) return;
      const canonicalPid = idLookup[rawPid] || rawPid;
      if (!idLookup[rawPid]) unmapped.push(rawPid);

      if (!agg[canonicalPid]) agg[canonicalPid] = { sum: 0, count: 0 };
      agg[canonicalPid].sum += r.rating;
      agg[canonicalPid].count += 1;
    });

    const result = {};
    Object.entries(agg).forEach(([pid, { sum, count }]) => {
      const payload = {
        avgRating: count > 0 ? Number((sum / count).toFixed(1)) : 0,
        totalReviews: count,
      };
      result[pid] = payload;

      const product = allProducts.find(
        (p) => String(p._id) === pid || p.id === pid
      );
      if (product) {
        result[String(product._id)] = payload;
        if (product.id) result[product.id] = payload;
      }
    });

    console.log(`✅ Ratings keys returned:`, Object.keys(result));
    if (unmapped.length > 0) {
      console.log(`⚠️ Unmatched productIds in reviews:`, [...new Set(unmapped)]);
    }

    res.json({ success: true, ratings: result });
  } catch (error) {
    console.error('❌ Bulk ratings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// REVIEW ROUTES
// ============================================
// Admin: list ALL reviews (including pending) — requires admin token.
app.get('/api/reviews', verifyAdminToken, async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, productName, rating, comment, userName } = req.body;
    if (!productId || !rating || !comment) {
      return res.status(400).json({ success: false, error: 'Product ID, rating and comment required' });
    }
    const review = new Review({
      id: 'REV' + Date.now().toString().slice(-8),
      productId,
      productName: productName || 'Product',
      rating: parseInt(rating),
      comment,
      userName: userName || 'Anonymous',
      status: 'pending',
    });
    await review.save();
    res.json({ success: true, message: 'Review submitted!', review });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: approve/reject/edit a review — requires admin token.
app.put('/api/reviews/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment, rating } = req.body;
    const review = await Review.findOne({ id });
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    if (status !== undefined) review.status = status;
    if (comment !== undefined) review.comment = comment;
    if (rating !== undefined) review.rating = parseInt(rating);
    review.updatedAt = new Date();
    await review.save();
    res.json({ success: true, message: 'Review updated!', review });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: delete a review — requires admin token.
app.delete('/api/reviews/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    await Review.deleteOne({ id });
    res.json({ success: true, message: 'Review deleted!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/reviews/stats/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId, status: 'approved' });
    const stats = {
      total: reviews.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      stats.averageRating = (totalRating / reviews.length).toFixed(1);
      reviews.forEach((r) => {
        if (stats.ratingDistribution[r.rating]) stats.ratingDistribution[r.rating]++;
      });
    }
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// RETURN / REPLACE REQUEST ROUTES
// ============================================

// ✅ CREATE — user submits request (login optional)
app.post('/api/return-requests', async (req, res) => {
  try {
    const { name, email, phone, orderId, productName, reason, issueDate, description, requestType } = req.body;

    if (!name || !phone || !orderId || !reason || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Optional: link to logged-in user if token present
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = String(decoded.id);
      } catch {}
    }

    const request = new ReturnRequest({
      id: 'RET-' + Date.now().toString().slice(-8),
      userId,
      name: name.trim(),
      email: (email || '').trim(),
      phone: phone.trim(),
      orderId: orderId.trim(),
      productName: (productName || '').trim(),
      reason: reason.trim(),
      issueDate: issueDate || '',
      description: description.trim(),
      requestType: requestType || 'return',
      status: 'pending',
    });

    await request.save();
    console.log(`📦 Return request created: ${request.id} by ${request.name}`);

    res.json({ success: true, message: 'Request submitted! We will contact you on WhatsApp within 24 hours.', request });
  } catch (error) {
    console.error('Return request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET ALL (admin) — requires admin token.
app.get('/api/return-requests', verifyAdminToken, async (req, res) => {
  try {
    const requests = await ReturnRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ GET BY ID — admin can view any; user can view own (ownership checked below).
// Auth is optional: if a user token is provided, we verify ownership; if an admin
// token is provided, we allow access; if no token, we require the caller to be admin.
app.get('/api/return-requests/:id', async (req, res) => {
  try {
    const request = await ReturnRequest.findOne({ id: req.params.id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Determine caller identity from token (optional)
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
    let isAdmin = false;
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        isAdmin = decoded.role === 'admin';
        userId = String(decoded.id);
      } catch {}
    }

    // Authorization: admin OR owner (matching userId) OR same phone
    const isOwner =
      (userId && request.userId === userId) ||
      (userId && false); // phone matching would require fetching the user; keep simple
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this request' });
    }

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ UPDATE STATUS (admin approve/reject) — requires admin token.
app.put('/api/return-requests/:id', verifyAdminToken, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const request = await ReturnRequest.findOne({ id: req.params.id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (status && ['pending', 'approved', 'rejected', 'resolved'].includes(status)) {
      request.status = status;
    }
    if (adminNote !== undefined) request.adminNote = adminNote;
    request.updatedAt = new Date();
    await request.save();

    console.log(`✅ Return request ${request.id} → ${request.status}`);
    res.json({ success: true, message: 'Request updated', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ DELETE (admin) — requires admin token.
app.delete('/api/return-requests/:id', verifyAdminToken, async (req, res) => {
  try {
    await ReturnRequest.deleteOne({ id: req.params.id });
    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// RAZORPAY ROUTES (LOGIN REQUIRED)
// ============================================
app.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: 'order_' + Date.now(),
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;

    // Signature verify
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // User fetch
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Purchase limit check (server-side)
    const items = orderDetails?.items || [];
    for (const item of items) {
      const product = await Product.findOne({ id: item.id });
      if (!product) continue;

      if (product.maxPurchasePerUser > 0) {
        const prevOrders = await Order.find({
          $or: [
            { userId: String(user._id) },
            { 'customer.phone': user.phone },
            { 'customer.email': user.email },
          ],
          status: { $in: ['paid', 'shipped', 'delivered'] },
        });

        let alreadyBought = 0;
        prevOrders.forEach((o) => {
          (o.items || []).forEach((i) => {
            if (i.id === product.id) alreadyBought += (i.quantity || 1);
          });
        });

        const tryingToBuy = item.quantity || 1;
        const totalAfterPurchase = alreadyBought + tryingToBuy;

        if (totalAfterPurchase > product.maxPurchasePerUser) {
          return res.status(400).json({
            success: false,
            message: `❌ Limit exceeded for ${product.name}. Max ${product.maxPurchasePerUser} allowed per user. You have already bought ${alreadyBought}.`,
          });
        }
      }
    }

    // Save order
    const orderId = 'ORD' + Date.now().toString().slice(-8);
    const newOrder = new Order({
      id: orderId,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      status: 'paid',
      date: new Date(),
      items,
      total: orderDetails?.total || 0,
      deliveryCharge: orderDetails?.deliveryCharge || 0,
      coupon: orderDetails?.coupon || null,
      discount: orderDetails?.discount || 0,
      userId: String(user._id),
      customer: {
        name: orderDetails?.customer?.name || user.username,
        phone: user.phone || orderDetails?.customer?.phone || '',
        email: user.email || orderDetails?.customer?.email || '',
        address: orderDetails?.customer?.address || user.address || '',
        city: orderDetails?.customer?.city || user.city || '',
        pincode: orderDetails?.customer?.pincode || user.pincode || '',
        paymentMethod: orderDetails?.customer?.paymentMethod || 'Razorpay',
      },
    });
    await newOrder.save();

    // Update user stats
    user.orderCount = (user.orderCount || 0) + 1;
    user.totalSpent = (user.totalSpent || 0) + (newOrder.total || 0);
    await user.save();

    // Update stock
    await updateStockAfterOrder(items);

    console.log('✅ Order saved:', orderId);
    res.json({ success: true, message: 'Payment verified!', order: newOrder });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// INVOICE PDF
// ============================================
app.get('/api/invoice/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice-' + order.id + '.pdf');
    doc.pipe(res);

    const gold = '#facc15';
    const dark = '#0f172a';
    const gray = '#64748b';
    const lightGray = '#f8fafc';

    let y = 50;
    doc.fontSize(28).font('Helvetica-Bold').fillColor(gold).text('PRADH DESI FUEL', 50, y, { align: 'center' });
    y += 35;
    doc.fontSize(12).font('Helvetica').fillColor(gray).text('💪 Pure Desi Protein Fuel', 50, y, { align: 'center' });
    y += 30;
    doc.fontSize(24).font('Helvetica-Bold').fillColor(dark).text('INVOICE', 50, y, { align: 'center' });
    y += 20;
    doc.fontSize(10).font('Helvetica').fillColor(gray).text('Invoice #: ' + order.id, 50, y, { align: 'center' });
    y += 30;
    doc.moveTo(50, y).lineTo(550, y).strokeColor(gold).lineWidth(2).stroke();
    y += 25;

    const leftX = 50,
      rightX = 320,
      lineHeight = 20;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(dark).text('ORDER DETAILS', leftX, y);
    y += 18;
    doc.font('Helvetica').fontSize(9).fillColor(gray);
    const orderInfo = [
      ['Order Date:', new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
      ['Payment ID:', order.payment_id || 'N/A'],
      ['Payment Method:', order.customer?.paymentMethod || 'N/A'],
      ['Status:', (order.status || 'Pending').toUpperCase()],
    ];
    let orderY = y;
    orderInfo.forEach(function (pair) {
      doc.text(pair[0], leftX, orderY);
      doc.text(pair[1], leftX + 100, orderY);
      orderY += lineHeight;
    });

    let custY = y;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(dark).text('BILL TO', rightX, custY);
    custY += 18;
    doc.font('Helvetica').fontSize(9).fillColor(gray);
    const cust = order.customer || {};
    const customerLines = [
      cust.name || 'Guest',
      cust.address || 'N/A',
      (cust.city || '') + ' ' + (cust.pincode || ''),
      'Phone: ' + (cust.phone || 'N/A'),
      'Email: ' + (cust.email || 'N/A'),
    ];
    customerLines.forEach(function (line) {
      if (line.trim()) {
        doc.text(line, rightX, custY);
        custY += lineHeight;
      }
    });

    y = Math.max(orderY, custY) + 15;
    doc.moveTo(50, y).lineTo(550, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 20;

    const tableX = 50,
      col1 = 60,
      col2 = 280,
      col3 = 380,
      col4 = 460;
    doc.fillColor(lightGray).rect(tableX, y, 500, 22).fill();
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(9);
    doc.text('Product', col1, y + 5);
    doc.text('Qty', col2, y + 5);
    doc.text('Price', col3, y + 5);
    doc.text('Total', col4, y + 5);
    y += 22;

    let subtotal = 0;
    if (order.items) {
      order.items.forEach(function (item, idx) {
        const total = item.price * item.quantity;
        subtotal += total;
        if (idx % 2 === 0) {
          doc.fillColor('#fafafa').rect(tableX, y, 500, 20).fill();
        }
        doc.fillColor(dark).font('Helvetica').fontSize(9);
        const name = item.name.length > 28 ? item.name.substring(0, 25) + '...' : item.name;
        doc.text(name || 'Product', col1, y + 4);
        doc.text(item.quantity || 1, col2, y + 4);
        doc.text('₹' + item.price.toFixed(0), col3, y + 4);
        doc.text('₹' + total.toFixed(0), col4, y + 4);
        y += 20;
      });
    }

    doc.moveTo(50, y).lineTo(550, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 15;

    const deliveryCharge = order.deliveryCharge || 0;
    const discount = order.discount || 0;
    const grandTotal = subtotal + deliveryCharge - discount;

    const totalX = 500,
      labelX = 400;
    doc.font('Helvetica').fontSize(10);
    doc.fillColor(gray).text('Subtotal:', labelX, y, { align: 'right' });
    doc.fillColor(dark).text('₹' + subtotal.toFixed(0), totalX, y, { align: 'right' });
    y += 22;
    doc.fillColor(gray).text('Delivery:', labelX, y, { align: 'right' });
    doc
      .fillColor(deliveryCharge === 0 ? '#22c55e' : dark)
      .text(deliveryCharge === 0 ? 'FREE' : '₹' + deliveryCharge.toFixed(0), totalX, y, { align: 'right' });
    y += 22;
    if (order.coupon) {
      doc.fillColor(gray).text('Discount (' + order.coupon + '):', labelX, y, { align: 'right' });
      doc.fillColor('#22c55e').text('-₹' + discount.toFixed(0), totalX, y, { align: 'right' });
      y += 22;
    }
    y += 8;
    doc.moveTo(300, y).lineTo(550, y).strokeColor(gold).lineWidth(1.5).stroke();
    y += 10;
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(gold)
      .text('Grand Total:', labelX + 400, y, { align: 'right' })
      .text('₹' + grandTotal.toFixed(0), totalX + 400, y, { align: 'right' });
    y += 30;

    if (order.coupon) {
      doc
        .fillColor('#22c55e')
        .font('Helvetica')
        .fontSize(9)
        .text('🎉 Coupon Applied: ' + order.coupon + ' (' + (order.discount || 0) + '% off)', 50, y);
      y += 20;
    }

    if (order.cancellation_reason) {
      doc.fillColor('#ef4444').font('Helvetica-Bold').fontSize(9).text('⚠️ Cancellation Reason:', 50, y);
      doc.fillColor(gray).font('Helvetica').fontSize(9).text(order.cancellation_reason, 50, y + 14);
      y += 40;
    }

    const statusColors = {
      pending: '#facc15',
      paid: '#22c55e',
      shipped: '#3b82f6',
      delivered: '#8b5cf6',
      cancelled: '#ef4444',
    };
    const statusColor = statusColors[order.status] || gray;
    doc.fillColor(statusColor).roundedRect(50, y, 130, 22, 4).fill();
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('STATUS: ' + (order.status || 'Pending').toUpperCase(), 58, y + 5);
    y += 35;

    const footerY = 770;
    doc.moveTo(50, footerY).lineTo(550, footerY).strokeColor(gold).lineWidth(1).stroke();
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(gray)
      .text('💪 Thank you for choosing PRADH Desi Fuel!', 50, footerY + 12, { align: 'center' })
      .text('📞 +91 8979993655  |  📧 support@pradh.com', 50, footerY + 26, { align: 'center' })
      .text('Generated: ' + new Date().toLocaleString(), 50, footerY + 40, { align: 'center' });

    doc.end();
    console.log('✅ Invoice generated:', orderId);
  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
});

// ============================================
// ORDER TRACKING API
// ============================================
// ✅ ENHANCED ORDER TRACKING — with full tracking history, shipping info
app.get('/api/order/track/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ $or: [{ id: orderId }, { order_id: orderId }] });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // ✅ Build timeline from trackingHistory (if exists) or fall back to status-based
    const currentStatus = order.status;
    const isExceptional = EXCEPTIONAL_STATUSES.includes(currentStatus);

    // ✅ If trackingHistory exists, use it; otherwise build from status
    let historyMap = {};
    if (order.trackingHistory && order.trackingHistory.length > 0) {
      order.trackingHistory.forEach((h) => {
        historyMap[h.status] = { time: h.timestamp, description: h.description, updatedBy: h.updatedBy };
      });
    }

    // ✅ Build normal delivery timeline
    const deliveryTimeline = DELIVERY_FLOW.map((statusKey) => {
      const info = STATUS_INFO[statusKey];
      const history = historyMap[statusKey];
      const isCompleted = DELIVERY_FLOW.indexOf(currentStatus) >= DELIVERY_FLOW.indexOf(statusKey);
      const isCurrent = statusKey === currentStatus;
      return {
        status: info.label,
        statusKey,
        description: info.desc,
        time: history ? history.time : (isCompleted ? (order.trackingHistory?.[0]?.timestamp || order.createdAt || order.date) : null),
        icon: info.icon,
        color: info.color,
        completed: isCompleted,
        current: isCurrent,
        updatedBy: history ? history.updatedBy : (isCompleted ? 'system' : null),
      };
    });

    // ✅ Build exceptional status info (if applicable)
    let exceptionalStatus = null;
    if (isExceptional) {
      const info = STATUS_INFO[currentStatus];
      const history = historyMap[currentStatus];
      exceptionalStatus = {
        status: info.label,
        statusKey: currentStatus,
        description: info.desc,
        time: history ? history.time : (order.cancelled_at || order.updatedAt || order.date),
        icon: info.icon,
        color: info.color,
        reason: order.cancellation_reason || null,
      };
    }

    // ✅ Calculate progress
    let progress = 0;
    if (!isExceptional) {
      const currentIdx = DELIVERY_FLOW.indexOf(currentStatus);
      progress = currentIdx >= 0 ? Math.round(((currentIdx + 1) / DELIVERY_FLOW.length) * 100) : 0;
    } else {
      progress = currentStatus === 'delivered' ? 100 : 0;
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        statusLabel: STATUS_INFO[order.status]?.label || order.status,
        total: order.total,
        date: order.date,
        items: order.items,
        customer: order.customer,
        paymentMethod: order.customer?.paymentMethod || 'N/A',
        paymentId: order.payment_id || null,
      },
      // Shipping info
      trackingNumber: order.trackingNumber || '',
      shippingPartner: order.shippingPartner || '',
      estimatedDelivery: order.estimatedDelivery || null,
      // Timeline
      timeline: deliveryTimeline,
      exceptionalStatus,
      isExceptional,
      currentStatusIndex: DELIVERY_FLOW.indexOf(currentStatus),
      progress,
      // Full history
      trackingHistory: order.trackingHistory || [],
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN LOGIN
// ============================================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'pradhadmin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Gaming1143';

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 Admin login attempt:', { username, ip: req.ip });

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { username, role: 'admin', timestamp: Date.now() },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('✅ Admin login successful:', username);
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: { username, role: 'admin', name: 'PRADH Admin' },
      });
    } else {
      console.log(`❌ Failed admin login attempt: ${username} from ${req.ip}`);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

function verifyAdminToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Admin only.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

app.get('/api/admin/dashboard', verifyAdminToken, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const stats = {
      totalOrders: totalOrders || 0,
      totalProducts: totalProducts || 0,
      totalUsers: totalUsers || 0,
      revenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      pendingOrders: await Order.countDocuments({ status: 'pending' }),
      paidOrders: await Order.countDocuments({ status: 'paid' }),
      shippedOrders: await Order.countDocuments({ status: 'shipped' }),
      deliveredOrders: await Order.countDocuments({ status: 'delivered' }),
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/verify', verifyAdminToken, async (req, res) => {
  res.json({ success: true, message: 'Token is valid', user: req.user });
});

app.post('/api/admin/logout', verifyAdminToken, async (req, res) => {
  res.json({ success: true, message: 'Logout successful' });
});

// ============================================
// WHEEL SETTINGS API
// ============================================
app.get('/api/wheel-settings', async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'wheel' });
    if (!setting) {
      setting = await Setting.create({
        key: 'wheel',
        wheelCouponCode: 'PRADH20',
        wheelDiscountPercent: 20,
        wheelLabel: '20% OFF',
        wheelEnabled: true,
      });
    }
    res.json({
      success: true,
      couponCode: setting.wheelCouponCode || 'PRADH20',
      discountPercent: setting.wheelDiscountPercent || 20,
      label: setting.wheelLabel || '20% OFF',
      enabled: setting.wheelEnabled !== false,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/wheel-settings', verifyAdminToken, async (req, res) => {
  try {
    const { couponCode, discountPercent, label, enabled } = req.body;
    const update = { lastUpdated: new Date() };
    if (couponCode !== undefined) update.wheelCouponCode = couponCode.toUpperCase().trim();
    if (discountPercent !== undefined) update.wheelDiscountPercent = parseInt(discountPercent);
    if (label !== undefined) update.wheelLabel = label.trim();
    if (enabled !== undefined) update.wheelEnabled = enabled;
    const setting = await Setting.findOneAndUpdate({ key: 'wheel' }, update, { new: true, upsert: true });
    console.log('✅ Wheel settings updated:', setting.wheelCouponCode, setting.wheelDiscountPercent + '%', setting.wheelEnabled);
    res.json({
      success: true,
      message: 'Wheel settings updated!',
      settings: {
        couponCode: setting.wheelCouponCode,
        discountPercent: setting.wheelDiscountPercent,
        label: setting.wheelLabel,
        enabled: setting.wheelEnabled,
      },
    });
  } catch (error) {
    console.error('Wheel settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ANNOUNCEMENT + CTA SETTINGS API
// ============================================
app.get('/api/announcement-settings', async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'announcement' });
    if (!setting) {
      setting = await Setting.create({
        key: 'announcement',
        announcementEnabled: true,
        announcementText: 'Use code PRADH20 for 20% OFF on your first order — Limited time only',
        announcementCoupon: 'PRADH20',
        announcementDiscount: 20,
        ctaEnabled: true,
        ctaTitle: 'Ready to Fuel Your Desi Strength?',
        ctaDesc: 'Use this coupon code and get flat 20% off on your first order.',
      });
    }
    res.json({
      success: true,
      announcementEnabled: setting.announcementEnabled !== false,
      announcementText: setting.announcementText || 'Use code PRADH20 for 20% OFF on your first order — Limited time only',
      announcementCoupon: setting.announcementCoupon || 'PRADH20',
      announcementDiscount: setting.announcementDiscount || 20,
      ctaEnabled: setting.ctaEnabled !== false,
      ctaTitle: setting.ctaTitle || 'Ready to Fuel Your Desi Strength?',
      ctaDesc: setting.ctaDesc || 'Use this coupon code and get flat 20% off on your first order.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/announcement-settings', verifyAdminToken, async (req, res) => {
  try {
    const { announcementEnabled, announcementText, announcementCoupon, announcementDiscount, ctaEnabled, ctaTitle, ctaDesc } = req.body;
    const update = { lastUpdated: new Date() };
    if (announcementEnabled !== undefined) update.announcementEnabled = announcementEnabled;
    if (announcementText !== undefined) update.announcementText = announcementText.trim();
    if (announcementCoupon !== undefined) update.announcementCoupon = announcementCoupon.toUpperCase().trim();
    if (announcementDiscount !== undefined) update.announcementDiscount = parseInt(announcementDiscount);
    if (ctaEnabled !== undefined) update.ctaEnabled = ctaEnabled;
    if (ctaTitle !== undefined) update.ctaTitle = ctaTitle.trim();
    if (ctaDesc !== undefined) update.ctaDesc = ctaDesc.trim();
    const setting = await Setting.findOneAndUpdate({ key: 'announcement' }, update, { new: true, upsert: true });
    console.log('✅ Announcement settings updated:', setting.announcementEnabled, setting.ctaEnabled);
    res.json({
      success: true,
      message: 'Announcement settings updated!',
      settings: {
        announcementEnabled: setting.announcementEnabled,
        announcementText: setting.announcementText,
        announcementCoupon: setting.announcementCoupon,
        announcementDiscount: setting.announcementDiscount,
        ctaEnabled: setting.ctaEnabled,
        ctaTitle: setting.ctaTitle,
        ctaDesc: setting.ctaDesc,
      },
    });
  } catch (error) {
    console.error('Announcement settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LOAD SETTINGS ON STARTUP
// ============================================
(async function initSettings() {
  await loadDeliverySettingsFromDB();
})();

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log('\n🚀 Server running on http://localhost:' + PORT);
  console.log('📦 Database: MongoDB Atlas');
  console.log('✅ Current Delivery Charge: ₹' + deliverySettings.deliveryCharge);
  console.log('✅ Free Delivery Threshold: ₹' + deliverySettings.freeDeliveryThreshold);
  console.log('✅ Server is ready!\n');
});















// (wheel settings routes are above, before app.listen)
