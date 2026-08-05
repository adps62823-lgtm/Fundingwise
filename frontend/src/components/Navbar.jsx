import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BRAND } from "../config/brand";

const baseLink = "rounded-[4px] px-4 py-2 text-sm font-medium transition hover:bg-[#eef4ff]";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[#c9c9c9] bg-white shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
      <div className="fw-container flex items-center justify-between gap-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={BRAND.logoIconDark} alt={BRAND.name} className="h-10 w-10 rounded-[4px]" />
          <div className="hidden sm:block">
            <div className="text-lg font-semibold leading-tight text-[#181818]">{BRAND.name}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#747474]">{BRAND.tagline}</div>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          {!user && (
            <>
              <NavLink className={baseLink} to="/">Home</NavLink>
              <NavLink className={baseLink} to="/map">Map</NavLink>
              <NavLink className={baseLink} to="/pricing">Pricing</NavLink>
              <NavLink className={baseLink} to="/login">Login</NavLink>
            </>
          )}
          {user?.role === "citizen" && (
            <>
              <NavLink className={baseLink} to="/">Home</NavLink>
              <NavLink className={baseLink} to="/map">Map</NavLink>
              <NavLink className={baseLink} to="/my-reports">My Reports</NavLink>
              <button className={baseLink} onClick={logout}>Logout</button>
            </>
          )}
          {user?.role === "official" && (
            <>
              <NavLink className={baseLink} to="/dashboard">Command Center</NavLink>
              <button className={baseLink} onClick={logout}>Logout</button>
            </>
          )}
          {user?.role === "admin" && (
            <>
              <NavLink className={baseLink} to="/admin">Admin</NavLink>
              <button className={baseLink} onClick={logout}>Logout</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
