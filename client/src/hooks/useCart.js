import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const useCart = () => {
  const [cartCount, setCartCount] = useState(0);

  const getCart = () => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || [];
    } catch {
      return [];
    }
  };

  const saveCart = (cart) => {
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
  };

  const addToCart = (product) => {
    const cart = getCart();
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: 1,
        variant: product.category || '',
        image: product.image || '/product.jpeg',
      });
    }

    saveCart(cart);
    toast.success(`${product.name} added to cart! 🛒`);
  };

  const updateBadge = () => {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    setCartCount(total);
  };

  useEffect(() => {
    updateBadge();
    const handleStorage = () => updateBadge();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { cartCount, addToCart, getCart, saveCart, updateBadge };
};