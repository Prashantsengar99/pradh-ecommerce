import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Signup from './pages/Signup';
import About from './pages/About';
import Contact from './pages/Contact';
import Payment from './pages/Payment';
import Account from './pages/Account';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/Admin/AdminPanel';
import AdminLogin from './pages/Admin/AdminLogin';
import NotFound from './pages/NotFound';
import DiscountWheel from './components/common/DiscountWheel';

// 🎨 Festival Theme System (admin-controlled only — no user selector)
import { FestivalProvider, useFestival } from './festival/FestivalProvider';
import FestivalIntro from './festival/FestivalIntro';

import './styles/global.css';
import './festival/festival.css';
import './styles/darkmode-pro.css';

// Inner component that uses festival context
const AppContent = () => {
  const { themeInfo } = useFestival();
  const isFestival = themeInfo.isFestival;
  const [bannerClosed, setBannerClosed] = useState(false);

  return (
    <>
      {/* 🎬 Cinematic festival intro — shows on EVERY refresh */}
      <FestivalIntro />

      {/* 🎉 Festival banner — full-width elegant ribbon */}
      {isFestival && !bannerClosed && (
        <div className="festival-banner">
          <span className="festival-banner-emoji">{themeInfo.emoji}</span>
          <span className="festival-banner-text">Happy {themeInfo.name}</span>
          <span className="festival-banner-brand">PRADH DESI FUEL</span>
          <span className="festival-banner-emoji">{themeInfo.emoji}</span>
          <button
            className="festival-banner-close"
            onClick={() => setBannerClosed(true)}
            aria-label="Close banner"
          >
            <FaTimes />
          </button>
        </div>
      )}

      <div className="min-h-screen flex flex-col">
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
            <Route path="/contact" element={<Contact />} />
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
    </>
  );
};

function App() {
  return (
    <FestivalProvider>
      <BrowserRouter>
        <Toaster position="bottom-right" />
        <AppContent />
      </BrowserRouter>
    </FestivalProvider>
  );
}

export default App;
