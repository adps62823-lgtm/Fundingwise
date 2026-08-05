import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProject } from "../../api/projects";
import { getCivicScore } from "../../api/reports";
import ScoreCard from "../../components/ScoreCard";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [reports, setReports] = useState([]);
  const [score, setScore] = useState(null);

  useEffect(() => {
    getProject(id).then((response) => {
      setProject(response.data.project);
      setReports(response.data.reports || []);
    });
    getCivicScore("project", id).then((response) => setScore(response.data));
  }, [id]);

  if (!project) return <div className="fw-container py-10 text-[#747474]">Loading project...</div>;

  return (
    <div className="fw-container py-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_360px]">
        <section className="slds-page-shell p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#0176d3]">Public project detail</p>
              <h1 className="slds-page-title mt-2">{project.title}</h1>
              <p className="mt-3 max-w-3xl text-[#444444]">{project.description}</p>
            </div>
            <span className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm text-[#0176d3]">{project.status}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#444444]">
            <span className="rounded-full bg-[#fafaf9] px-4 py-2">{project.city}</span>
            <span className="rounded-full bg-[#fafaf9] px-4 py-2">{project.ward}</span>
            <span className="rounded-full bg-[#fafaf9] px-4 py-2">{project.category}</span>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-[#181818]">Recent reports</h2>
            <div className="mt-4 space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="rounded-[4px] border border-[#c9c9c9] bg-white p-4 shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold capitalize text-[#181818]">{report.report_type.replaceAll("_", " ")}</span>
                    <span className="text-xs text-[#747474]">{new Date(report.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#444444]">{report.note || "No note provided."}</p>
                </div>
              ))}
              {!reports.length && <p className="text-sm text-[#747474]">No public reports yet.</p>}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-[4px] bg-[#0176d3] px-5 py-3 font-semibold text-white" to={`/report/new?projectId=${project.id}`}>
              Report an issue / update
            </Link>
            <Link className="rounded-[4px] border border-[#aeaeae] px-5 py-3 font-semibold text-[#0176d3]" to={`/projects/${project.id}/timeline`}>
              View full transparency history
            </Link>
          </div>
        </section>

        <aside className="space-y-6">
          <ScoreCard score={score?.score ?? 0} label="Project civic score" />
          <div className="slds-page-shell p-6">
            <h3 className="text-lg font-semibold text-[#181818]">Project facts</h3>
            <dl className="mt-4 space-y-3 text-sm text-[#444444]">
              <div className="flex justify-between gap-4"><dt>Ward</dt><dd>{project.ward}</dd></div>
              <div className="flex justify-between gap-4"><dt>City</dt><dd>{project.city}</dd></div>
              <div className="flex justify-between gap-4"><dt>Category</dt><dd>{project.category}</dd></div>
              <div className="flex justify-between gap-4"><dt>Status</dt><dd>{project.status}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
