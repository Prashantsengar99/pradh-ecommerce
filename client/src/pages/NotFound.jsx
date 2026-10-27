import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="max-w-7xl mx-auto px-4 py-20 text-center">
    <h1 className="text-6xl font-black text-yellow-400">404</h1>
    <p className="text-slate-400 mt-4 mb-6">Page not found</p>
    <Link
      to="/"
      className="inline-block px-6 py-3 bg-yellow-400 text-slate-900 font-semibold rounded-lg no-underline hover:bg-yellow-500 transition"
    >
      Back to Home
    </Link>
  </div>
);
export default NotFound;