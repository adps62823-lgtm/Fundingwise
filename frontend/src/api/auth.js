import client from "./client";

export const syncSession = async (payload = {}) => {
  const response = await client.post("/api/v1/auth/sync", payload);
  return response.data;
};

export const getMe = async () => {
  const response = await client.get("/api/v1/auth/me");
  return response.data;
};
