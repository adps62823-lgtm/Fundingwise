import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { submitReport } from "../../api/reports";

export default function ReportForm() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [form, setForm] = useState({
    report_type: "issue",
    note: "",
    photo_url: "",
    location: { type: "Point", coordinates: [0, 0] },
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setForm((prev) => ({
          ...prev,
          location: { type: "Point", coordinates: [position.coords.longitude, position.coords.latitude] },
        }));
      });
    }
  }, []);

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, photo_url: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    await submitReport({ ...form, project_id: projectId });
    setMessage("Report submitted successfully.");
  };

  return (
    <div className="fw-container py-8">
      <form onSubmit={submit} className="slds-page-shell mx-auto max-w-2xl p-8">
        <h1 className="slds-page-title">Submit a report</h1>
        <p className="mt-2 text-sm text-[#444444]">Fundingwise accepts a photo, a note, and a location for public verification.</p>
        {message && <div className="mt-4 rounded-[4px] border border-[#c9c9c9] bg-[#eef4ff] px-4 py-3 text-sm text-[#0176d3]">{message}</div>}
        <label className="mt-6 block text-sm">
          Report type
          <select className="mt-2 w-full rounded-[4px] border border-[#aeaeae] bg-white px-4 py-3 outline-none" value={form.report_type} onChange={(e) => setForm({ ...form, report_type: e.target.value })}>
            <option value="issue">Issue</option>
            <option value="progress_update">Progress update</option>
            <option value="completion_claim">Completion claim</option>
          </select>
        </label>
        <label className="mt-4 block text-sm">
          Note
          <textarea className="mt-2 min-h-32 w-full rounded-[4px] border border-[#aeaeae] bg-white px-4 py-3 outline-none" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <label className="mt-4 block text-sm">
          Photo
          <input type="file" accept="image/*" className="mt-2 block w-full text-sm" onChange={uploadPhoto} />
        </label>
        <div className="mt-4 rounded-[4px] border border-[#c9c9c9] bg-[#fafaf9] px-4 py-3 text-sm text-[#444444]">
          Location: {form.location.coordinates[1] || "unknown"}, {form.location.coordinates[0] || "unknown"}
        </div>
        <button className="mt-6 rounded-[4px] bg-[#0176d3] px-5 py-3 font-semibold text-white">Submit report</button>
      </form>
    </div>
  );
}
