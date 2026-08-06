import React, { Suspense, lazy } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary";
import Footer from "./components/Footer";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BRAND } from "./config/brand";

import HomeLanding from "./pages/public/HomeLanding";
const MapPortal = lazy(() => import("./pages/public/MapPortal"));
const ProjectDetail = lazy(() => import("./pages/public/ProjectDetail"));
const TransparencyTimeline = lazy(() => import("./pages/public/TransparencyTimeline"));
const ReportForm = lazy(() => import("./pages/public/ReportForm"));
const MyReports = lazy(() => import("./pages/public/MyReports"));
const Pricing = lazy(() => import("./pages/org/Pricing"));
const OrgSignup = lazy(() => import("./pages/org/OrgSignup"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const CommandDashboard = lazy(() => import("./pages/official/CommandDashboard"));
const ProjectUpload = lazy(() => import("./pages/official/ProjectUpload"));
const AIReviewBudget = lazy(() => import("./pages/official/AIReviewBudget"));
const AIReviewSchedule = lazy(() => import("./pages/official/AIReviewSchedule"));
const LaborConsole = lazy(() => import("./pages/official/LaborConsole"));
const InventoryConsole = lazy(() => import("./pages/official/InventoryConsole"));
const ContractorSelection = lazy(() => import("./pages/official/ContractorSelection"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const OrgDetail = lazy(() => import("./pages/admin/OrgDetail"));

const shellLinks = {
  public: [
    { to: "/", label: "Home" },
    { to: "/map", label: "Public Map" },
    { to: "/report/new", label: "Submit Report" },
    { to: "/pricing", label: "Pricing" },
  ],
  citizen: [
    { to: "/", label: "Home" },
    { to: "/map", label: "Public Map" },
    { to: "/my-reports", label: "My Reports" },
  ],
  official: [
    { to: "/dashboard", label: "Command Center" },
    { to: "/dashboard/projects/new", label: "New Project" },
    { to: "/dashboard/labor", label: "Labor Console" },
    { to: "/dashboard/inventory", label: "Inventory Console" },
  ],
  admin: [
    { to: "/admin", label: "Org Management" },
  ],
};

function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="ibm-panel ibm-caption">Loading Fundingwise...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function ShellLayout({ children }) {
  const { user, logout } = useAuth();
  const role = user?.role || "public";
  const links = role === "admin" ? [...shellLinks.public, ...shellLinks.admin] : role === "official" ? [...shellLinks.public, ...shellLinks.official] : role === "citizen" ? [...shellLinks.public, ...shellLinks.citizen] : shellLinks.public;

  return (
    <div className="ibm-shell fw-page">
      <header className="ibm-header">
        <div className="flex items-center gap-3">
          <img src={BRAND.logoIconDark} alt={BRAND.name} className="h-8 w-8" />
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[#111827]">{BRAND.name}</div>
            <div className="ibm-caption">Municipal operations and transparency workspace</div>
          </div>
        </div>
        <div className="ibm-shell__status">
          <span className="ibm-caption text-right">Workspace</span>
          <span className="ibm-caption text-right">{user ? `Active role: ${user.role}` : "Public preview"}</span>
        </div>
      </header>

      <aside className="ibm-sidebar">
        <div className="ibm-sidebar__section">
          <div className="ibm-sidebar__label">Navigation</div>
          <nav className="space-y-1">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} className="ibm-sidebar__link">
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="ibm-sidebar__section">
          <div className="ibm-sidebar__label">Preview</div>
          <div className="space-y-3">
            <div className="ibm-caption text-white/85">Fundingwise shows civic reporting, planning, inventory, and organization access with sample data only.</div>
            {user ? (
              <button type="button" onClick={logout} className="ibm-button-secondary w-full justify-start">
                Logout
              </button>
            ) : (
              <NavLink to="/login" className="ibm-button-primary w-full justify-start">
                Login
              </NavLink>
            )}
          </div>
        </div>
      </aside>

      <main className="ibm-canvas">
        <Suspense fallback={<div className="ibm-panel ibm-caption">Loading Fundingwise...</div>}>{children}</Suspense>
        <div className="mt-6">
          <Footer />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppErrorBoundary>
        <ShellLayout>
          <Routes>
            <Route path="/" element={<HomeLanding />} />
            <Route path="/map" element={<MapPortal />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/timeline" element={<TransparencyTimeline />} />
            <Route path="/report/new" element={<ReportForm />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/org-signup" element={<OrgSignup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/my-reports" element={<MyReports />} />
            <Route path="/dashboard" element={<ProtectedRoute role="official"><CommandDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/projects/new" element={<ProtectedRoute role="official"><ProjectUpload /></ProtectedRoute>} />
            <Route path="/dashboard/projects/:id/budget-plan" element={<ProtectedRoute role="official"><AIReviewBudget /></ProtectedRoute>} />
            <Route path="/dashboard/projects/:id/schedule-plan" element={<ProtectedRoute role="official"><AIReviewSchedule /></ProtectedRoute>} />
            <Route path="/dashboard/labor" element={<ProtectedRoute role="official"><LaborConsole /></ProtectedRoute>} />
            <Route path="/dashboard/inventory" element={<ProtectedRoute role="official"><InventoryConsole /></ProtectedRoute>} />
            <Route path="/dashboard/projects/:id/contractors" element={<ProtectedRoute role="official"><ContractorSelection /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminHome /></ProtectedRoute>} />
            <Route path="/admin/orgs/:orgId" element={<ProtectedRoute role="admin"><OrgDetail /></ProtectedRoute>} />
          </Routes>
        </ShellLayout>
      </AppErrorBoundary>
    </AuthProvider>
  );
}
