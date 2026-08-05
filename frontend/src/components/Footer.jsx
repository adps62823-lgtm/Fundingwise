import React from "react";
import { BRAND } from "../config/brand";

export default function Footer() {
  return (
    <footer className="ibm-panel">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <img src={BRAND.logoIconDark} alt={BRAND.name} className="h-10 w-10" />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[#181818]">{BRAND.name}</div>
              <div className="ibm-caption">{BRAND.tagline}</div>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#444444]">
            Fundingwise is a civic operations platform for municipal reporting, planning, funding visibility, and organization access.
          </p>
        </div>

        <div>
          <h3 className="ibm-section-title">Team</h3>
          <ul className="mt-4 space-y-2">
            {BRAND.team.map((member) => (
              <li key={member.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold text-[#181818]">{member.name}</span>
                <span className="text-[#747474]">-</span>
                <span className="text-[#444444]">{member.role}</span>
                <span className="text-[#747474]">({member.note})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
