import React from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProjectFullState, publishVersion } from "../../api/ai_planning";
import VersionBadge from "../../components/VersionBadge";

export default function AIReviewBudget() {
  const { id } = useParams();
  const [version, setVersion] = useState(null);

  useEffect(() => {
    getProjectFullState(id).then((response) => {
      const latest = response.data.versions?.[0];
      setVersion(latest || null);
    });
  }, [id]);

  if (!version) return <div className="fw-container py-10 text-[#525252]">Loading AI draft...</div>;

  const updateLine = (index, field, value) => {
    setVersion({
      ...version,
      cost_breakdown: version.cost_breakdown.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)),
    });
  };

  const save = async () => {
    await publishVersion(id, version.id, { cost_breakdown: version.cost_breakdown }, "Budget updated");
    alert("Budget saved as new version");
  };

  return (
    <div className="fw-container py-8">
      <div className="ibm-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#161616]">AI Budget Planner</h1>
            <p className="mt-2 text-[#525252]">Edit the draft cost plan before publishing the next version.</p>
          </div>
          <VersionBadge status={version.status} />
        </div>
        <div className="mt-6 space-y-3">
          {version.cost_breakdown?.map((row, index) => (
            <div key={index} className="grid gap-3 border border-[#e0e0e0] p-4 md:grid-cols-[1.5fr_.8fr_1fr]">
              <input className="ibm-input" value={row.item} onChange={(e) => updateLine(index, "item", e.target.value)} />
              <input className="ibm-input" value={row.category} onChange={(e) => updateLine(index, "category", e.target.value)} />
              <input type="number" className="ibm-input" value={row.estimated_cost_inr} onChange={(e) => updateLine(index, "estimated_cost_inr", Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={save} className="ibm-button-primary" type="button">Save changes as new version</button>
          <Link className="ibm-button-secondary" to={`/dashboard/projects/${id}/schedule-plan`}>Continue to schedule planning</Link>
        </div>
      </div>
    </div>
  );
}

