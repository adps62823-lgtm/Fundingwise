import React, { useEffect, useMemo, useState } from "react";
import { getProjectFullState, listOrgProjects } from "../../api/ai_planning";
import { createDispatch, createItem, listItems, updateDispatch, updateItem } from "../../api/inventory";
import ScheduleTable from "../../components/ScheduleTable";

function StatPill({ label, value }) {
  return (
    <div className="ibm-kpi">
      <div className="ibm-kpi__label">{label}</div>
      <div className="ibm-kpi__value">{value}</div>
    </div>
  );
}

function TaskDispatchForm({ task, draft, items, onChange, onSave, existingCount }) {
  return (
    <div className="ibm-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="ibm-kpi__label">Task</div>
          <h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{task.task}</h3>
          <p className="text-sm text-[#4b5563]">
            Day {task.day_start} to {task.day_end} - {existingCount ? `${existingCount} dispatch record(s)` : "No dispatch yet"}
          </p>
        </div>
        <span className="ibm-chip uppercase tracking-[0.18em]">{draft.status || "planned"}</span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
        <label className="block text-sm text-[#4b5563]">
          Item
          <select
            value={draft.item_id || ""}
            onChange={(e) => onChange({ ...draft, item_id: e.target.value })}
            className="ibm-select mt-2"
          >
            <option value="">Select item</option>
            {items.filter((item) => item.active !== false).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.type}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-[#4b5563]">
          Destination
          <input
            value={draft.destination || ""}
            onChange={(e) => onChange({ ...draft, destination: e.target.value })}
            className="ibm-input mt-2"
            placeholder="Ward office, depot, site..."
          />
        </label>

        <label className="block text-sm text-[#4b5563]">
          Dispatch date
          <input
            type="date"
            value={draft.dispatch_date || ""}
            onChange={(e) => onChange({ ...draft, dispatch_date: e.target.value })}
            className="ibm-input mt-2"
          />
        </label>

        <label className="block text-sm text-[#4b5563]">
          Status
          <select
            value={draft.status || "planned"}
            onChange={(e) => onChange({ ...draft, status: e.target.value })}
            className="ibm-select mt-2"
          >
            <option value="planned">Planned</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_.8fr]">
        <label className="block text-sm text-[#4b5563]">
          Notes
          <textarea
            value={draft.notes || ""}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            className="ibm-textarea mt-2 min-h-24"
            placeholder="Optional dispatch notes..."
          />
        </label>

        <div className="ibm-kpi">
          <div className="ibm-kpi__label">Quick view</div>
          <div className="mt-2 text-sm text-[#4b5563]">Task: {task.task}</div>
          <div className="text-sm text-[#4b5563]">Suggested labor: {task.suggested_labor_count || 0}</div>
          <div className="text-sm text-[#4b5563]">Equipment note: {task.suggested_equipment || "n/a"}</div>
        </div>
      </div>

      <button onClick={onSave} className="ibm-button-primary mt-4">
        Save dispatch
      </button>
    </div>
  );
}

export default function InventoryConsole() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectState, setProjectState] = useState(null);
  const [itemForm, setItemForm] = useState({ name: "", type: "", source: "", quantity: "", unit: "" });
  const [drafts, setDrafts] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    listItems().then((response) => setItems(response.data || []));
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
        const existing = fullState.dispatches_by_task?.[String(index)]?.[0];
        seed[index] = existing
          ? {
              id: existing.id,
              item_id: existing.item_id || "",
              destination: existing.destination || "",
              dispatch_date: existing.dispatch_date ? String(existing.dispatch_date).slice(0, 10) : "",
              status: existing.status || "planned",
              notes: existing.notes || "",
            }
          : {
              item_id: "",
              destination: "",
              dispatch_date: "",
              status: "planned",
              notes: "",
            };
      });
      setDrafts(seed);
    });
  }, [selectedProject]);

  const currentSchedule = projectState?.versions?.[0]?.schedule || [];
  const dispatchGroups = useMemo(() => projectState?.dispatches_by_task || {}, [projectState]);
  const selectedProjectInfo = useMemo(
    () => projects.find((project) => project.id === selectedProject),
    [projects, selectedProject],
  );

  const activeItems = items.filter((item) => item.active !== false);
  const activeDispatchCount = Object.values(dispatchGroups).reduce((count, list) => count + (list?.length || 0), 0);

  const addItem = async () => {
    if (!itemForm.name.trim() || !itemForm.type.trim()) {
      setStatusMessage("Item name and type are required.");
      return;
    }

    const response = await createItem(itemForm);
    setItems((current) => [...current, response.data]);
    setItemForm({ name: "", type: "", source: "", quantity: "", unit: "" });
    setStatusMessage(`Item ${response.data.name} added to the catalog.`);
  };

  const toggleItemActive = async (item) => {
    const response = await updateItem(item.id, { active: !item.active });
    setItems((current) => current.map((entry) => (entry.id === item.id ? response.data : entry)));
    setStatusMessage(`${response.data.name} marked ${response.data.active ? "active" : "inactive"}.`);
  };

  const saveDispatch = async (taskIndex) => {
    const draft = drafts[taskIndex];
    if (!draft || !draft.item_id || !selectedProject) {
      setStatusMessage("Choose an item and project before saving a dispatch.");
      return;
    }

    const payload = {
      project_id: selectedProject,
      task_index: taskIndex,
      item_id: draft.item_id,
      destination: draft.destination || "",
      dispatch_date: draft.dispatch_date || null,
      status: draft.status || "planned",
      notes: draft.notes || "",
    };

    const response = draft.id ? await updateDispatch(draft.id, payload) : await createDispatch(payload);

    setDrafts((current) => ({
      ...current,
      [taskIndex]: {
        id: response.data.id,
        item_id: response.data.item_id || "",
        destination: response.data.destination || "",
        dispatch_date: response.data.dispatch_date ? String(response.data.dispatch_date).slice(0, 10) : "",
        status: response.data.status || "planned",
        notes: response.data.notes || "",
      },
    }));

    setProjectState((current) => ({
      ...current,
      dispatches_by_task: {
        ...(current?.dispatches_by_task || {}),
        [String(taskIndex)]: [response.data],
      },
    }));

    setStatusMessage(`Dispatch saved for task "${currentSchedule[taskIndex]?.task}".`);
  };

  return (
    <div className="fw-container py-8">
      <div className="ibm-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="ibm-title text-3xl">Inventory Console</h1>
            <p className="mt-2 max-w-2xl text-[#4b5563]">
              Manage materials and dispatch them task by task, with clearer context for live operations.
            </p>
          </div>
          {selectedProjectInfo ? (
            <div className="ibm-kpi max-w-sm">
              <div className="ibm-kpi__label">Selected project</div>
              <div className="mt-1 text-lg font-semibold text-[#0f172a]">{selectedProjectInfo.title}</div>
              <div className="text-sm text-[#4b5563]">
                {selectedProjectInfo.ward} - {selectedProjectInfo.city}
              </div>
            </div>
          ) : (
            <div className="ibm-kpi max-w-sm">
              <div className="ibm-kpi__label">Selected project</div>
              <div className="mt-1 text-sm text-[#4b5563]">Select a project to view dispatches.</div>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="mt-6 rounded-[4px] border border-[#c9c9c9] bg-[#eef4ff] px-4 py-3 text-sm text-[#0176d3]">
            {statusMessage}
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <StatPill label="Catalog items" value={items.length} />
          <StatPill label="Active items" value={activeItems.length} />
          <StatPill label="Tasks" value={currentSchedule.length} />
          <StatPill label="Dispatches" value={activeDispatchCount} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-5">
            <div className="ibm-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#0f172a]">Catalog</h2>
                <span className="ibm-chip">{activeItems.length} active</span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {["name", "type", "source", "quantity", "unit"].map((field) => (
                  <input
                    key={field}
                    className="ibm-input"
                    placeholder={field}
                    value={itemForm[field]}
                    onChange={(e) => setItemForm({ ...itemForm, [field]: e.target.value })}
                  />
                ))}
              </div>

              <button onClick={addItem} className="ibm-button-primary mt-4">
                Add item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="ibm-panel">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#0f172a]">{item.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#5f6f86]">
                        <span className="ibm-chip">{item.type}</span>
                        <span className="ibm-chip">{item.source}</span>
                        <span className="ibm-chip">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleItemActive(item)}
                      className={item.active ? "ibm-button-success" : "ibm-button-secondary"}
                    >
                      {item.active ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
              ))}

              {!items.length && <div className="ibm-empty">Add materials or equipment here first so dispatches have something to reference.</div>}
            </div>
          </section>

          <section className="space-y-5">
            <div className="ibm-panel">
              <h2 className="text-xl font-semibold text-[#0f172a]">Project dispatches</h2>
              <p className="mt-2 text-sm text-[#4b5563]">
                Select a project, then dispatch materials against each task in the published schedule.
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
                  const draft = drafts[index] || {
                    item_id: "",
                    destination: "",
                    dispatch_date: "",
                    status: "planned",
                    notes: "",
                  };
                  const existingCount = dispatchGroups[String(index)]?.length || 0;

                  return (
                    <TaskDispatchForm
                      key={`${index}-${task.task}`}
                      task={task}
                      draft={draft}
                      items={items}
                      existingCount={existingCount}
                      onChange={(nextDraft) =>
                        setDrafts((current) => ({
                          ...current,
                          [index]: nextDraft,
                        }))
                      }
                      onSave={() => saveDispatch(index)}
                    />
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
