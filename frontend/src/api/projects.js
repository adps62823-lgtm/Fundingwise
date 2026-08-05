import client from "./client";

export const listProjects = async (filters = {}) => {
  const response = await client.get("/api/v1/public/projects", { params: filters });
  return response.data;
};

export const getProject = async (id) => {
  const response = await client.get(`/api/v1/public/projects/${id}`);
  return response.data;
};

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
