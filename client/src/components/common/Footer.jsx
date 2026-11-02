import { Link } from 'react-router-dom';
import '../../styles/footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="pf-footer">
      <div className="pf-footer-accent" aria-hidden="true" />

      <div className="pf-footer-main">
        <div className="pf-footer-inner">
          {/* Brand */}
          <div className="pf-footer-brand-col">
            <Link to="/" className="pf-footer-logo" aria-label="PRADH Desi Fuel home">
              <span className="pf-footer-logo-mark" aria-hidden="true">P</span>
              <span className="pf-footer-logo-text">
                <span className="brand">PRADH<span>.</span></span>
                <span className="tagline">Desi Fuel</span>
              </span>
            </Link>
            <p className="pf-footer-desc">
              Traditional Indian nutrition, handcrafted with sand-roasted grains,
              premium nuts, and Ayurvedic herbs. No chemicals, no preservatives.
            </p>
            <div className="pf-footer-social">
              <a href="#" aria-label="Instagram" className="pf-social-btn"><i className="fab fa-instagram"></i></a>
              <a href="#" aria-label="Facebook" className="pf-social-btn"><i className="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="YouTube" className="pf-social-btn"><i className="fab fa-youtube"></i></a>
              <a href="#" aria-label="WhatsApp" className="pf-social-btn"><i className="fab fa-whatsapp"></i></a>
            </div>
          </div>

          {/* Shop */}
          <div className="pf-footer-col">
            <h4 className="pf-footer-heading">Shop</h4>
            <ul className="pf-footer-list">
              <li><Link to="/products">Premium Blend</Link></li>
              <li><Link to="/products">Classic Blend</Link></li>
              <li><Link to="/products">Herbal Blend</Link></li>
              <li><Link to="/products">Combo Packs</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="pf-footer-col">
            <h4 className="pf-footer-heading">Company</h4>
            <ul className="pf-footer-list">
              <li><Link to="/about">Our Story</Link></li>
              <li><Link to="/about">Ingredients</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li>
                <a
                  href="https://forms.gle/wybyGnhVKrNikMJV6"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share Feedback
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="pf-footer-bottom">
        <p className="pf-footer-copy">
          &copy; {currentYear} <span>PRADH</span>. All Rights Reserved.
        </p>
        <a
          href="https://forms.gle/wybyGnhVKrNikMJV6"
          target="_blank"
          rel="noopener noreferrer"
          className="pf-feedback-link"
        >
          <i className="fas fa-pen"></i> Share Your Feedback
        </a>
      </div>
    </footer>
  );
};

export default Footer;