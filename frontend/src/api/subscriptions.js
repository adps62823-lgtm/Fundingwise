import client from "./client";

export const orgSignup = async (payload) => (await client.post("/api/v1/subscriptions/org-signup", payload)).data;
export const listPendingOrgs = async () => (await client.get("/api/v1/subscriptions/orgs/pending")).data;
export const listOrganizations = async () => (await client.get("/api/v1/subscriptions/orgs")).data;
export const approveOrg = async (id) => (await client.post(`/api/v1/subscriptions/orgs/${id}/approve`)).data;
export const suspendOrg = async (id) => (await client.post(`/api/v1/subscriptions/orgs/${id}/suspend`)).data;
export const createApiKey = async (payload) => (await client.post("/api/v1/subscriptions/api-keys", payload)).data;
export const listApiKeys = async () => (await client.get("/api/v1/subscriptions/api-keys")).data;
export const getApiKeyUsage = async (keyId) => (await client.get(`/api/v1/subscriptions/api-keys/${keyId}/usage`)).data;
