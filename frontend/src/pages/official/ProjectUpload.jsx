import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, generateAiDraft } from "../../api/ai_planning";

export default function ProjectUpload() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    ward: "",
    city: "",
    category: "road",
    location: { type: "Point", coordinates: [77.43, 23.22] },
  });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const response = await createProject(form);
    const projectId = response.data.id;
    await generateAiDraft(projectId, form.description);
    navigate(`/dashboard/projects/${projectId}/budget-plan`);
  };

  return (
    <div className="fw-container py-10">
      <form onSubmit={submit} className="ibm-panel mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold text-[#161616]">New project</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input className="ibm-input md:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="ibm-input min-h-40 md:col-span-2" placeholder="Synopsis / description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="ibm-input" placeholder="Ward" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
          <input className="ibm-input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <select className="ibm-input md:col-span-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="road">Road</option>
            <option value="drain">Drain</option>
            <option value="streetlight">Streetlight</option>
            <option value="sanitation">Sanitation</option>
            <option value="water_supply">Water supply</option>
            <option value="other">Other</option>
          </select>
        </div>
        <p className="mt-4 text-sm text-[#525252]">AI planning will generate a first draft right after creation.</p>
        <button disabled={loading} className="ibm-button-primary mt-6" type="submit">
          {loading ? "AI is estimating..." : "Create and draft"}
        </button>
      </form>
    </div>
  );
}

