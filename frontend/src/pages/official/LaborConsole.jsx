import React, { useEffect, useMemo, useState } from "react";
import { getProjectFullState, listOrgProjects } from "../../api/ai_planning";
import { createAssignment, createWorker, listWorkers, updateAssignment, updateWorker } from "../../api/labor";
import ScheduleTable from "../../components/ScheduleTable";

function MultiSelect({ value, options, onChange }) {
  return (
    <select
      multiple
      value={value}
      onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))}
      className="ibm-select min-h-28"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name} - {option.role}
        </option>
      ))}
    </select>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="ibm-kpi">
      <div className="ibm-kpi__label">{label}</div>
      <div className="ibm-kpi__value">{value}</div>
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <div className="ibm-kpi max-w-sm">
      <div className="ibm-kpi__label">Selected project</div>
      <div className="mt-1 text-lg font-semibold text-[#0f172a]">{project.title}</div>
      <div className="text-sm text-[#4b5563]">
        {project.ward} - {project.city}
      </div>
    </div>
  );
}

export default function LaborConsole() {
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectState, setProjectState] = useState(null);
  const [workerForm, setWorkerForm] = useState({ name: "", code: "", role: "", phone: "" });
  const [drafts, setDrafts] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    listWorkers().then((response) => setWorkers(response.data || []));
    listOrgProjects().then((response) => setProjects(response.data || []));
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setProjectState(null);
      setDrafts({});
      return;
    }

    getProjectFullState(selectedProject).then((response) => {
      const fullState = response.data || {};
      setProjectState(fullState);

      const seed = {};
      const schedule = fullState.versions?.[0]?.schedule || [];
      schedule.forEach((task, index) => {
        const existing = fullState.assignments_by_task?.[String(index)]?.[0];
        seed[index] = existing
          ? {
              id: existing.id,
              worker_ids: existing.worker_ids || [],
              status: existing.status || "scheduled",
              notes: existing.notes || "",
            }
          : {
              worker_ids: [],
              status: "scheduled",
              notes: "",
            };
      });
      setDrafts(seed);
    });
  }, [selectedProject]);

  const currentSchedule = projectState?.versions?.[0]?.schedule || [];
  const assignmentGroups = useMemo(() => projectState?.assignments_by_task || {}, [projectState]);
  const selectedProjectInfo = useMemo(
    () => projects.find((project) => project.id === selectedProject),
    [projects, selectedProject],
  );

  const activeWorkers = workers.filter((worker) => worker.active !== false);
  const activeAssignmentCount = Object.values(assignmentGroups).reduce((count, list) => count + (list?.length || 0), 0);

  const addWorker = async () => {
    if (!workerForm.name.trim() || !workerForm.code.trim()) {
      setStatusMessage("Worker name and code are required.");
      return;
    }

    const response = await createWorker(workerForm);
    setWorkers((current) => [...current, response.data]);
    setWorkerForm({ name: "", code: "", role: "", phone: "" });
    setStatusMessage(`Worker ${response.data.name} added to the roster.`);
  };

  const toggleWorkerActive = async (worker) => {
    const response = await updateWorker(worker.id, { active: !worker.active });
    setWorkers((current) => current.map((item) => (item.id === worker.id ? response.data : item)));
    setStatusMessage(`${response.data.name} marked ${response.data.active ? "active" : "inactive"}.`);
  };

  const saveAssignment = async (taskIndex) => {
    const draft = drafts[taskIndex];
    if (!draft) return;

    const payload = {
      project_id: selectedProject,
      task_index: taskIndex,
      worker_ids: draft.worker_ids || [],
      status: draft.status || "scheduled",
      notes: draft.notes || "",
    };

    const response = draft.id ? await updateAssignment(draft.id, payload) : await createAssignment(payload);

    setDrafts((current) => ({
      ...current,
      [taskIndex]: {
        id: response.data.id,
        worker_ids: response.data.worker_ids || [],
        status: response.data.status || "scheduled",
        notes: response.data.notes || "",
      },
    }));

    setProjectState((current) => ({
      ...current,
      assignments_by_task: {
        ...(current?.assignments_by_task || {}),
        [String(taskIndex)]: [response.data],
      },
    }));

    setStatusMessage(`Task "${currentSchedule[taskIndex]?.task}" saved.`);
  };

  return (
    <div className="fw-container py-8">
      <div className="ibm-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="ibm-title text-3xl">Labor Console</h1>
            <p className="mt-2 max-w-2xl text-[#4b5563]">
              Build the worker roster and assign crews to each scheduled task with a clearer, task-first workflow.
            </p>
          </div>
          {selectedProjectInfo ? (
            <ProjectCard project={selectedProjectInfo} />
          ) : (
            <div className="ibm-kpi max-w-sm">
              <div className="ibm-kpi__label">Selected project</div>
              <div className="mt-1 text-sm text-[#4b5563]">Select a project to view task assignments.</div>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="mt-6 rounded-[4px] border border-[#c9c9c9] bg-[#eef4ff] px-4 py-3 text-sm text-[#0176d3]">
            {statusMessage}
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <StatPill label="Workers" value={workers.length} />
          <StatPill label="Active workers" value={activeWorkers.length} />
          <StatPill label="Tasks" value={currentSchedule.length} />
          <StatPill label="Assignments" value={activeAssignmentCount} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-5">
            <div className="ibm-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#0f172a]">Worker roster</h2>
                <span className="ibm-chip">{activeWorkers.length} active</span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {["name", "code", "role", "phone"].map((field) => (
                  <input
                    key={field}
                    className="ibm-input"
                    placeholder={field}
                    value={workerForm[field]}
                    onChange={(e) => setWorkerForm({ ...workerForm, [field]: e.target.value })}
                  />
                ))}
              </div>

              <button onClick={addWorker} className="ibm-button-primary mt-4">
                Add worker
              </button>
            </div>

            <div className="space-y-3">
              {workers.map((worker) => (
                <div key={worker.id} className="ibm-panel">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#0f172a]">{worker.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#5f6f86]">
                        <span className="ibm-chip">{worker.code}</span>
                        <span className="ibm-chip">{worker.role}</span>
                        <span className="ibm-chip">{worker.phone || "No phone"}</span>
                      </div>
                    </div>
                    <button onClick={() => toggleWorkerActive(worker)} className={worker.active ? "ibm-button-success" : "ibm-button-secondary"}>
                      {worker.active ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              ))}

              {!workers.length && <div className="ibm-empty">Add a few workers first so task assignment feels immediate.</div>}
            </div>
          </section>

          <section className="space-y-5">
            <div className="ibm-panel">
              <h2 className="text-xl font-semibold text-[#0f172a]">Project schedule assignments</h2>
              <p className="mt-2 text-sm text-[#4b5563]">
                Pick a project, then assign one or more workers to each task in the published schedule.
              </p>
              <select className="ibm-select mt-4" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {currentSchedule.length > 0 && (
              <div className="space-y-4">
                <ScheduleTable rows={currentSchedule} onChangeRow={() => {}} onRemoveRow={() => {}} />

                {currentSchedule.map((task, index) => {
                  const draft = drafts[index] || { worker_ids: [], status: "scheduled", notes: "" };
                  const assignedNames = (assignmentGroups[String(index)]?.[0]?.worker_ids || draft.worker_ids || [])
                    .map((workerId) => workers.find((worker) => worker.id === workerId)?.name)
                    .filter(Boolean);

                  return (
                    <div key={`${index}-${task.task}`} className="ibm-panel">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="ibm-kpi__label">Task {index + 1}</div>
                          <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{task.task}</h3>
                          <p className="text-sm text-[#4b5563]">
                            Day {task.day_start} to {task.day_end} -{" "}
                            {assignedNames.length ? `${assignedNames.length} worker(s) assigned` : "No assignment yet"}
                          </p>
                        </div>
                        <span className="ibm-chip uppercase tracking-[0.18em]">{draft.status}</span>
                      </div>

                      {assignedNames.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {assignedNames.map((name) => (
                            <span key={name} className="ibm-badge ibm-badge--success">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_.7fr]">
                        <div>
                          <label className="block text-sm text-[#4b5563]">Assigned workers</label>
                          <MultiSelect
                            value={draft.worker_ids || []}
                            options={activeWorkers}
                            onChange={(worker_ids) =>
                              setDrafts((current) => ({
                                ...current,
                                [index]: { ...draft, worker_ids },
                              }))
                            }
                          />
                          <p className="mt-2 text-xs text-[#5f6f86]">Hold Ctrl or Cmd to select multiple workers.</p>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-sm text-[#4b5563]">
                            Status
                            <select
                              value={draft.status || "scheduled"}
                              onChange={(e) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [index]: { ...draft, status: e.target.value },
                                }))
                              }
                              className="ibm-select mt-2"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="in_progress">In progress</option>
                              <option value="done">Done</option>
                              <option value="skipped">Skipped</option>
                            </select>
                          </label>

                          <label className="block text-sm text-[#4b5563]">
                            Notes
                            <textarea
                              value={draft.notes || ""}
                              onChange={(e) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [index]: { ...draft, notes: e.target.value },
                                }))
                              }
                              className="ibm-textarea mt-2 min-h-24"
                              placeholder="Optional instructions or blockers..."
                            />
                          </label>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button onClick={() => saveAssignment(index)} className="ibm-button-primary">
                          Save assignment
                        </button>
                        <span className="self-center text-sm text-[#5f6f86]">
                          This writes or updates the task assignment for the selected project.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedProject && currentSchedule.length === 0 && (
              <div className="ibm-empty">This project does not have a schedule yet. Create and publish an AI draft first.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
