import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createOrgEmployee,
  deleteOrg,
  deleteOrgEmployee,
  getOrgDetail,
  listOrgEmployees,
  resetEmployeePassword,
  toggleOrgService,
  updateOrg,
} from "../../api/subscriptions";

const ALL_MICROSERVICES = [
  { id: "ai_recommendations", name: "AI Project Planning & Recommendations", desc: "Automated budget & schedule analysis with Gemini" },
  { id: "inventory_management", name: "Municipal Inventory Console", desc: "Track equipment, materials, and warehouse stock" },
  { id: "labor_management", name: "Labor & Field Workforce Management", desc: "Labor allocation and contractor dispatching" },
  { id: "public_transparency", name: "Public Transparency Portal", desc: "Public map, civic reporting & transparency timeline" },
  { id: "contractor_selection", name: "Contractor Matching & Selection", desc: "AI contractor qualification and bidding analytics" },
];

export default function OrgDetail() {
  const { orgId } = useParams();
  const navigate = useNavigate();

  const [org, setOrg] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Org Form
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    poc_name: "",
    poc_email: "",
    subscription_tier: "community",
    subscription_status: "active",
  });

  // Employee creation modal/form
  const [empModal, setEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({ full_name: "", email: "", role: "official" });
  const [createdEmpPassword, setCreatedEmpPassword] = useState(null);

  // Reset password popup
  const [resetPwdResult, setResetPwdResult] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [orgRes, empRes] = await Promise.all([
        getOrgDetail(orgId),
        listOrgEmployees(orgId),
      ]);
      setOrg(orgRes);
      setEmployees(empRes || []);
      setFormData({
        name: orgRes.name || "",
        poc_name: orgRes.poc_name || "",
        poc_email: orgRes.poc_email || "",
        subscription_tier: orgRes.subscription_tier || "community",
        subscription_status: orgRes.subscription_status || "active",
      });
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load organization details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) loadData();
  }, [orgId]);

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateOrg(orgId, formData);
      setOrg(updated);
      setEditMode(false);
      alert("Organization profile updated successfully!");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to update organization");
    }
  };

  const handleToggleService = async (serviceId, currentEnabled) => {
    try {
      const updated = await toggleOrgService(orgId, serviceId, !currentEnabled);
      setOrg(updated);
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to update microservice status");
    }
  };

  const handleDeleteOrg = async () => {
    if (!window.confirm("Are you sure you want to suspend/soft-delete this organization?")) return;
    try {
      await deleteOrg(orgId, false);
      alert("Organization marked as deleted/suspended.");
      navigate("/admin");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete organization");
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      setCreatedEmpPassword(null);
      const res = await createOrgEmployee(orgId, empForm);
      setCreatedEmpPassword(res.master_password);
      setEmpForm({ full_name: "", email: "", role: "official" });
      const updatedEmployees = await listOrgEmployees(orgId);
      setEmployees(updatedEmployees || []);
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to create employee");
    }
  };

  const handleResetPassword = async (userId, userEmail) => {
    if (!window.confirm(`Reset master password for ${userEmail}?`)) return;
    try {
      const res = await resetEmployeePassword(orgId, userId);
      setResetPwdResult({ email: userEmail, pwd: res.new_master_password });
      const updatedEmployees = await listOrgEmployees(orgId);
      setEmployees(updatedEmployees || []);
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to reset password");
    }
  };

  const handleDeleteEmployee = async (userId) => {
    if (!window.confirm("Remove this employee from the organization?")) return;
    try {
      await deleteOrgEmployee(orgId, userId);
      setEmployees(employees.filter((e) => e.id !== userId));
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to remove employee");
    }
  };

  if (loading) return <div className="ibm-panel ibm-caption">Loading organization details...</div>;
  if (error) return <div className="ibm-alert ibm-alert--error">{error}</div>;
  if (!org) return <div className="ibm-panel ibm-caption">Organization not found.</div>;

  const activeServices = new Set(org.active_services || []);

  return (
    <div className="space-y-6">
      {/* Header & Quick Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/admin" className="ibm-button-secondary text-xs">
          &larr; Back to Admin Console
        </Link>
        <div className="space-x-2">
          <button type="button" onClick={() => setEditMode(!editMode)} className="ibm-button-primary text-xs">
            {editMode ? "Cancel Editing" : "Edit Organization Profile"}
          </button>
          <button type="button" onClick={handleDeleteOrg} className="ibm-button-secondary text-xs text-red-600">
            Suspend / Delete Org
          </button>
        </div>
      </div>

      {/* Organization Profile Overview / Edit Form */}
      <section className="ibm-panel space-y-4">
        <div className="border-b border-[#e2e8f0] pb-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="ibm-h2">{org.name}</h1>
            <p className="ibm-caption font-mono mt-1">Unique Org ID: {org.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="ibm-badge ibm-badge--info uppercase text-xs">{org.subscription_tier}</span>
            <span
              className={`ibm-badge uppercase text-xs ${
                org.subscription_status === "active"
                  ? "ibm-badge--success"
                  : org.subscription_status === "pending"
                  ? "ibm-badge--warning"
                  : "ibm-badge--error"
              }`}
            >
              {org.subscription_status}
            </span>
          </div>
        </div>

        {editMode ? (
          <form onSubmit={handleUpdateOrg} className="space-y-4 bg-[#f8fafc] p-4 rounded border border-[#e2e8f0]">
            <h3 className="ibm-h3 text-xs uppercase font-bold text-[#475569]">Update Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="ibm-label text-xs">Organization Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="ibm-input text-xs w-full"
                  required
                />
              </div>
              <div>
                <label className="ibm-label text-xs">Point of Contact (POC Name)</label>
                <input
                  type="text"
                  value={formData.poc_name}
                  onChange={(e) => setFormData({ ...formData, poc_name: e.target.value })}
                  className="ibm-input text-xs w-full"
                  required
                />
              </div>
              <div>
                <label className="ibm-label text-xs">POC Email Address</label>
                <input
                  type="email"
                  value={formData.poc_email}
                  onChange={(e) => setFormData({ ...formData, poc_email: e.target.value })}
                  className="ibm-input text-xs w-full"
                  required
                />
              </div>
              <div>
                <label className="ibm-label text-xs">Subscription Tier</label>
                <select
                  value={formData.subscription_tier}
                  onChange={(e) => setFormData({ ...formData, subscription_tier: e.target.value })}
                  className="ibm-select text-xs w-full"
                >
                  <option value="community">Community</option>
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="ibm-label text-xs">Subscription Status</label>
                <select
                  value={formData.subscription_status}
                  onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value })}
                  className="ibm-select text-xs w-full"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditMode(false)} className="ibm-button-secondary text-xs">
                Cancel
              </button>
              <button type="submit" className="ibm-button-primary text-xs">
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-[#f8fafc] p-3 rounded border border-[#e2e8f0]">
              <span className="ibm-caption block">Point of Contact (POC)</span>
              <span className="font-semibold text-[#0f172a] block mt-0.5">{org.poc_name}</span>
              <span className="text-xs text-[#64748b] font-mono">{org.poc_email}</span>
            </div>
            <div className="bg-[#f8fafc] p-3 rounded border border-[#e2e8f0]">
              <span className="ibm-caption block">Subscription Tier</span>
              <span className="font-semibold text-[#0f172a] uppercase block mt-0.5">{org.subscription_tier}</span>
              <span className="text-xs text-[#64748b]">B2B Plan</span>
            </div>
            <div className="bg-[#f8fafc] p-3 rounded border border-[#e2e8f0]">
              <span className="ibm-caption block">Account Status</span>
              <span className="font-semibold text-[#0f172a] capitalize block mt-0.5">{org.subscription_status}</span>
              <span className="text-xs text-[#64748b]">Created: {new Date(org.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </section>

      {/* Microservice Access Control */}
      <section className="ibm-panel space-y-4">
        <div>
          <h2 className="ibm-h3 text-[#0f172a]">Microservice Activation & Feature Toggles</h2>
          <p className="ibm-caption">Admins can explicitly activate or suspend microservices for this organization at runtime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_MICROSERVICES.map((ms) => {
            const isEnabled = activeServices.has(ms.id);
            return (
              <div key={ms.id} className="p-4 rounded border border-[#e2e8f0] bg-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-[#0f172a]">{ms.name}</div>
                  <p className="text-xs text-[#64748b]">{ms.desc}</p>
                  <span className={`inline-block text-[10px] uppercase font-bold ${isEnabled ? "text-green-700" : "text-slate-400"}`}>
                    Status: {isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleService(ms.id, isEnabled)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded ${
                    isEnabled ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  {isEnabled ? "Suspend Service" : "Activate Service"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Employee Management & Master Passwords */}
      <section className="ibm-panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="ibm-h3 text-[#0f172a]">Organization Employees ({employees.length})</h2>
            <p className="ibm-caption">Add municipal staff and view/reset their auto-generated unique master passwords.</p>
          </div>
          <button type="button" onClick={() => setEmpModal(!empModal)} className="ibm-button-primary text-xs">
            {empModal ? "Close Form" : "+ Add New Employee"}
          </button>
        </div>

        {empModal && (
          <form onSubmit={handleCreateEmployee} className="space-y-3 bg-[#f8fafc] p-4 rounded border border-[#e2e8f0]">
            <h3 className="ibm-h3 text-xs uppercase font-bold text-[#475569]">Add New Employee</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="ibm-label text-xs">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={empForm.full_name}
                  onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                  className="ibm-input text-xs w-full"
                  required
                />
              </div>
              <div>
                <label className="ibm-label text-xs">Email Address</label>
                <input
                  type="email"
                  placeholder="s.jenkins@citygov.org"
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  className="ibm-input text-xs w-full"
                  required
                />
              </div>
              <div>
                <label className="ibm-label text-xs">Role</label>
                <select
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  className="ibm-select text-xs w-full"
                >
                  <option value="official">Municipal Official</option>
                  <option value="citizen">Citizen Auditor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="submit" className="ibm-button-primary text-xs">
                Create Account & Generate Password
              </button>
            </div>
          </form>
        )}

        {createdEmpPassword && (
          <div className="ibm-alert ibm-alert--success space-y-2">
            <div className="font-semibold text-xs">Employee Created Successfully!</div>
            <p className="text-xs">Unique Master Password generated:</p>
            <div className="font-mono text-sm bg-white p-2 rounded border border-[#cbd5e1] font-bold text-[#0f172a] select-all">
              {createdEmpPassword}
            </div>
          </div>
        )}

        {resetPwdResult && (
          <div className="ibm-alert ibm-alert--info space-y-2">
            <div className="font-semibold text-xs">Master Password Reset for {resetPwdResult.email}</div>
            <p className="text-xs">New Unique Master Password:</p>
            <div className="font-mono text-sm bg-white p-2 rounded border border-[#cbd5e1] font-bold text-[#0f172a] select-all">
              {resetPwdResult.pwd}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                <th className="p-3 font-semibold text-[#334155]">User ID</th>
                <th className="p-3 font-semibold text-[#334155]">Employee Name</th>
                <th className="p-3 font-semibold text-[#334155]">Email</th>
                <th className="p-3 font-semibold text-[#334155]">Role</th>
                <th className="p-3 font-semibold text-[#334155]">Master Password</th>
                <th className="p-3 font-semibold text-[#334155] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center ibm-caption">
                    No employees registered under this organization yet.
                  </td>
                </tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="p-3 font-mono text-xs text-[#64748b]">{e.id}</td>
                    <td className="p-3 font-medium text-[#0f172a]">{e.full_name}</td>
                    <td className="p-3 text-xs text-[#334155] font-mono">{e.email}</td>
                    <td className="p-3">
                      <span className="ibm-badge ibm-badge--info uppercase text-[10px]">{e.role}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {e.master_password ? (
                        <span className="bg-[#f1f5f9] px-2 py-1 rounded text-[#0f172a] font-bold select-all">{e.master_password}</span>
                      ) : (
                        <span className="text-[#94a3b8] italic">Encrypted</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleResetPassword(e.id, e.email)}
                        className="ibm-button-secondary text-xs py-1 px-2.5"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(e.id)}
                        className="ibm-button-secondary text-xs py-1 px-2.5 text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}