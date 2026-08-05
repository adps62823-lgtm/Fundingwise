import client from "./client";

export const getPublicVersionHistory = async (projectId) => {
  const response = await client.get(`/api/v1/versions/public/${projectId}`);
  return response.data;
};

export const getOfficialVersionHistory = async (projectId) => {
  const response = await client.get(`/api/v1/versions/official/${projectId}`);
  return response.data;
};
