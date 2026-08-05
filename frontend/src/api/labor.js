import client from "./client";

export const listWorkers = async () => (await client.get("/api/v1/labor/workers")).data;
export const createWorker = async (payload) => (await client.post("/api/v1/labor/workers", payload)).data;
export const updateWorker = async (id, payload) => (await client.patch(`/api/v1/labor/workers/${id}`, payload)).data;
export const listAssignments = async (projectId) => (await client.get("/api/v1/labor/assignments", { params: { project_id: projectId } })).data;
export const createAssignment = async (payload) => (await client.post("/api/v1/labor/assignments", payload)).data;
export const updateAssignment = async (id, payload) => (await client.patch(`/api/v1/labor/assignments/${id}`, payload)).data;
