import axios from 'axios';

console.log(process.env.REACT_APP_API_URL);

// Create an Axios instance
const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosInstance;
