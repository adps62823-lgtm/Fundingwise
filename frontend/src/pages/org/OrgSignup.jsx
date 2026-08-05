import React from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { orgSignup } from "../../api/subscriptions";

export default function OrgSignup() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    type: "municipal_corporation",
    city: "",
    state: "",
    contact_email: "",
    contact_phone: "",
    requested_tier: searchParams.get("tier") || "trial",
  });
  const [success, setSuccess] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    await orgSignup(form);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="fw-container py-16">
        <div className="ibm-panel mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold text-[#111827]">Request received</h1>
          <p className="mt-4 text-[#4b5563]">
            We will confirm the organization profile and enable access once the account is provisioned.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fw-container py-10">
      <div className="ibm-hero overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_.92fr]">
          <div className="p-8 md:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e6ff] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f62fe]">
              Organization onboarding
            </div>
            <h1 className="ibm-title mt-6">Request access for a municipal organization.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#4b5563]">
              This starts the provisioning flow so your team can manage projects, plan labor, and control inventory inside Fundingwise.
            </p>
          </div>

          <form onSubmit={submit} className="border-t border-[#e5edf7] bg-white/80 p-8 md:p-10 lg:border-l lg:border-t-0">
            <h2 className="text-2xl font-semibold text-[#111827]">Organization access request</h2>
            <p className="mt-2 text-sm text-[#4b5563]">Use this for the paid or enterprise path, not for public citizen accounts.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input className="ibm-input" placeholder="Organization name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="ibm-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="municipal_corporation">Municipal corporation</option>
                <option value="panchayat">Panchayat</option>
                <option value="department">Department</option>
              </select>
              <input className="ibm-input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <input className="ibm-input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              <input className="ibm-input" placeholder="Contact email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              <input className="ibm-input" placeholder="Contact phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              <select className="ibm-input md:col-span-2" value={form.requested_tier} onChange={(e) => setForm({ ...form, requested_tier: e.target.value })}>
                <option value="trial">Trial</option>
                <option value="standard">Standard</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <button className="ibm-button-primary mt-6" type="submit">
              Submit request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
