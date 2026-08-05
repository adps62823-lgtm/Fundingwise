import client from "./client";

export const listItems = async () => (await client.get("/api/v1/inventory/items")).data;
export const createItem = async (payload) => (await client.post("/api/v1/inventory/items", payload)).data;
export const updateItem = async (id, payload) => (await client.patch(`/api/v1/inventory/items/${id}`, payload)).data;
export const listDispatch = async (projectId) => (await client.get("/api/v1/inventory/dispatch", { params: { project_id: projectId } })).data;
export const createDispatch = async (payload) => (await client.post("/api/v1/inventory/dispatch", payload)).data;
export const updateDispatch = async (id, payload) => (await client.patch(`/api/v1/inventory/dispatch/${id}`, payload)).data;
