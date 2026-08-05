import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOrgProjects } from "../../api/ai_planning";

export default function CommandDashboard() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    listOrgProjects().then((response) => setProjects(response.data || []));
  }, []);

  return (
    <div className="fw-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-[#161616]">Command Center</h1>
          <p className="mt-2 text-[#525252]">Manage projects, versions, labor, and inventory.</p>
        </div>
        <Link className="ibm-button-primary" to="/dashboard/projects/new">+ New Project</Link>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/dashboard/projects/${project.id}/budget-plan`}
            className="ibm-panel transition hover:-translate-y-1"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-[#161616]">{project.title}</h2>
              <span className="ibm-badge ibm-badge--primary">{project.status}</span>
            </div>
            <p className="mt-2 text-sm text-[#525252]">{project.ward} - {project.city}</p>
            <div className="mt-6 text-sm text-[#525252]">Open project workspace</div>
          </Link>
        ))}
        {!projects.length && (
          <div className="ibm-panel text-sm text-[#525252]">
            No projects yet. Create the first Fundingwise project to start the command flow.
          </div>
        )}
      </div>
    </div>
  );
}

