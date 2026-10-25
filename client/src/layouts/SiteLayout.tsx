import { Link, NavLink, Outlet } from "react-router-dom";
import { PoweredByArcher } from "../components/PoweredByARCHER.js";

export function SiteLayout() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link to="/" className="brand-lockup" aria-label="RapidStrike home">
          <span className="brand-mark" aria-hidden="true">RS//</span>
          <span className="brand-copy"><strong>RAPIDSTRIKE</strong><small>AIR UNIVERSITY · ISLAMABAD</small></span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <NavLink to="/compete">Compete</NavLink>
          <NavLink to="/leaderboard">Rankings</NavLink>
          <NavLink to="/display">Projector</NavLink>
        </nav>
        <Link to="/admin" className="admin-link">Control <span aria-hidden="true">↗</span></Link>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div className="site-footer-intro">
          <Link to="/" className="footer-brand"><span className="footer-brand-mark">RS//</span> RAPIDSTRIKE</Link>
          <p>Precision under pressure.<br />The RapidStrike Championship at Air University, Islamabad.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <span className="eyebrow">THE CHAMPIONSHIP</span>
          <Link to="/compete">Enter the competition</Link>
          <Link to="/leaderboard">RapidStrike Rankings</Link>
          <Link to="/display">Projector display</Link>
        </nav>
        <nav className="footer-links footer-organizer" aria-label="Organizer navigation">
          <span className="eyebrow">ORGANIZERS</span>
          <Link to="/admin">RapidStrike Control <span aria-hidden="true">↗</span></Link>
        </nav>
      </footer>
      <PoweredByArcher />
      <div className="lower-footer">
        <span>© {new Date().getFullYear()} RAPIDSTRIKE <i>/</i> AIR UNIVERSITY, ISLAMABAD</span>
        <span>BUILT FOR THE MOMENT. SCORED BY THE SERVER.</span>
      </div>
    </div>
  );
}
