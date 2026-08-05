import React from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../../config/brand";

const audienceCards = [
  {
    title: "Citizen view",
    text: "Browse the public map, file complaints, and track updates without needing an internal account.",
    cta: "Open citizen sign in",
    to: "/login?role=citizen",
  },
  {
    title: "Official workspace",
    text: "Manage projects, labor, inventory, and planning tools with a dedicated official entry point.",
    cta: "Open official sign in",
    to: "/login?role=official",
  },
  {
    title: "Organization access",
    text: "Show paid access, department provisioning, and team onboarding for municipal partners.",
    cta: "View organization access",
    to: "/org-signup",
  },
];

const summaryStats = [
  { label: "Dummy wards", value: "12", note: "Representative ward coverage" },
  { label: "Open complaints", value: "42", note: "Illustrative public issues" },
  { label: "Reports in feed", value: "18", note: "Sample status updates" },
];

const wardSnapshot = [
  { ward: "Ward 7", city: "Indore", focus: "Drainage repair", reports: 14, status: "Open" },
  { ward: "Ward 12", city: "Bhopal", focus: "Streetlight rollout", reports: 9, status: "In progress" },
  { ward: "Ward 4", city: "Raipur", focus: "Road patching", reports: 21, status: "Queued" },
];

const dummyComplaints = [
  { id: "FW-201", title: "Pothole near bus stop", ward: "Ward 7", location: "MG Road", state: "Open" },
  { id: "FW-214", title: "Broken streetlight cluster", ward: "Ward 12", location: "Lake View Colony", state: "Assigned" },
  { id: "FW-228", title: "Overflowing drain channel", ward: "Ward 4", location: "Station road", state: "Resolved" },
];

const dummyUsers = [
  { name: "Citizen A", role: "Citizen", access: "Report issues and track progress" },
  { name: "Official B", role: "Official", access: "Publish updates and manage operations" },
  { name: "Org Admin", role: "Organization", access: "Request paid access and manage seats" },
];

const dummyLocations = [
  { label: "Ward office", value: "North civic office" },
  { label: "Work site", value: "Canal road junction" },
  { label: "Support desk", value: "Operations hub" },
];

const plans = [
  {
    name: "Free",
    price: "Rs 0",
    summary: "Public browsing, complaint reporting, and citizen tracking.",
    features: ["Public map", "Complaint submission", "Status tracking"],
  },
  {
    name: "Team",
    price: "Rs 4,999/mo",
    summary: "Official planning, labor coordination, and inventory control.",
    features: ["Official dashboard", "Labor console", "Inventory dispatch"],
  },
  {
    name: "Organization",
    price: "Custom",
    summary: "Multi-department access, provisioning, and API usage.",
    features: ["Department onboarding", "Role-based seats", "B2B API access"],
  },
];

export default function HomeLanding() {
  return (
    <div className="fw-stack">
      <section className="ibm-hero p-6 md:p-8 lg:p-10">
        <div className="ibm-hero__accent" />
        <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e6ff] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f62fe]">
              Public civic operations
            </div>
            <h1 className="ibm-title mt-5 max-w-4xl">
              Fundingwise keeps citizen complaints, official planning, and organization access in one organized place.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[#4b5563]">
              The homepage now reads like a product: citizens get public visibility, officials get a separate workspace,
              and organizations can see the paid path without mixing everything into one long page.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/map" className="ibm-button-primary">
                Open public map
              </Link>
              <Link to="/report/new" className="ibm-button-ghost">
                Submit a complaint
              </Link>
              <Link to="/login?role=official" className="ibm-button-secondary">
                Official sign in
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {summaryStats.map((item) => (
                <div key={item.label} className="ibm-kpi">
                  <div className="ibm-kpi__label">{item.label}</div>
                  <div className="ibm-kpi__value">{item.value}</div>
                  <div className="ibm-kpi__subtext">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="ibm-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="ibm-caption">Brand</div>
                  <div className="mt-1 text-lg font-semibold text-[#111827]">{BRAND.name} workspace</div>
                </div>
                <span className="ibm-badge ibm-badge--primary">Sample data</span>
              </div>
              <div className="mt-4">
                <img src={BRAND.logoLandscape} alt={BRAND.name} className="w-full" />
              </div>
            </div>

            <div className="ibm-panel">
              <div className="ibm-caption">Entry paths</div>
              <div className="mt-4 grid gap-3">
                {audienceCards.map((card) => (
                  <div key={card.title} className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] p-4">
                    <div className="text-sm font-semibold text-[#111827]">{card.title}</div>
                    <div className="mt-1 text-sm text-[#4b5563]">{card.text}</div>
                    <Link to={card.to} className="mt-3 inline-flex text-sm font-semibold text-[#0f62fe]">
                      {card.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="ibm-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="ibm-section-title">Dummy civic data</h2>
              <p className="ibm-caption mt-2">Representative wards, complaints, locations, and users for the product story.</p>
            </div>
            <span className="ibm-badge">Public preview</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {wardSnapshot.map((item) => (
              <div key={item.ward} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <div className="text-sm font-semibold text-[#111827]">{item.ward}</div>
                <div className="mt-1 text-sm text-[#4b5563]">{item.city}</div>
                <div className="mt-3 text-sm text-[#4b5563]">Focus: {item.focus}</div>
                <div className="mt-1 text-sm text-[#4b5563]">Reports: {item.reports}</div>
                <div className="mt-1 text-sm text-[#4b5563]">Status: {item.status}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {dummyComplaints.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <div className="ibm-caption">{item.id}</div>
                <div className="mt-1 text-sm font-semibold text-[#111827]">{item.title}</div>
                <div className="mt-2 text-sm text-[#4b5563]">{item.ward}</div>
                <div className="mt-1 text-sm text-[#4b5563]">{item.location}</div>
                <div className="mt-1 text-sm text-[#4b5563]">{item.state}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ibm-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="ibm-section-title">Who sees what</h2>
              <p className="ibm-caption mt-2">Clear role labels with no real team names or internal notes.</p>
            </div>
            <span className="ibm-badge ibm-badge--primary">Role split</span>
          </div>

          <div className="mt-4 space-y-3">
            {dummyUsers.map((item) => (
              <div key={item.name} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[#111827]">{item.name}</div>
                  <span className="ibm-chip">{item.role}</span>
                </div>
                <div className="mt-2 text-sm text-[#4b5563]">{item.access}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
            <div className="text-sm font-semibold text-[#111827]">Key locations</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {dummyLocations.map((item) => (
                <div key={item.label} className="rounded-xl border border-[#e5edf7] bg-white p-3">
                  <div className="text-xs uppercase tracking-[0.14em] text-[#6b7280]">{item.label}</div>
                  <div className="mt-1 text-sm text-[#111827]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
        <div className="ibm-panel">
          <h2 className="ibm-section-title">Access paths</h2>
          <p className="ibm-caption mt-2">Separate entry points for citizens, officials, and organizations.</p>
          <div className="mt-5 grid gap-3">
            <Link className="ibm-panel flex items-center justify-between" to="/login?role=citizen">
              <span className="font-semibold text-[#111827]">Citizen sign in</span>
              <span className="ibm-chip">Reports and tracking</span>
            </Link>
            <Link className="ibm-panel flex items-center justify-between" to="/login?role=official">
              <span className="font-semibold text-[#111827]">Official sign in</span>
              <span className="ibm-chip">Planning and operations</span>
            </Link>
            <Link className="ibm-panel flex items-center justify-between" to="/register?role=official">
              <span className="font-semibold text-[#111827]">Official email/password sign up</span>
              <span className="ibm-chip">Dedicated workspace</span>
            </Link>
            <Link className="ibm-panel flex items-center justify-between" to="/org-signup">
              <span className="font-semibold text-[#111827]">Organization onboarding</span>
              <span className="ibm-chip">Department access</span>
            </Link>
          </div>
        </div>

        <div className="ibm-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="ibm-section-title">Free and paid access</h2>
              <p className="ibm-caption mt-2">Make the product tiers obvious before someone clicks into pricing.</p>
            </div>
            <span className="ibm-badge">Plans</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {plans.map((tier) => (
              <div key={tier.name} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] p-4">
                <span className={`ibm-badge ${tier.name === "Free" ? "ibm-badge--primary" : tier.name === "Team" ? "ibm-badge--success" : "ibm-badge--warning"}`}>
                  {tier.name}
                </span>
                <div className="mt-3 text-2xl font-bold text-[#111827]">{tier.price}</div>
                <div className="mt-2 text-sm text-[#4b5563]">{tier.summary}</div>
                <ul className="mt-4 space-y-2 text-sm text-[#4b5563]">
                  {tier.features.map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
                <Link className="mt-4 inline-flex text-sm font-semibold text-[#0f62fe]" to={tier.name === "Free" ? "/map" : "/pricing"}>
                  Explore
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
