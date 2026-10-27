import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Signup from './pages/Signup';
import About from './pages/About';
import Contact from './pages/Contact';           // ⬅️ NAYA
import Payment from './pages/Payment';
import Account from './pages/Account';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/Admin/AdminPanel';
import AdminLogin from './pages/Admin/AdminLogin';
import NotFound from './pages/NotFound';
import DiscountWheel from './components/common/DiscountWheel';

import './styles/global.css';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" />
      <div className="min-h-screen flex flex-col bg-slate-900">
        <Navbar />
        <DiscountWheel />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />        {/* ⬅️ NAYA */}
            <Route path="/cart" element={<Cart />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/account" element={<Account />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/panel" element={<AdminPanel />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="*" element={<NotFound />} />

          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;