import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('taskflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalizes error responses into { message, fieldErrors } so forms and
// toasts can consume a consistent shape regardless of which route failed.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const errors = err.response?.data?.errors;
    const fieldErrors = {};
    let message = 'Something went wrong. Please try again.';

    if (Array.isArray(errors) && errors.length) {
      message = errors[0].message;
      errors.forEach((e) => {
        if (e.field) fieldErrors[e.field] = e.message;
      });
    } else if (err.message === 'Network Error') {
      message = "Can't reach the server. Is the backend running?";
    }

    return Promise.reject({ ...err, message, fieldErrors });
  }
);

export default client;
