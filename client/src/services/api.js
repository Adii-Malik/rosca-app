// src/services/api.js
// Errors are propagated rather than swallowed, so callers can surface them.
// Previously every function caught, logged, and returned undefined, which turned
// a failed request into a confusing blank screen.
import axiosInstance from './axiosInstance';

/** Pulls a human-readable message out of an axios error. */
export const errorMessage = (error, fallback = 'Something went wrong.') =>
    error?.response?.data?.message || error?.message || fallback;

// ---- Auth ----
export const login = async (username, password) => {
    const { data } = await axiosInstance.post('/auth/login', { username, password });
    return data; // { token, user }
};

export const fetchCurrentUser = async () => {
    const { data } = await axiosInstance.get('/auth/me');
    return data;
};

// ---- Users ----
export const fetchUsers = async () => (await axiosInstance.get('/users')).data;
export const fetchUser = async (id) => (await axiosInstance.get(`/users/${id}`)).data;
export const createUser = async (userData) => (await axiosInstance.post('/users', userData)).data;
export const updateUser = async (id, userData) => (await axiosInstance.put(`/users/${id}`, userData)).data;
export const deleteUser = async (id) => (await axiosInstance.delete(`/users/${id}`)).data;

// ---- Committees ----
export const fetchCommittees = async () => (await axiosInstance.get('/committees')).data;
export const fetchCommittee = async (id) => (await axiosInstance.get(`/committees/${id}`)).data;
export const createCommittee = async (data) => (await axiosInstance.post('/committees', data)).data;
export const updateCommittee = async (id, data) => (await axiosInstance.put(`/committees/${id}`, data)).data;
export const deleteCommittee = async (id) => (await axiosInstance.delete(`/committees/${id}`)).data;

// ---- Contributions ----
export const fetchContributions = async (params) =>
    (await axiosInstance.get('/contributions', { params })).data;
export const createContribution = async (data) => (await axiosInstance.post('/contributions', data)).data;
export const updateContribution = async (data) =>
    (await axiosInstance.put(`/contributions/${data._id}`, data)).data;
export const deleteContribution = async (id) => (await axiosInstance.delete(`/contributions/${id}`)).data;

// ---- Dashboard ----
export const fetchDashboard = async () => (await axiosInstance.get('/dashboards')).data;

// ---- Draws ----
export const fetchDraws = async () => (await axiosInstance.get('/draws')).data;
export const createDraw = async (data) => (await axiosInstance.post('/draws', data)).data;
export const deleteDraw = async (id) => (await axiosInstance.delete(`/draws/${id}`)).data;

// ---- Archive ----
export const fetchArchive = async () => (await axiosInstance.get('/archive')).data;

export const fetchDrawReplay = async (drawId) =>
    (await axiosInstance.get(`/archive/draws/${drawId}/replay`)).data;

export const setCommitteeStatus = async (id, status) =>
    (await axiosInstance.patch(`/committees/${id}/status`, { status })).data;

/** Records contributions for several members of one committee at once. */
export const createContributionsBulk = async (payload) =>
    (await axiosInstance.post('/contributions/bulk', payload)).data;

/** Awards the current round to a chosen member instead of drawing for it. */
export const awardRound = async (committeeId, userId) =>
    (await axiosInstance.post('/draws/award', { committeeId, userId })).data;
