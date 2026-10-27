import { Link } from 'react-router-dom';
import { FaShoppingCart, FaEye, FaTag } from 'react-icons/fa';
import { useCart } from '../../hooks/useCart';

const ProductCard = ({ product, index = 0 }) => {
  const { addToCart } = useCart();

  const badgeClass =
    product.badge === 'sold-out'
      ? 'bg-red-500 text-white'
      : product.badge === 'hot'
      ? 'bg-orange-500 text-white'
      : product.badge === 'new'
      ? 'bg-green-500 text-white'
      : 'bg-yellow-400 text-slate-900';

  const badgeText =
    product.badge === 'sold-out'
      ? 'Sold Out'
      : product.badge === 'hot'
      ? '🔥 Hot'
      : product.badge === 'new'
      ? '✨ New'
      : '';

  const rating = Math.floor(product.rating || 4.5);
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const inStock = (product.stock ?? 50) > 0;

  return (
    <div
      className="bg-slate-800 rounded-2xl overflow-hidden border border-white/5 hover:border-yellow-400/20 hover:-translate-y-2 hover:shadow-2xl transition-all relative group"
      style={{ animation: `fadeInUp 0.6s ease ${index * 0.05}s both` }}
    >
      {/* Badge */}
      {badgeText && (
        <span
          className={`absolute top-3 left-3 px-3.5 py-1 rounded-full text-[11px] font-bold uppercase z-10 ${badgeClass}`}
        >
          {badgeText}
        </span>
      )}

      {/* Image */}
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden aspect-square bg-slate-950">
        <img
          src={product.image || '/product.jpeg'}
          alt={product.name}
          loading="lazy"
          onError={(e) => (e.target.src = '/product.jpeg')}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            // Quick view navigation
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-black/80 backdrop-blur border border-white/10 rounded-full text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all hidden lg:flex items-center gap-2 hover:bg-yellow-400 hover:text-slate-900"
        >
          <FaEye /> Quick View
        </button>
      </Link>

      {/* Info */}
      <div className="p-4">
        <Link to={`/product/${product.id}`} className="no-underline">
          <h3 className="text-white font-semibold text-sm mb-1 hover:text-yellow-400 transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="text-slate-400 text-xs mb-2 flex items-center gap-1">
          <FaTag className="text-[10px]" />
          {product.category?.charAt(0).toUpperCase() + product.category?.slice(1) || 'Blend'}
        </p>

        <div className="flex items-center gap-1 mb-2">
          <span className="text-yellow-400 text-xs">{stars}</span>
          <span className="text-slate-400 text-xs ml-1">({product.reviews || 0})</span>
        </div>

        <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">
          {product.description || ''}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="text-yellow-400 font-extrabold text-xl">
            ₹{product.price}
            {product.originalPrice && (
              <span className="text-slate-500 text-xs line-through ml-2 font-normal">
                ₹{product.originalPrice}
              </span>
            )}
          </span>

          <button
            onClick={(e) => {
              e.preventDefault();
              addToCart(product);
            }}
            disabled={!inStock}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all border-0 ${
              inStock
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-yellow-400/40'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {inStock ? (
              <>
                <FaShoppingCart /> Add
              </>
            ) : (
              'Sold Out'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;