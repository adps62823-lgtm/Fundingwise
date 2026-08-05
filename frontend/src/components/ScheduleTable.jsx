import React from "react";
export default function ScheduleTable({ rows = [], onChangeRow, onRemoveRow }) {
  return (
    <div className="ibm-table-wrap">
      <table className="ibm-table">
        <thead>
          <tr>
            <th className="px-4 py-3">Task</th>
            <th className="px-4 py-3">Day Start</th>
            <th className="px-4 py-3">Day End</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Labor</th>
            <th className="px-4 py-3">Equipment</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              <td className="px-4 py-3">
                <input
                  className="ibm-input"
                  value={row.task || ""}
                  onChange={(e) => onChangeRow(index, "task", e.target.value)}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  className="ibm-input w-24"
                  value={row.day_start ?? ""}
                  onChange={(e) => onChangeRow(index, "day_start", Number(e.target.value))}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  className="ibm-input w-24"
                  value={row.day_end ?? ""}
                  onChange={(e) => onChangeRow(index, "day_end", Number(e.target.value))}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  className="ibm-input"
                  value={row.description || ""}
                  onChange={(e) => onChangeRow(index, "description", e.target.value)}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  className="ibm-input w-24"
                  value={row.suggested_labor_count ?? ""}
                  onChange={(e) => onChangeRow(index, "suggested_labor_count", Number(e.target.value))}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  className="ibm-input"
                  value={row.suggested_equipment || ""}
                  onChange={(e) => onChangeRow(index, "suggested_equipment", e.target.value)}
                />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="ibm-button-ghost text-xs"
                  onClick={() => onRemoveRow(index)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

