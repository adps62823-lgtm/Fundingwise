import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicVersionHistory } from "../../api/versions";
import VersionBadge from "../../components/VersionBadge";

export default function TransparencyTimeline() {
  const { id } = useParams();
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    getPublicVersionHistory(id).then((response) => setVersions(response.data || []));
  }, [id]);

  return (
    <div className="fw-container py-10">
      <div className="slds-page-shell p-8">
        <h1 className="slds-page-title">Transparency Timeline</h1>
        <p className="mt-2 text-[#444444]">A complete version history of the project. Nothing disappears here.</p>
        <div className="relative mt-10 pl-6">
          <div className="absolute left-3 top-0 h-full w-px bg-gradient-to-b from-[#0176d3] via-[#b78103] to-transparent" />
          <div className="space-y-6">
            {versions.map((version) => (
              <div key={version.id} className="relative rounded-[4px] border border-[#c9c9c9] bg-white p-5 shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
                <div className="absolute -left-[1.9rem] top-6 h-4 w-4 rounded-full border-4 border-white bg-[#0176d3]" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-[#181818]">Version {version.version_number}</h2>
                  <VersionBadge status={version.status} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[#444444] md:grid-cols-2">
                  <div>Total estimated cost: {version.total_estimate_inr ? `Rs ${version.total_estimate_inr.toLocaleString()}` : "n/a"}</div>
                  <div>Duration: {version.duration_days ? `${version.duration_days} days` : "n/a"}</div>
                  <div>Edited by: {version.edited_by || "AI Draft"}</div>
                  <div>Timestamp: {version.created_at ? new Date(version.created_at).toLocaleString() : "n/a"}</div>
                </div>
              </div>
            ))}
            {!versions.length && <p className="text-sm text-[#747474]">No public versions have been published yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
