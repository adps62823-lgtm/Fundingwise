import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  approveOrg,
  createApiKey,
  getApiKeyUsage,
  listApiKeys,
  listOrganizations,
  listPendingOrgs,
  suspendOrg,
} from "../../api/subscriptions";

function UsageChart({ data }) {
  return (
    <div className="ibm-panel h-72 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 12 }} />
          <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid rgba(15, 23, 42, 0.12)",
              borderRadius: 16,
              color: "#0f172a",
            }}
          />
          <Bar dataKey="calls" fill="#0f62fe" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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

export default function AdminHome() {
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [activeTab, setActiveTab] = useState("orgs");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [apiKeyForm, setApiKeyForm] = useState({ client_name: "", label: "", org_id: "" });
  const [createdKey, setCreatedKey] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const refresh = async () => {
    try {
      const [pendingResponse, orgResponse, keyResponse] = await Promise.all([
        listPendingOrgs(),
        listOrganizations(),
        listApiKeys(),
      ]);
      setPendingOrgs(Array.isArray(pendingResponse?.data) ? pendingResponse.data : []);
      setOrganizations(Array.isArray(orgResponse?.data) ? orgResponse.data : []);
      setApiKeys(Array.isArray(keyResponse?.data) ? keyResponse.data : []);
      if (!selectedKeyId && Array.isArray(keyResponse?.data) && keyResponse.data[0]?.id) {
        setSelectedKeyId(keyResponse.data[0].id);
      }
    } catch (err) {
      console.error("Failed to refresh admin data:", err);
      setPendingOrgs([]);
      setOrganizations([]);
      setApiKeys([]);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedKeyId) {
      setUsage([]);
      return;
    }

    getApiKeyUsage(selectedKeyId)
      .then((response) => {
        const daily = response?.data?.daily_usage || {};
        if (typeof daily === "object" && daily !== null) {
          const rows = Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-14)
            .map(([day, calls]) => ({ day: day.slice(5), calls }));
          setUsage(rows);
        } else {
          setUsage([]);
        }
      })
      .catch(() => {
        setUsage([]);
      });
  }, [selectedKeyId]);

  const summary = useMemo(() => {
    const safeOrgs = Array.isArray(organizations) ? organizations : [];
    const safePending = Array.isArray(pendingOrgs) ? pendingOrgs : [];
    const safeKeys = Array.isArray(apiKeys) ? apiKeys : [];
    return {
      totalOrgs: safeOrgs.length,
      activeOrgs: safeOrgs.filter((org) => org && org.subscription_status === "active").length,
      pendingOrgs: safePending.length,
      suspendedOrgs: safeOrgs.filter((org) => org && org.subscription_status === "suspended").length,
      keys: safeKeys.length,
    };
  }, [organizations, pendingOrgs, apiKeys]);

  const filteredOrgs = useMemo(() => {
    const safeOrgs = Array.isArray(organizations) ? organizations : [];
    return safeOrgs.filter((org) => {
      if (!org) return false;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (org.name || "").toLowerCase().includes(query) ||
        (org.id || "").toLowerCase().includes(query) ||
        (org.city || "").toLowerCase().includes(query) ||
        (org.state || "").toLowerCase().includes(query) ||
        (org.poc_name || "").toLowerCase().includes(query) ||
        (org.contact_email || "").toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || org.subscription_status === statusFilter;
      const matchesTier = tierFilter === "all" || org.subscription_tier === tierFilter;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [organizations, searchQuery, statusFilter, tierFilter]);

  const handleApprove = async (id) => {
    await approveOrg(id);
    await refresh();
  };

  const handleSuspend = async (id) => {
    await suspendOrg(id);
    await refresh();
  };

  const handleCreateApiKey = async (event) => {
    event.preventDefault();
    const response = await createApiKey(apiKeyForm);
    setCreatedKey(response.data.key);
    setApiKeyForm({ client_name: "", label: "", org_id: "" });
    await refresh();
    setSelectedKeyId(response.data.id);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fw-container py-10">
      <div className="ibm-panel space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="ibm-title text-4xl">Admin Management Console</h1>
            <p className="mt-2 max-w-3xl text-[#4b5563]">
              Superuser oversight: manage municipal organizations, view POC contacts, edit subscription tiers & microservice feature switches, and monitor employee master credentials.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
            <SummaryCard label="Total Organizations" value={summary.totalOrgs} />
            <SummaryCard label="Active Subscriptions" value={summary.activeOrgs} />
            <SummaryCard label="Pending Approval" value={summary.pendingOrgs} />
            <SummaryCard label="Suspended" value={summary.suspendedOrgs} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#c9c9c9] pb-4">
          <button
            className={activeTab === "orgs" ? "ibm-button-primary" : "ibm-button-ghost"}
            onClick={() => setActiveTab("orgs")}
          >
            Organizations Directory ({organizations.length})
          </button>
          <button
            className={activeTab === "keys" ? "ibm-button-primary" : "ibm-button-ghost"}
            onClick={() => setActiveTab("keys")}
          >
            B2B API Keys & Usage ({apiKeys.length})
          </button>
        </div>

        {activeTab === "orgs" && (
          <div className="space-y-8">
            {/* Pending Requests Section */}
            {pendingOrgs.length > 0 && (
              <section className="rounded-[4px] border border-[#f1c21b] bg-[#fffbe6] p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-[#0f172a] flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#f1c21b] inline-block animate-pulse"></span>
                    Pending Subscription Requests ({pendingOrgs.length})
                  </h2>
                </div>
                <p className="mt-1 text-sm text-[#4b5563]">
                  Organizations awaiting manual approval before accessing Command Center microservices.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {pendingOrgs.map((org) => (
                    <div key={org.id} className="ibm-panel bg-white">
                      <div className="flex flex-col justify-between h-full gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-lg text-[#0f172a]">{org.name}</div>
                            <span className="ibm-badge ibm-badge--warning">Pending</span>
                          </div>
                          <div className="text-sm text-[#4b5563] mt-1">
                            📍 {org.city}, {org.state} &middot; <span className="capitalize">{org.type?.replace("_", " ")}</span>
                          </div>
                          <div className="mt-2 text-xs font-mono bg-[#f5f8fc] px-2 py-1 rounded inline-block text-[#0f62fe]">
                            ID: {org.id}
                          </div>
                          <div className="mt-3 text-sm text-[#334155] space-y-1 bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0]">
                            <div className="font-semibold text-xs text-[#64748b] uppercase tracking-wider">POC Contact Info</div>
                            <div>👤 {org.poc_name || "N/A"}</div>
                            <div>📧 {org.contact_email || "N/A"}</div>
                            <div>📞 {org.contact_phone || "N/A"}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                          <Link className="ibm-button-ghost text-xs" to={`/admin/orgs/${org.id}`}>
                            Full Details & Employees &rarr;
                          </Link>
                          <button className="ibm-button-primary text-xs" onClick={() => handleApprove(org.id)}>
                            Approve Subscription
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Organizations Directory */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#0f172a]">All Organizations</h2>
                  <p className="text-sm text-[#6b7280]">
                    Select any organization to edit profile & POC, manage microservices, or generate employee master passwords.
                  </p>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <input
                    className="ibm-input w-full md:w-64"
                    placeholder="Search by name, ID, POC, city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    className="ibm-select w-auto"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Status: All</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="deleted">Deleted</option>
                  </select>
                  <select
                    className="ibm-select w-auto"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                  >
                    <option value="all">Tier: All</option>
                    <option value="trial">Trial</option>
                    <option value="standard">Standard</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Organization Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrgs.map((org) => {
                  const activeServicesCount =
                    org && org.services && typeof org.services === "object"
                      ? Object.values(org.services).filter(Boolean).length
                      : 4;
                  return (
                    <div
                      key={org.id}
                      className="ibm-panel hover:border-[#0f62fe] transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-lg text-[#0f172a] hover:text-[#0f62fe]">
                            <Link to={`/admin/orgs/${org.id}`}>{org.name}</Link>
                          </h3>
                          <StatusBadge status={org.subscription_status} />
                        </div>

                        <div className="mt-1 flex items-center justify-between text-xs text-[#64748b]">
                          <span className="capitalize">{org.type?.replace("_", " ")} &middot; {org.city}, {org.state}</span>
                          <span className="font-semibold uppercase tracking-wider px-2 py-0.5 bg-[#f1f5f9] rounded">
                            {org.subscription_tier}
                          </span>
                        </div>

                        {/* ID block */}
                        <div className="mt-3 flex items-center justify-between text-xs font-mono bg-[#f8fafc] px-2.5 py-1.5 rounded border border-[#e2e8f0]">
                          <span className="text-[#64748b] truncate max-w-[180px]">ID: {org.id}</span>
                          <button
                            type="button"
                            className="text-[#0f62fe] hover:underline font-sans ml-2 text-[11px]"
                            onClick={() => copyToClipboard(org.id, org.id)}
                          >
                            {copiedId === org.id ? "Copied!" : "Copy ID"}
                          </button>
                        </div>

                        {/* POC details */}
                        <div className="mt-3 text-xs text-[#334155] space-y-1">
                          <div className="font-semibold text-[#64748b]">Point of Contact (POC):</div>
                          <div>👤 {org.poc_name || "No POC specified"}</div>
                          {org.contact_email && <div className="truncate">📧 {org.contact_email}</div>}
                          {org.contact_phone && <div>📞 {org.contact_phone}</div>}
                        </div>

                        {/* Microservices summary */}
                        <div className="mt-3 pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
                          <span className="text-[#64748b]">Microservices:</span>
                          <span className="font-semibold text-[#0176d3]">
                            {activeServicesCount}/4 Active
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
                        <Link
                          to={`/admin/orgs/${org.id}`}
                          className="ibm-button-primary text-xs w-full text-center"
                        >
                          View Details, Microservices & Employees &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {!filteredOrgs.length && (
                  <div className="col-span-full ibm-panel text-center py-10 text-[#64748b]">
                    No organizations matching filter criteria.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.95fr]">
            <section>
              <h2 className="text-xl font-semibold text-[#0f172a]">Create B2B Data API Key</h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Issue an API key for external consumers (real estate firms, insurers, NGOs, journalists) to access civic scores and project transparency data.
              </p>
              <form onSubmit={handleCreateApiKey} className="mt-4 space-y-3">
                <input
                  className="ibm-input"
                  placeholder="Client name (e.g. Acme Realty)"
                  value={apiKeyForm.client_name}
                  onChange={(e) => setApiKeyForm({ ...apiKeyForm, client_name: e.target.value })}
                  required
                />
                <input
                  className="ibm-input"
                  placeholder="Label (e.g. Production Key)"
                  value={apiKeyForm.label}
                  onChange={(e) => setApiKeyForm({ ...apiKeyForm, label: e.target.value })}
                  required
                />
                <input
                  className="ibm-input"
                  placeholder="Optional Organization ID link"
                  value={apiKeyForm.org_id}
                  onChange={(e) => setApiKeyForm({ ...apiKeyForm, org_id: e.target.value })}
                />
                <button className="ibm-button-primary" type="submit">
                  Generate API Key
                </button>
              </form>

              {createdKey && (
                <div className="mt-4 rounded-[4px] border border-[#0176d3] bg-[#eef4ff] p-4 text-sm text-[#0176d3] space-y-2">
                  <div className="font-bold">New API Key Created:</div>
                  <div className="font-mono bg-white p-2 rounded border border-[#0176d3] select-all flex items-center justify-between">
                    <span>{createdKey}</span>
                    <button
                      type="button"
                      className="ibm-button-ghost text-xs"
                      onClick={() => copyToClipboard(createdKey, "new-key")}
                    >
                      {copiedId === "new-key" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="text-xs text-[#475569]">
                    Provide this key in requests as HTTP header <code className="font-mono">X-API-Key: {createdKey}</code>.
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#0f172a]">API Key Usage Dashboard</h2>
              <select
                className="ibm-select mt-4"
                value={selectedKeyId}
                onChange={(e) => setSelectedKeyId(e.target.value)}
              >
                <option value="">Select an API key</option>
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.label} ({key.client_name || "Unassigned"}) &middot; {key.total_calls || 0} calls
                  </option>
                ))}
              </select>

              <div className="mt-4 ibm-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-[#6b7280]">Selected Key</div>
                    <div className="font-semibold text-[#0f172a]">
                      {apiKeys.find((key) => key.id === selectedKeyId)?.label || "No key selected"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#6b7280]">30-Day Total Calls</div>
                    <div className="text-xl font-bold text-[#0f172a]">
                      {apiKeys.find((key) => key.id === selectedKeyId)?.total_calls || 0}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <UsageChart data={usage.length ? usage : [{ day: "No data", calls: 0 }]} />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
