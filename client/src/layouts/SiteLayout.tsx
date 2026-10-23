import { Link, NavLink, Outlet } from "react-router-dom";

export function SiteLayout() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand-lockup" aria-label="Tech Vanguard home">
          <span className="brand-mark" aria-hidden="true">TV</span>
          <span className="brand-copy"><strong>TECH VANGUARD</strong><small>AIR UNIVERSITY · ISLAMABAD</small></span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <NavLink to="/compete">Compete</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/display">Projector</NavLink>
        </nav>
        <Link to="/admin" className="admin-link">Organizers <span aria-hidden="true">↗</span></Link>
      </header>
      <Outlet />
      <footer className="site-footer">
        <span>TECH VANGUARD <span className="footer-dot">/</span> AIR UNIVERSITY</span>
        <span>Islamabad, Pakistan</span>
      </footer>
    </div>
  );
}
