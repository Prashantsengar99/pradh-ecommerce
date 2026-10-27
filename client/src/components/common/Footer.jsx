import '../../styles/footer.css';

const Footer = () => {
  return (
    <footer>
      <div className="footer-content">
        <p>
          &copy; 2026 <span>PRADH</span>. All Rights Reserved.
        </p>
        <a
          href="https://forms.gle/wybyGnhVKrNikMJV6"
          target="_blank"
          rel="noopener noreferrer"
          className="feedback-link"
        >
          <i className="fas fa-pen"></i> Share Your Feedback
        </a>
      </div>
    </footer>
  );
};

export default Footer;