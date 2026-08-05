import React from "react";
export default function ScoreCard({ score, label }) {
  const numeric = typeof score === "number" ? score : score?.score ?? 0;
  const tone = numeric >= 70 ? "text-[#24a148]" : numeric >= 40 ? "text-[#f1c21b]" : "text-[#da1e28]";
  return (
    <div className="ibm-kpi">
      <p className="ibm-kpi__label">{label}</p>
      <div className={`ibm-kpi__value ${tone}`}>{numeric}</div>
      <p className="ibm-kpi__subtext">0 to 100 civic trust indicator</p>
    </div>
  );
}

