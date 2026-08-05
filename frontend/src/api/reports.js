import client from "./client";

export const submitReport = async (payload) => {
  const response = await client.post("/api/v1/public/reports", payload);
  return response.data;
};

export const voteReport = async (reportId, direction) => {
  const response = await client.post(`/api/v1/public/reports/${reportId}/vote`, { direction });
  return response.data;
};

export const getCivicScore = async (entityType, entityId) => {
  const response = await client.get(`/api/v1/public/civic-score/${entityType}/${entityId}`);
  return response.data;
};
