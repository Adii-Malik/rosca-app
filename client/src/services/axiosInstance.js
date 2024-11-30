import axios from 'axios';

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://rosca-app-8wmr3q.fly.dev/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosInstance;
