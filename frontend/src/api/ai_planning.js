import client from "./client";

export const createProject = async (payload) => {
  const response = await client.post("/api/v1/projects", payload);
  return response.data;
};

export const listOrgProjects = async () => {
  const response = await client.get("/api/v1/projects");
  return response.data;
};

export const getProjectFullState = async (id) => {
  const response = await client.get(`/api/v1/projects/${id}/full-state`);
  return response.data;
};

export const generateAiDraft = async (projectId, synopsis) => {
  const response = await client.post(`/api/v1/ai-planning/projects/${projectId}/draft`, { synopsis });
  return response.data;
};

export const publishVersion = async (projectId, previousVersionId, editedFields, notes) => {
  const response = await client.post(`/api/v1/ai-planning/projects/${projectId}/publish`, {
    previousVersionId,
    edited_fields: editedFields,
    notes,
  });
  return response.data;
};

export const getOfficialVersionHistory = async (projectId) => {
  const response = await client.get(`/api/v1/versions/official/${projectId}`);
  return response.data;
};
