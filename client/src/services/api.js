// src/services/api.js

import axiosInstance from './axiosInstance'; // Import the axiosInstance

// ---- Users API ----

// Fetch all users
export const fetchUsers = async () => {
    try {
        const response = await axiosInstance.get('/users');
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
    }
};

// Fetch specific user
export const fetchUser = async (id) => {
    try {
        const response = await axiosInstance.get(`/users/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user:', error);
    }
};

// Create a new user
export const createUser = async (userData) => {
    try {
        const response = await axiosInstance.post('/users', userData);
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
    }
};

// Update an existing user
export const updateUser = async (id, userData) => {
    try {
        const response = await axiosInstance.put(`/users/${id}`, userData);
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error);
    }
};

// Delete a user
export const deleteUser = async (id) => {
    try {
        const response = await axiosInstance.delete(`/users/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting user:', error);
    }
};

// ---- Committees API ----

// Fetch all committees
export const fetchCommittees = async () => {
    try {
        const response = await axiosInstance.get('/committees');
        return response.data;
    } catch (error) {
        console.error('Error fetching committees:', error);
    }
};

// Fetch specific committee
export const fetchCommittee = async (id) => {
    try {
        const response = await axiosInstance.get(`/committees/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching committee:', error);
    }
};

// Create a new committee
export const createCommittee = async (committeeData) => {
    try {
        const response = await axiosInstance.post('/committees', committeeData);
        return response.data;
    } catch (error) {
        console.error('Error creating committee:', error);
    }
};

// Update an existing committee
export const updateCommittee = async (id, committeeData) => {
    try {
        const response = await axiosInstance.put(`/committees/${id}`, committeeData);
        return response.data;
    } catch (error) {
        console.error('Error updating committee:', error);
    }
};

// Delete a committee
export const deleteCommittee = async (id) => {
    try {
        const response = await axiosInstance.delete(`/committees/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting committee:', error);
    }
};

// Contribution axiosInstance
export const fetchContributions = async () => {
    const response = await axiosInstance.get('/contributions');
    return response.data;
};

export const createContribution = async (contributionData) => {
    const response = await axiosInstance.post('/contributions', contributionData);
    return response.data;
};

export const updateContribution = async (data) => {
    const response = await axiosInstance.put(`/contributions/${data._id}`, data); // Adjust the endpoint as necessary
    return response.data;
};

export const deleteContribution = async (contributionId) => {
    const response = await axiosInstance.delete(`/contributions/${contributionId}`);
    return response.data;
};

// Dashboard axiosInstance
export const fetchDashboard = async () => {
    const response = await axiosInstance.get('/dashboards');
    return response.data;
};

// Draw axiosInstance
export const fetchDraws = async () => {
    const response = await axiosInstance.get('/draws');
    return response.data;
};

export const createDraw = async (drawData) => {
    const response = await axiosInstance.post('/draws', drawData);
    return response.data;
};

export const deleteDraw = async (drawId) => {
    const response = await axiosInstance.delete(`/draws/${drawId}`);
    return response.data;
};

// Authenticate function
export const authenticateUser = async (creds) => {
    const response = await axiosInstance.get('/auth/authenticate', {
        headers: {
            'Authorization': `Basic ${creds}`,
        },
    });
    return response;
};