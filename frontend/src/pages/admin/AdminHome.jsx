import React, { useEffect, useMemo, useState } from "react";
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

function SummaryCard({ label, value }) {
  return (
    <div className="ibm-kpi">
      <div className="ibm-kpi__label">{label}</div>
      <div className="ibm-kpi__value">{value}</div>
    </div>
  );
}

export default function AdminHome() {
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [activeTab, setActiveTab] = useState("orgs");
  const [apiKeyForm, setApiKeyForm] = useState({ client_name: "", label: "", org_id: "" });
  const [createdKey, setCreatedKey] = useState("");

  const refresh = async () => {
    const [pendingResponse, orgResponse, keyResponse] = await Promise.all([
      listPendingOrgs(),
      listOrganizations(),
      listApiKeys(),
    ]);
    setPendingOrgs(pendingResponse.data || []);
    setOrganizations(orgResponse.data || []);
    setApiKeys(keyResponse.data || []);
    if (!selectedKeyId && keyResponse.data?.[0]?.id) {
      setSelectedKeyId(keyResponse.data[0].id);
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

    getApiKeyUsage(selectedKeyId).then((response) => {
      const daily = response.data?.daily_usage || {};
      const rows = Object.entries(daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([day, calls]) => ({ day: day.slice(5), calls }));
      setUsage(rows);
    });
  }, [selectedKeyId]);

  const summary = useMemo(
    () => ({
      totalOrgs: organizations.length,
      activeOrgs: organizations.filter((org) => org.subscription_status === "active").length,
      pendingOrgs: pendingOrgs.length,
      keys: apiKeys.length,
    }),
    [organizations, pendingOrgs, apiKeys],
  );

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

  return (
    <div className="fw-container py-10">
      <div className="ibm-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="ibm-title text-4xl">Admin Console</h1>
            <p className="mt-2 max-w-3xl text-[#4b5563]">
              Manage organizations, subscriptions, and B2B API access from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryCard label="Organizations" value={summary.totalOrgs} />
            <SummaryCard label="Active orgs" value={summary.activeOrgs} />
            <SummaryCard label="Pending" value={summary.pendingOrgs} />
            <SummaryCard label="API keys" value={summary.keys} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            className={activeTab === "orgs" ? "ibm-button-primary" : "ibm-button-ghost"}
            onClick={() => setActiveTab("orgs")}
          >
            Organizations
          </button>
          <button
            className={activeTab === "keys" ? "ibm-button-primary" : "ibm-button-ghost"}
            onClick={() => setActiveTab("keys")}
          >
            API Keys
          </button>
        </div>

        {activeTab === "orgs" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
            <section>
              <h2 className="text-xl font-semibold text-[#0f172a]">Subscription requests</h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Organizations that submitted the "Request Access" form on the Pricing page, waiting on manual approval.
              </p>
              <div className="mt-4 space-y-3">
                {pendingOrgs.map((org) => (
                  <div key={org.id} className="ibm-panel">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#0f172a]">{org.name}</div>
                        <div className="text-sm text-[#4b5563]">
                          {org.city}, {org.state} &middot; {org.type}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#6b7280]">
                          Requested tier: {org.subscription_tier}
                        </div>
                        {(org.contact_email || org.contact_phone) && (
                          <div className="mt-2 text-sm text-[#4b5563]">
                            {org.contact_email && <div>Email: {org.contact_email}</div>}
                            {org.contact_phone && <div>Phone: {org.contact_phone}</div>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="ibm-button-primary" onClick={() => handleApprove(org.id)}>
                          Approve
                        </button>
                        <button className="ibm-button-secondary" onClick={() => handleSuspend(org.id)}>
                          Suspend
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {!pendingOrgs.length && <p className="text-sm text-[#6b7280]">No pending subscription requests right now.</p>}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-[#0f172a]">All organizations</h2>
              <div className="max-h-[26rem] space-y-3 overflow-auto pr-1">
                {organizations.map((org) => (
                  <div key={org.id} className="ibm-panel">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#0f172a]">{org.name}</div>
                        <div className="text-sm text-[#4b5563]">
                          {org.city}, {org.state}
                        </div>
                      </div>
                      <span className="ibm-chip">{org.subscription_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "keys" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.95fr]">
            <section>
              <h2 className="text-xl font-semibold text-[#0f172a]">Create API key</h2>
              <form onSubmit={handleCreateApiKey} className="mt-4 space-y-3">
                <input className="ibm-input" placeholder="Client name" value={apiKeyForm.client_name} onChange={(e) => setApiKeyForm({ ...apiKeyForm, client_name: e.target.value })} />
                <input className="ibm-input" placeholder="Label" value={apiKeyForm.label} onChange={(e) => setApiKeyForm({ ...apiKeyForm, label: e.target.value })} />
                <input className="ibm-input" placeholder="Optional organization id" value={apiKeyForm.org_id} onChange={(e) => setApiKeyForm({ ...apiKeyForm, org_id: e.target.value })} />
                <button className="ibm-button-primary" type="submit">
                  Generate key
                </button>
              </form>

              {createdKey && (
                <div className="mt-4 rounded-[4px] border border-[#c9c9c9] bg-[#eef4ff] p-4 text-sm text-[#0176d3]">
                  New API key: <span className="font-mono">{createdKey}</span>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#0f172a]">Usage dashboard</h2>
              <select className="ibm-select mt-4" value={selectedKeyId} onChange={(e) => setSelectedKeyId(e.target.value)}>
                <option value="">Select an API key</option>
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.label} ({key.total_calls || 0} calls)
                  </option>
                ))}
              </select>

              <div className="mt-4 ibm-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-[#6b7280]">Selected key</div>
                    <div className="font-semibold text-[#0f172a]">
                      {apiKeys.find((key) => key.id === selectedKeyId)?.label || "No key selected"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#6b7280]">Lifetime calls</div>
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
