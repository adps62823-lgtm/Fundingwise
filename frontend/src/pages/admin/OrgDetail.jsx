import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  approveOrg,
  createOrgEmployee,
  deleteOrg,
  deleteOrgEmployee,
  getOrgDetail,
  getTiers,
  resetEmployeePassword,
  suspendOrg,
  toggleOrgService,
  updateOrg,
  updateOrgEmployee,
} from "../../api/subscriptions";

function SummaryCard({ label, value, subtext }) {
  return (
    <div className="ibm-kpi">
      <div className="ibm-kpi__label">{label}</div>
      <div className="ibm-kpi__value">{value}</div>
      {subtext && <div className="mt-1 text-xs text-[#62718a]">{subtext}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const tone =
    status === "active"
      ? "ibm-badge--success"
      : status === "suspended" || status === "deleted"
      ? "ibm-badge--danger"
      : "ibm-badge--warning";
  return <span className={`ibm-badge ${tone}`}>{status}</span>;
}

export default function OrgDetail() {
  const { orgId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState("");
  const [employeeForm, setEmployeeForm] = useState({ name: "", email: "" });
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [generatedCredential, setGeneratedCredential] = useState(null); // { email, password, name }
  const [tierKeys, setTierKeys] = useState(["trial", "standard", "enterprise"]);
  const [copiedText, setCopiedText] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    getTiers()
      .then((res) => {
        const rawData = res?.data;
        if (Array.isArray(rawData)) {
          setTierKeys(rawData);
        } else if (rawData && typeof rawData === "object") {
          const keys = Object.keys(rawData);
          if (keys.length) setTierKeys(keys);
        }
      })
      .catch(() => {
        // Fall back to default tiers if fetch fails
      });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getOrgDetail(orgId);
      setDetail(response.data);
      const org = response?.data?.organization || {};
      setProfileForm({
        name: org.name || "",
        type: org.type || "municipal_corporation",
        city: org.city || "",
        state: org.state || "",
        poc_name: org.poc_name || "",
        contact_email: org.contact_email || "",
        contact_phone: org.contact_phone || "",
        subscription_tier: org.subscription_tier || "trial",
        subscription_status: org.subscription_status || "pending",
      });
      setError("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load this organization.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading)
    return <div className="fw-container py-10 ibm-caption">Loading organization details...</div>;
  if (error)
    return <div className="fw-container py-10 ibm-badge ibm-badge--danger">{error}</div>;
  if (!detail) return null;

  const org = detail.organization || {};
  const services = (detail.services && typeof detail.services === "object") ? detail.services : {};
  const employees = Array.isArray(detail.employees) ? detail.employees : [];
  const usage = detail.usage || {};

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label || text);
    setTimeout(() => setCopiedText(""), 2200);
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileSavedMsg("");
    try {
      await updateOrg(orgId, profileForm);
      setProfileSavedMsg("Organization profile & POC updated successfully!");
      setTimeout(() => setProfileSavedMsg(""), 3000);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save profile changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleApprove = async () => {
    await approveOrg(orgId);
    await refresh();
  };

  const handleSuspend = async () => {
    await suspendOrg(orgId);
    await refresh();
  };

  const handleServiceToggle = async (serviceKey, currentlyEnabled) => {
    await toggleOrgService(orgId, serviceKey, !currentlyEnabled);
    await refresh();
  };

  const handleDelete = async (hard) => {
    const confirmMsg = hard
      ? "Hard-delete permanently removes this organization record (only allowed if it has no employees or projects). Continue?"
      : "This will suspend every service, deactivate all employee accounts, and mark the org as deleted. Its history stays visible on the public transparency timeline. Continue?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteOrg(orgId, hard);
      navigate("/admin");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete this organization.");
    }
  };

  const handleCreateEmployee = async (event) => {
    event.preventDefault();
    setCreatingEmployee(true);
    setGeneratedCredential(null);
    try {
      const response = await createOrgEmployee(orgId, employeeForm);
      setGeneratedCredential({
        name: response.data.employee.name,
        email: response.data.employee.email,
        password: response.data.generated_password,
      });
      setEmployeeForm({ name: "", email: "" });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create employee.");
    } finally {
      setCreatingEmployee(false);
    }
  };

  const handleResetPassword = async (userId, email, name) => {
    if (
      !window.confirm(
        `Generate a new master password for ${name} (${email})? Their existing password will stop working immediately.`
      )
    )
      return;
    try {
      const response = await resetEmployeePassword(orgId, userId);
      setGeneratedCredential({
        name,
        email,
        password: response.data.generated_password,
      });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not reset password.");
    }
  };

  const handleToggleEmployeeActive = async (userId, active) => {
    await updateOrgEmployee(orgId, userId, { active: !active });
    await refresh();
  };

  const handleDeleteEmployee = async (userId, email) => {
    if (!window.confirm(`Permanently remove employee ${email}?`)) return;
    try {
      await deleteOrgEmployee(orgId, userId);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete employee.");
    }
  };

  return (
    <div className="fw-container py-10 space-y-8">
      {/* Top Header Card */}
      <div className="ibm-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button className="ibm-button-ghost mb-3" onClick={() => navigate("/admin")}>
              &larr; Back to Organization Directory
            </button>
            <h1 className="ibm-title text-4xl">{org.name}</h1>
            <p className="mt-2 max-w-3xl text-[#4b5563] flex flex-wrap items-center gap-2">
              <span>📍 {org.city}, {org.state}</span>
              &middot;
              <span className="capitalize">{org.type?.replace("_", " ")}</span>
              &middot;
              <span>slug: <code className="ibm-mono">{org.slug}</code></span>
            </p>

            {/* ID Block with Copy */}
            <div className="mt-3 inline-flex items-center gap-2 bg-[#f8fafc] px-3 py-1.5 rounded border border-[#e2e8f0] text-xs font-mono">
              <span className="text-[#64748b]">Org ID:</span>
              <span className="font-bold text-[#0f172a]">{org.id || org._id}</span>
              <button
                type="button"
                className="ml-2 text-[#0f62fe] hover:underline font-sans font-semibold text-[11px]"
                onClick={() => copyToClipboard(org.id || org._id, "org_id")}
              >
                {copiedText === "org_id" ? "Copied!" : "Copy ID"}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={org.subscription_status} />
              <span className="ibm-badge uppercase font-bold">{org.subscription_tier} Tier</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <SummaryCard label="Employees" value={usage.employee_count} />
            <SummaryCard label="Projects" value={usage.projects} />
            <SummaryCard label="Workers" value={usage.workers} />
            <SummaryCard label="Inventory Items" value={usage.inventory_items} />
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#e2e8f0] pt-4">
          {org.subscription_status !== "active" && org.subscription_status !== "deleted" && (
            <button className="ibm-button-primary" onClick={handleApprove}>
              Approve Subscription
            </button>
          )}
          {org.subscription_status === "active" && (
            <button className="ibm-button-secondary" onClick={handleSuspend}>
              Suspend Subscription
            </button>
          )}
          {org.subscription_status !== "deleted" && (
            <button className="ibm-button-secondary" onClick={() => handleDelete(false)}>
              Soft-Delete Organization
            </button>
          )}
          <button className="ibm-button-ghost text-[#ea001e]" onClick={() => handleDelete(true)}>
            Hard-Delete (Empty Org Only)
          </button>
        </div>
      </div>

      {/* Profile & Point of Contact (POC) Form */}
      <div className="ibm-panel">
        <div className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3">
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">Organization Profile & Point of Contact (POC)</h2>
            <p className="text-sm text-[#64748b]">
              Update organization identity, POC details, and primary subscription parameters.
            </p>
          </div>
          {profileSavedMsg && (
            <div className="text-sm font-semibold text-[#0f766e] bg-[#ccfbf1] px-3 py-1 rounded">
              {profileSavedMsg}
            </div>
          )}
        </div>

        <form onSubmit={handleProfileSave} className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">Organization Name</label>
            <input
              className="ibm-input"
              placeholder="Organization Name"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">Organization Type</label>
            <select
              className="ibm-select"
              value={profileForm.type}
              onChange={(e) => setProfileForm({ ...profileForm, type: e.target.value })}
            >
              <option value="municipal_corporation">Municipal Corporation</option>
              <option value="panchayat">Panchayat</option>
              <option value="department">Public Department</option>
              <option value="admin">Admin Entity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">City</label>
            <input
              className="ibm-input"
              placeholder="City"
              value={profileForm.city}
              onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">State</label>
            <input
              className="ibm-input"
              placeholder="State"
              value={profileForm.state}
              onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
              required
            />
          </div>

          {/* POC Info */}
          <div className="md:col-span-2 pt-2 border-t border-[#f1f5f9]">
            <h3 className="text-sm font-bold text-[#1e293b] mb-3 uppercase tracking-wider">Point of Contact (POC) Details</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">POC Name</label>
            <input
              className="ibm-input"
              placeholder="POC Full Name"
              value={profileForm.poc_name}
              onChange={(e) => setProfileForm({ ...profileForm, poc_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">POC Contact Email</label>
            <input
              className="ibm-input"
              type="email"
              placeholder="poc@city.gov.in"
              value={profileForm.contact_email}
              onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">POC Contact Phone</label>
            <input
              className="ibm-input"
              placeholder="+91 98765 43210"
              value={profileForm.contact_phone}
              onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">Subscription Tier</label>
            <select
              className="ibm-select capitalize"
              value={profileForm.subscription_tier}
              onChange={(e) => setProfileForm({ ...profileForm, subscription_tier: e.target.value })}
            >
              {tierKeys.map((tier) => (
                <option key={tier} value={tier}>
                  {tier} Tier
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1">Subscription Status</label>
            <select
              className="ibm-select capitalize"
              value={profileForm.subscription_status}
              onChange={(e) => setProfileForm({ ...profileForm, subscription_status: e.target.value })}
            >
              <option value="pending">Pending Approval</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>

          <div className="md:col-span-2 pt-2">
            <button className="ibm-button-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving Profile..." : "Save Organization Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Microservices Management */}
      <div className="ibm-panel">
        <div className="border-b border-[#e2e8f0] pb-3">
          <h2 className="text-xl font-bold text-[#0f172a]">Microservices & Feature Toggles</h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Admin capability switches: Activate or suspend individual microservices for this organization. Suspending a microservice immediately blocks access on API endpoints even if the overall subscription stays active.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Object.entries(services).map(([key, service]) => (
            <div
              key={key}
              className={`ibm-panel flex flex-col justify-between p-4 border transition ${
                service.enabled ? "border-[#cbd5e1] bg-white" : "border-[#fca5a5] bg-[#fff5f5]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base text-[#0f172a]">{service.label}</span>
                  <span
                    className={`ibm-badge font-semibold ${
                      service.enabled ? "ibm-badge--success" : "ibm-badge--danger"
                    }`}
                  >
                    {service.enabled ? "Active" : "Suspended"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#475569] leading-relaxed">{service.description}</p>
                <div className="mt-2 text-[11px] font-mono text-[#64748b]">Key: {key}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between">
                <span className="text-xs text-[#64748b]">
                  {service.enabled ? "Available to org officials" : "Blocked by admin switch"}
                </span>
                <button
                  type="button"
                  className={service.enabled ? "ibm-button-secondary text-xs" : "ibm-button-primary text-xs"}
                  onClick={() => handleServiceToggle(key, service.enabled)}
                >
                  {service.enabled ? "Suspend Service" : "Activate Service"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Management & Master Passwords */}
      <div className="ibm-panel space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#0f172a]">Employee Roster & Master Password Credentials</h2>
          <p className="mt-1 text-sm text-[#64748b]">
            Manage organization employees. Every employee account has a unique, auto-generated master password that can be issued or reset by the admin if they forget it.
          </p>
        </div>

        {/* Add Employee Form */}
        <form onSubmit={handleCreateEmployee} className="ibm-panel bg-[#f8fafc] p-4 border border-[#cbd5e1]">
          <h3 className="text-sm font-bold text-[#0f172a] mb-3 uppercase tracking-wider">
            + Add New Employee
          </h3>
          <div className="flex flex-wrap gap-3">
            <input
              className="ibm-input flex-1 min-w-[12rem]"
              placeholder="Employee Full Name"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              required
            />
            <input
              className="ibm-input flex-1 min-w-[14rem]"
              type="email"
              placeholder="official@city.gov.in"
              value={employeeForm.email}
              onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
              required
            />
            <button className="ibm-button-primary" type="submit" disabled={creatingEmployee}>
              {creatingEmployee ? "Generating Credentials..." : "Create Employee Account"}
            </button>
          </div>
        </form>

        {/* Password Banner Popup */}
        {generatedCredential && (
          <div className="rounded-[4px] border-2 border-[#0f62fe] bg-[#eff6ff] p-4 text-sm text-[#1e3a8a] space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="font-bold text-base flex items-center gap-2 text-[#0f62fe]">
                🔑 Master Credential Generated
              </div>
              <button
                className="text-xs text-[#64748b] hover:text-[#0f172a]"
                onClick={() => setGeneratedCredential(null)}
              >
                ✕ Dismiss
              </button>
            </div>
            <div>
              Generated for: <strong className="text-[#0f172a]">{generatedCredential.name} ({generatedCredential.email})</strong>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded border border-[#93c5fd]">
              <div>
                <div className="text-xs text-[#64748b]">Auto-Generated Master Password:</div>
                <div className="font-mono text-lg font-bold text-[#0f62fe] tracking-wider select-all">
                  {generatedCredential.password}
                </div>
              </div>
              <button
                type="button"
                className="ibm-button-primary text-xs"
                onClick={() => copyToClipboard(generatedCredential.password, "generated_pass")}
              >
                {copiedText === "generated_pass" ? "Copied to Clipboard!" : "Copy Master Password"}
              </button>
            </div>
            <p className="text-xs text-[#475569]">
              Share this master password directly with the employee. They can use it to log in immediately or recover access.
            </p>
          </div>
        )}

        {/* Employees Table */}
        <div className="ibm-table-wrap">
          <table className="ibm-table w-full text-left">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Work Email</th>
                <th>Account Status</th>
                <th>Master / Recovery Password</th>
                <th>Last Reset</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const passwordValue = employee.master_password || "";
                const isVisible = visiblePasswords[employee.id];

                return (
                  <tr key={employee.id} className="hover:bg-[#f8fafc]">
                    <td className="font-semibold text-[#0f172a]">{employee.name}</td>
                    <td className="text-[#475569]">{employee.email}</td>
                    <td>
                      <span
                        className={`ibm-badge ${
                          employee.active !== false ? "ibm-badge--success" : "ibm-badge--danger"
                        }`}
                      >
                        {employee.active !== false ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td>
                      {passwordValue ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-[#f1f5f9] px-2 py-1 rounded border border-[#cbd5e1]">
                            {isVisible ? passwordValue : "••••••••••••"}
                          </span>
                          <button
                            type="button"
                            className="text-xs text-[#64748b] hover:text-[#0f62fe]"
                            onClick={() => togglePasswordVisibility(employee.id)}
                          >
                            {isVisible ? "Hide" : "Show"}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-[#0f62fe] hover:underline font-semibold ml-1"
                            onClick={() => copyToClipboard(passwordValue, `pass_${employee.id}`)}
                          >
                            {copiedText === `pass_${employee.id}` ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#94a3b8] italic">Click Reset to Generate</span>
                      )}
                    </td>
                    <td className="text-xs text-[#64748b]">
                      {employee.password_last_reset_at
                        ? new Date(employee.password_last_reset_at).toLocaleDateString()
                        : "Initial Creation"}
                    </td>
                    <td className="text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        className="ibm-button-ghost text-xs"
                        onClick={() =>
                          handleResetPassword(employee.id, employee.email, employee.name)
                        }
                      >
                        Reset Master Pass
                      </button>
                      <button
                        type="button"
                        className="ibm-button-ghost text-xs"
                        onClick={() =>
                          handleToggleEmployeeActive(employee.id, employee.active !== false)
                        }
                      >
                        {employee.active !== false ? "Suspend" : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        className="ibm-button-ghost text-xs text-[#ea001e]"
                        onClick={() => handleDeleteEmployee(employee.id, employee.email)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!employees.length && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#64748b]">
                    No employees registered under this organization yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}