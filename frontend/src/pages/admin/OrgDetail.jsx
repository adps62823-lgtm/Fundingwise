import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  approveOrg,
  createOrgEmployee,
  deleteOrg,
  getOrgDetail,
  getTiers,
  resetEmployeePassword,
  suspendOrg,
  toggleOrgService,
  updateOrg,
  updateOrgEmployee,
} from "../../api/subscriptions";

function SummaryCard({ label, value }) {
  return (
    <div className="ibm-kpi">
      <div className="ibm-kpi__label">{label}</div>
      <div className="ibm-kpi__value">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone =
    status === "active" ? "ibm-badge--success" : status === "suspended" || status === "deleted" ? "ibm-badge--danger" : "ibm-badge--warning";
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
  const [employeeForm, setEmployeeForm] = useState({ name: "", email: "" });
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [generatedCredential, setGeneratedCredential] = useState(null); // { email, password }
  const [tierKeys, setTierKeys] = useState(["trial", "standard", "enterprise"]);

  useEffect(() => {
    getTiers()
      .then((res) => {
        const keys = Object.keys(res.data || {});
        if (keys.length) setTierKeys(keys);
      })
      .catch(() => {
        // Fall back to the default tierKeys above if this request fails -
        // the edit form should still work with the known tier names.
      });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getOrgDetail(orgId);
      setDetail(response.data);
      const org = response.data.organization;
      setProfileForm({
        name: org.name || "",
        city: org.city || "",
        state: org.state || "",
        poc_name: org.poc_name || "",
        contact_email: org.contact_email || "",
        contact_phone: org.contact_phone || "",
        subscription_tier: org.subscription_tier || "trial",
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

  if (loading) return <div className="fw-container py-10 ibm-caption">Loading organization...</div>;
  if (error) return <div className="fw-container py-10 ibm-badge ibm-badge--danger">{error}</div>;
  if (!detail) return null;

  const { organization: org, services, employees, usage } = detail;

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateOrg(orgId, profileForm);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save changes.");
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

  const handleResetPassword = async (userId, email) => {
    if (!window.confirm(`Generate a new password for ${email}? Their old password will stop working.`)) return;
    const response = await resetEmployeePassword(orgId, userId);
    setGeneratedCredential({ email, password: response.data.generated_password });
    await refresh();
  };

  const handleToggleEmployeeActive = async (userId, active) => {
    await updateOrgEmployee(orgId, userId, { active: !active });
    await refresh();
  };

  return (
    <div className="fw-container py-10 space-y-8">
      <div className="ibm-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button className="ibm-button-ghost mb-3" onClick={() => navigate("/admin")}>
              &larr; Back to Org Management
            </button>
            <h1 className="ibm-title text-4xl">{org.name}</h1>
            <p className="mt-2 max-w-3xl text-[#4b5563]">
              {org.city}, {org.state} &middot; {org.type} &middot; slug: <span className="ibm-mono">{org.slug}</span>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={org.subscription_status} />
              <span className="ibm-badge">{org.subscription_tier}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryCard label="Employees" value={usage.employee_count} />
            <SummaryCard label="Projects" value={usage.projects} />
            <SummaryCard label="Workers" value={usage.workers} />
            <SummaryCard label="Inventory items" value={usage.inventory_items} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {org.subscription_status !== "active" && org.subscription_status !== "deleted" && (
            <button className="ibm-button-primary" onClick={handleApprove}>
              Approve subscription
            </button>
          )}
          {org.subscription_status === "active" && (
            <button className="ibm-button-secondary" onClick={handleSuspend}>
              Suspend subscription
            </button>
          )}
          {org.subscription_status !== "deleted" && (
            <button className="ibm-button-secondary" onClick={() => handleDelete(false)}>
              Delete organization
            </button>
          )}
          <button className="ibm-button-ghost" onClick={() => handleDelete(true)}>
            Hard-delete (only if empty)
          </button>
        </div>
      </div>

      {/* Profile / POC / subscription editing */}
      <div className="ibm-panel">
        <h2 className="text-xl font-semibold text-[#0f172a]">Profile, POC & subscription</h2>
        <form onSubmit={handleProfileSave} className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="ibm-input" placeholder="Organization name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
          <select className="ibm-select" value={profileForm.subscription_tier} onChange={(e) => setProfileForm({ ...profileForm, subscription_tier: e.target.value })}>
            {tierKeys.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
          <input className="ibm-input" placeholder="City" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
          <input className="ibm-input" placeholder="State" value={profileForm.state} onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })} />
          <input className="ibm-input" placeholder="POC name" value={profileForm.poc_name} onChange={(e) => setProfileForm({ ...profileForm, poc_name: e.target.value })} />
          <input className="ibm-input" placeholder="POC contact email" value={profileForm.contact_email} onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })} />
          <input className="ibm-input" placeholder="POC contact phone" value={profileForm.contact_phone} onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })} />
          <div className="md:col-span-2">
            <button className="ibm-button-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Microservices */}
      <div className="ibm-panel">
        <h2 className="text-xl font-semibold text-[#0f172a]">Microservices</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Activate or suspend individual services for this org. Suspending a service blocks it immediately, even while the subscription itself stays active.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(services).map(([key, service]) => (
            <div key={key} className="ibm-panel flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[#0f172a]">{service.label}</div>
                <div className="text-sm text-[#6b7280]">{service.description}</div>
                <span className={`ibm-badge mt-2 inline-block ${service.enabled ? "ibm-badge--success" : "ibm-badge--danger"}`}>
                  {service.enabled ? "Active" : "Suspended"}
                </span>
              </div>
              <button
                className={service.enabled ? "ibm-button-secondary" : "ibm-button-primary"}
                onClick={() => handleServiceToggle(key, service.enabled)}
              >
                {service.enabled ? "Suspend" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Employees */}
      <div className="ibm-panel">
        <h2 className="text-xl font-semibold text-[#0f172a]">Employees</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Every employee gets a unique, auto-generated password when created here. It's shown once below - share it with them directly. If they forget it, use "Reset password" to issue a fresh one.
        </p>

        <form onSubmit={handleCreateEmployee} className="mt-4 flex flex-wrap gap-3">
          <input className="ibm-input flex-1 min-w-[10rem]" placeholder="Full name" value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} required />
          <input className="ibm-input flex-1 min-w-[12rem]" type="email" placeholder="Work email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} required />
          <button className="ibm-button-primary" type="submit" disabled={creatingEmployee}>
            {creatingEmployee ? "Creating..." : "+ Add employee"}
          </button>
        </form>

        {generatedCredential && (
          <div className="mt-4 rounded-[4px] border border-[#c9c9c9] bg-[#eef4ff] p-4 text-sm text-[#0176d3]">
            Password for <span className="font-semibold">{generatedCredential.email}</span>:{" "}
            <span className="font-mono">{generatedCredential.password}</span>
            <div className="mt-1 text-xs text-[#475569]">
              This is shown once. Share it with the employee now - it won't be shown again, but you can always generate a new one from "Reset password".
            </div>
          </div>
        )}

        <div className="mt-6 ibm-table-wrap">
          <table className="ibm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last password reset</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.name}</td>
                  <td>{employee.email}</td>
                  <td>
                    <span className={`ibm-badge ${employee.active !== false ? "ibm-badge--success" : "ibm-badge--danger"}`}>
                      {employee.active !== false ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td>{employee.password_last_reset_at ? new Date(employee.password_last_reset_at).toLocaleString() : "Never"}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button className="ibm-button-ghost" onClick={() => handleResetPassword(employee.id, employee.email)}>
                      Reset password
                    </button>
                    <button className="ibm-button-ghost" onClick={() => handleToggleEmployeeActive(employee.id, employee.active !== false)}>
                      {employee.active !== false ? "Suspend" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
              {!employees.length && (
                <tr>
                  <td colSpan={5} className="ibm-empty">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* API usage */}
      <div className="ibm-panel">
        <h2 className="text-xl font-semibold text-[#0f172a]">B2B API usage</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard label="API keys" value={usage.api_keys} />
          <SummaryCard label="Lifetime API calls" value={usage.api_calls_total} />
        </div>
      </div>
    </div>
  );
}
