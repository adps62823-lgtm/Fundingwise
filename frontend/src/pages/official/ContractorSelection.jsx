import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectFullState, publishVersion } from "../../api/ai_planning";

export default function ContractorSelection() {
  const { id } = useParams();
  const [version, setVersion] = useState(null);

  useEffect(() => {
    getProjectFullState(id).then((response) => setVersion(response.data.versions?.[0] || null));
  }, [id]);

  if (!version) return <div className="fw-container py-10 text-[#747474]">Loading contractors...</div>;

  const select = async (contractor) => {
    await publishVersion(id, version.id, { assigned_contractor: contractor }, "Contractor selected");
    alert("Contractor selection saved");
  };

  return (
    <div className="fw-container py-8">
      <div className="slds-page-shell p-8">
        <h1 className="slds-page-title">Contractor Selection</h1>
        <p className="mt-2 text-[#444444]">AI-suggested, unverified contractor options.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(version.contractor_suggestions || []).map((contractor, index) => (
            <div key={index} className="rounded-[4px] border border-[#c9c9c9] bg-white p-5 shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#181818]">{contractor.name}</h2>
                  <p className="text-sm text-[#444444]">{contractor.specialty}</p>
                </div>
                <span className="rounded-full bg-[#fff8e1] px-3 py-1 text-xs text-[#b78103]">Unverified</span>
              </div>
              <button onClick={() => select(contractor)} className="mt-5 rounded-[4px] bg-[#0176d3] px-5 py-3 font-semibold text-white">
                Select this contractor
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
