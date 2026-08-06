import client from "./client";

export const getTiers = async () => (await client.get("/api/v1/subscriptions/tiers")).data;
export const orgSignup = async (payload) => (await client.post("/api/v1/subscriptions/org-signup", payload)).data;
export const listPendingOrgs = async () => (await client.get("/api/v1/subscriptions/orgs/pending")).data;
export const listOrganizations = async () => (await client.get("/api/v1/subscriptions/orgs")).data;
export const approveOrg = async (id) => (await client.post(`/api/v1/subscriptions/orgs/${id}/approve`)).data;
export const suspendOrg = async (id) => (await client.post(`/api/v1/subscriptions/orgs/${id}/suspend`)).data;
export const createApiKey = async (payload) => (await client.post("/api/v1/subscriptions/api-keys", payload)).data;
export const listApiKeys = async () => (await client.get("/api/v1/subscriptions/api-keys")).data;
export const getApiKeyUsage = async (keyId) => (await client.get(`/api/v1/subscriptions/api-keys/${keyId}/usage`)).data;

// Org detail / management
export const getOrgDetail = async (orgId) => (await client.get(`/api/v1/subscriptions/orgs/${orgId}`)).data;
export const updateOrg = async (orgId, payload) => (await client.patch(`/api/v1/subscriptions/orgs/${orgId}`, payload)).data;
export const deleteOrg = async (orgId, hard = false) =>
  (await client.delete(`/api/v1/subscriptions/orgs/${orgId}`, { params: { hard } })).data;
export const toggleOrgService = async (orgId, service, enabled) =>
  (await client.patch(`/api/v1/subscriptions/orgs/${orgId}/services`, { service, enabled })).data;

// Org employees
export const listOrgEmployees = async (orgId) => (await client.get(`/api/v1/subscriptions/orgs/${orgId}/employees`)).data;
export const createOrgEmployee = async (orgId, payload) =>
  (await client.post(`/api/v1/subscriptions/orgs/${orgId}/employees`, payload)).data;
export const resetEmployeePassword = async (orgId, userId) =>
  (await client.post(`/api/v1/subscriptions/orgs/${orgId}/employees/${userId}/reset-password`)).data;
export const updateOrgEmployee = async (orgId, userId, payload) =>
  (await client.patch(`/api/v1/subscriptions/orgs/${orgId}/employees/${userId}`, payload)).data;
