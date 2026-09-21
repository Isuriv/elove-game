import { NavLink, Outlet } from "react-router-dom";
import { Starfield } from "./Starfield";

export function Shell() {
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <Starfield />
      <div className="veil" aria-hidden="true" />
      <header className="nav">
        <NavLink to="/" className="brand" end>
          Dark Matter
        </NavLink>
        <nav className="nav-links" aria-label="Primary">
          <NavLink to="/strategy">Wellfront</NavLink>
          <NavLink to="/story">The Early Voice</NavLink>
          <NavLink to="/mind">Strategy Mind</NavLink>
        </nav>
      </header>
      <main id="content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>Dark Matter</span>
        <span>Elove Game Company</span>
      </footer>
    </>
  );
}
