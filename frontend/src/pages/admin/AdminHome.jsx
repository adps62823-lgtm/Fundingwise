import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { approveOrg, createApiKey, listApiKeys, listOrganizations, listPendingOrgs, suspendOrg } from "../../api/subscriptions";

export default function AdminHome() {
  const [pending, setPending] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [orgFilter, setOrgFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [newKeyOrgId, setNewKeyOrgId] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [issuedKey, setIssuedKey] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, oRes, kRes] = await Promise.all([
        listPendingOrgs(),
        listOrganizations(),
        listApiKeys(),
      ]);
      setPending(pRes || []);
      setOrgs(oRes || []);
      setKeys(kRes || []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveOrg(id);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to approve organization");
    }
  };

  const handleSuspend = async (id) => {
    if (!window.confirm("Are you sure you want to suspend this organization?")) return;
    try {
      await suspendOrg(id);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to suspend organization");
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyOrgId) return alert("Select an organization");
    try {
      const res = await createApiKey({ org_id: newKeyOrgId, label: newKeyLabel || "B2B Production Key" });
      setIssuedKey(res);
      setNewKeyLabel("");
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to issue API Key");
    }
  };

  const filteredOrgs = orgs.filter((org) => {
    const matchesStatus = orgFilter === "all" || org.subscription_status === orgFilter;
    const matchesSearch =
      !searchQuery ||
      org.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.poc_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.poc_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <header className="ibm-panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ibm-h2">Superadmin Command Console</h1>
          <p className="ibm-caption mt-1">Manage B2B municipal subscriptions, organization profiles, microservice access, and employees</p>
        </div>
        <button type="button" onClick={loadData} className="ibm-button-secondary text-xs">
          Refresh Data
        </button>
      </header>

      {error && <div className="ibm-alert ibm-alert--error">{error}</div>}

      {/* Pending Approvals */}
      <section className="ibm-panel space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="ibm-h3 text-[#0f172a]">Pending Registrations ({pending.length})</h2>
          <span className="ibm-badge ibm-badge--warning">{pending.length} Require Action</span>
        </div>
        {loading ? (
          <div className="ibm-caption">Loading queue...</div>
        ) : pending.length === 0 ? (
          <p className="ibm-caption">No pending organization signup requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <th className="p-3 font-semibold text-[#334155]">Org ID</th>
                  <th className="p-3 font-semibold text-[#334155]">Org Name</th>
                  <th className="p-3 font-semibold text-[#334155]">POC & Email</th>
                  <th className="p-3 font-semibold text-[#334155]">Tier</th>
                  <th className="p-3 font-semibold text-[#334155] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="p-3 font-mono text-xs text-[#64748b]">{p.id}</td>
                    <td className="p-3 font-medium text-[#0f172a]">{p.name}</td>
                    <td className="p-3">
                      <div className="text-xs font-medium text-[#0f172a]">{p.poc_name}</div>
                      <div className="text-xs text-[#64748b]">{p.poc_email}</div>
                    </td>
                    <td className="p-3">
                      <span className="ibm-badge ibm-badge--info uppercase text-[10px]">{p.subscription_tier}</span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button type="button" onClick={() => handleApprove(p.id)} className="ibm-button-primary text-xs py-1 px-3">
                        Approve
                      </button>
                      <Link to={`/admin/orgs/${p.id}`} className="ibm-button-secondary text-xs py-1 px-3">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Active Organizations Directory */}
      <section className="ibm-panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="ibm-h3 text-[#0f172a]">Organizations Directory ({orgs.length})</h2>
            <p className="ibm-caption">Click on any organization to view full details, active microservices, and manage employees</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ibm-input text-xs w-60"
            />
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="ibm-select text-xs w-36">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="ibm-caption">Loading directory...</div>
        ) : filteredOrgs.length === 0 ? (
          <p className="ibm-caption">No organizations match the filter criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <th className="p-3 font-semibold text-[#334155]">Org ID</th>
                  <th className="p-3 font-semibold text-[#334155]">Organization</th>
                  <th className="p-3 font-semibold text-[#334155]">Point of Contact</th>
                  <th className="p-3 font-semibold text-[#334155]">Tier</th>
                  <th className="p-3 font-semibold text-[#334155]">Status</th>
                  <th className="p-3 font-semibold text-[#334155]">Active Microservices</th>
                  <th className="p-3 font-semibold text-[#334155] text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((o) => (
                  <tr key={o.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="p-3 font-mono text-xs text-[#64748b]">{o.id}</td>
                    <td className="p-3">
                      <Link to={`/admin/orgs/${o.id}`} className="font-semibold text-[#0284c7] hover:underline">
                        {o.name}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="text-xs font-medium text-[#0f172a]">{o.poc_name}</div>
                      <div className="text-xs text-[#64748b]">{o.poc_email}</div>
                    </td>
                    <td className="p-3">
                      <span className="ibm-badge ibm-badge--info uppercase text-[10px]">{o.subscription_tier}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`ibm-badge uppercase text-[10px] ${
                          o.subscription_status === "active"
                            ? "ibm-badge--success"
                            : o.subscription_status === "pending"
                            ? "ibm-badge--warning"
                            : "ibm-badge--error"
                        }`}
                      >
                        {o.subscription_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(o.active_services || []).map((s) => (
                          <span key={s} className="px-1.5 py-0.5 text-[10px] bg-[#f1f5f9] text-[#475569] rounded font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <Link to={`/admin/orgs/${o.id}`} className="ibm-button-primary text-xs py-1 px-2.5">
                        Manage Org
                      </Link>
                      {o.subscription_status === "active" && (
                        <button type="button" onClick={() => handleSuspend(o.id)} className="ibm-button-secondary text-xs py-1 px-2.5 text-red-600">
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* B2B API Keys & Credentials */}
      <section className="ibm-panel space-y-4">
        <h2 className="ibm-h3 text-[#0f172a]">B2B API Keys & Credentials</h2>
        <form onSubmit={handleCreateKey} className="flex flex-wrap items-end gap-3 bg-[#f8fafc] p-4 rounded border border-[#e2e8f0]">
          <div className="w-64 space-y-1">
            <label className="ibm-label text-xs">Target Organization</label>
            <select value={newKeyOrgId} onChange={(e) => setNewKeyOrgId(e.target.value)} className="ibm-select text-xs w-full" required>
              <option value="">-- Select Org --</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.subscription_tier})
                </option>
              ))}
            </select>
          </div>
          <div className="w-64 space-y-1">
            <label className="ibm-label text-xs">Key Label</label>
            <input
              type="text"
              placeholder="e.g. Production Mobile App"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              className="ibm-input text-xs w-full"
            />
          </div>
          <button type="submit" className="ibm-button-primary text-xs py-2 px-4">
            Issue API Key
          </button>
        </form>

        {issuedKey && (
          <div className="ibm-alert ibm-alert--success space-y-2">
            <div className="font-semibold">New API Key Generated!</div>
            <p className="text-xs">Save this key immediately. It will not be shown again.</p>
            <div className="font-mono text-xs bg-white p-2 rounded border border-[#cbd5e1] select-all font-bold text-[#0f172a]">
              {issuedKey.api_key}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="p-2 font-semibold text-[#334155]">Key Prefix</th>
                <th className="p-2 font-semibold text-[#334155]">Label</th>
                <th className="p-2 font-semibold text-[#334155]">Org ID</th>
                <th className="p-2 font-semibold text-[#334155]">Rate Limit</th>
                <th className="p-2 font-semibold text-[#334155]">Status</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.key_id} className="border-b border-[#f1f5f9]">
                  <td className="p-2 font-mono text-xs text-[#0f172a]">{k.prefix}...</td>
                  <td className="p-2 text-xs text-[#334155]">{k.label}</td>
                  <td className="p-2 font-mono text-xs text-[#64748b]">{k.org_id}</td>
                  <td className="p-2 text-xs">{k.rate_limit_per_min} req/min</td>
                  <td className="p-2">
                    <span className={`ibm-badge text-[10px] ${k.is_active ? "ibm-badge--success" : "ibm-badge--error"}`}>
                      {k.is_active ? "Active" : "Revoked"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}