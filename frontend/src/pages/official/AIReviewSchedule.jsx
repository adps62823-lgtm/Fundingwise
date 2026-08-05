import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProjectFullState, publishVersion } from "../../api/ai_planning";
import ScheduleTable from "../../components/ScheduleTable";
import VersionBadge from "../../components/VersionBadge";

export default function AIReviewSchedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    getProjectFullState(id).then((response) => setVersion(response.data.versions?.[0] || null));
  }, [id]);

  if (!version) return <div className="fw-container py-10 text-[#525252]">Loading schedule...</div>;

  const save = async () => {
    await publishVersion(id, version.id, { schedule: version.schedule }, notes);
    navigate("/dashboard");
  };

  const updateRow = (index, field, value) => {
    setVersion({
      ...version,
      schedule: version.schedule.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)),
    });
  };

  return (
    <div className="fw-container py-8">
      <div className="ibm-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#161616]">AI Schedule Planner</h1>
            <p className="mt-2 text-[#525252]">Edit the schedule and publish when ready.</p>
          </div>
          <VersionBadge status={version.status} />
        </div>
        <div className="mt-6">
          <ScheduleTable rows={version.schedule || []} onChangeRow={updateRow} onRemoveRow={(index) => setVersion({ ...version, schedule: version.schedule.filter((_, idx) => idx !== index) })} />
        </div>
        <textarea className="ibm-input mt-5 min-h-28" placeholder="Add a planning note" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button onClick={save} className="ibm-button-primary mt-5" type="button">Publish this version</button>
      </div>
    </div>
  );
}

