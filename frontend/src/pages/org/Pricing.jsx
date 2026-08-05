import React from "react";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Free",
    price: "Rs 0",
    description: "Public browsing, complaint reporting, and citizen status tracking.",
    features: ["Public map", "Complaint submission", "Read-only project updates"],
  },
  {
    name: "Team",
    price: "Rs 4,999/mo",
    description: "Official planning, labor coordination, and inventory operations.",
    features: ["Official dashboard", "Labor console", "Inventory dispatch"],
  },
  {
    name: "Organization",
    price: "Custom",
    description: "Multi-department access, provisioning support, and B2B API usage.",
    features: ["Department onboarding", "Role-based seats", "API access"],
  },
];

export default function Pricing() {
  return (
    <div className="fw-container py-10">
      <section className="ibm-panel">
        <div className="max-w-3xl">
          <h1 className="ibm-title">Pricing and access tiers</h1>
          <p className="mt-4 text-base leading-7 text-[#4b5563]">
            This page makes the free, paid, and organization paths explicit so each audience can see the right access tier.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.name} className="rounded-3xl border border-[#e5edf7] bg-[#fbfdff] p-6">
              <span className={`ibm-badge ${tier.name === "Free" ? "ibm-badge--primary" : tier.name === "Team" ? "ibm-badge--success" : "ibm-badge--warning"}`}>
                {tier.name}
              </span>
              <div className="mt-4 text-4xl font-bold text-[#111827]">{tier.price}</div>
              <p className="mt-3 text-sm text-[#4b5563]">{tier.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-[#4b5563]">
                {tier.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <Link
                className="mt-6 inline-flex rounded-2xl bg-[#0f62fe] px-5 py-3 font-semibold text-white"
                to={tier.name === "Free" ? "/map" : "/org-signup?tier=" + tier.name.toLowerCase()}
              >
                {tier.name === "Free" ? "Open public map" : "Request access"}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-[#e5edf7] bg-[#f8fbff] p-6">
          <h2 className="ibm-section-title">What paid access unlocks</h2>
          <p className="mt-2 text-sm text-[#4b5563]">
            Paid and organization plans unlock the internal tooling that the public site cannot show to anonymous visitors.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[#e5edf7] bg-white p-4 text-sm text-[#4b5563]">Project planning and approvals</div>
            <div className="rounded-2xl border border-[#e5edf7] bg-white p-4 text-sm text-[#4b5563]">Labor and inventory coordination</div>
            <div className="rounded-2xl border border-[#e5edf7] bg-white p-4 text-sm text-[#4b5563]">Organization provisioning and API access</div>
          </div>
        </div>
      </section>
    </div>
  );
}
