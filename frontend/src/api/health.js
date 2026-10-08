import { api } from "./client.js";

export const getApiHealth = () => api.get("health");
export const getDatabaseHealth = () => api.get("health/database");
