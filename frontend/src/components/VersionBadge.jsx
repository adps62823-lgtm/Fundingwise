import React from "react";
const styles = {
  ai_draft: "ibm-badge",
  official_edited: "ibm-badge ibm-badge--warning",
  published: "ibm-badge ibm-badge--success",
};

export default function VersionBadge({ status }) {
  return <span className={`${styles[status] || styles.ai_draft}`}>{status?.replaceAll("_", " ") || "draft"}</span>;
}

