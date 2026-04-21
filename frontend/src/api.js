/**
 * Centralized API client for Upastithi-Pramaan backend.
 * Base URL reads from REACT_APP_API_URL env var, defaults to localhost:8000.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'https://kts0ffyn5g.execute-api.ap-south-1.amazonaws.com';

/** Return the stored JWT token (or null). */
export const getToken = () => localStorage.getItem('up_token');

/** Store token + user info after login. */
export const saveAuth = (token, role, profile) => {
    localStorage.setItem('up_token', token);
    localStorage.setItem('up_role', role);
    localStorage.setItem('up_profile', JSON.stringify(profile));
};

/** Clear all auth data (logout). */
export const clearAuth = () => {
    localStorage.removeItem('up_token');
    localStorage.removeItem('up_role');
    localStorage.removeItem('up_profile');
};

/** Get currently stored profile object. */
export const getProfile = () => {
    try { return JSON.parse(localStorage.getItem('up_profile')); }
    catch { return null; }
};

/** Get stored role string. */
export const getRole = () => localStorage.getItem('up_role');

/** Core fetch wrapper — automatically attaches the Bearer token. */
async function request(method, path, body = null, opts = {}) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const isFormData = body instanceof FormData;
    if (!isFormData && body !== null) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        ...opts,
    });

    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const json = await res.json();
            detail = json.detail || detail;
        } catch { }
        throw new Error(detail);
    }

    // 204 No Content
    if (res.status === 204) return null;

    // Check if response is a file download
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/csv')) return res.blob();

    return res.json();
}

const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
    login: (role, id, password, division) =>
        api.post('/auth/login', { role, id, password, division }),
    logout: () => api.post('/auth/logout'),
};

// ── Student ───────────────────────────────────────────────────────────────────
export const studentApi = {
    getProfile: () => api.get('/students/me'),
    getAttendance: () => api.get('/students/me/attendance'),
    getActiveSession: () => api.get('/students/me/active-session'),
    markAttendance: (body) => api.post('/students/me/attendance', body),
    getCalendar: (month, year) => api.get(`/students/me/calendar?month=${month}&year=${year}`),
    getSubjects: () => api.get('/students/me/subjects'),
    getDevice: () => api.get('/students/me/device'),
    requestDevice: (body) => api.post('/students/me/device-request', body),
    getNotifications: () => api.get('/students/me/notifications'),
    markRead: (id) => api.patch(`/students/me/notifications/${id}/read`),
    submitDispute: (body) => api.post('/students/me/disputes', body),
    getDisputes: () => api.get('/students/me/disputes'),
    exportCSV: () => request('GET', '/students/me/export'),
};

// ── Faculty ───────────────────────────────────────────────────────────────────
export const facultyApi = {
    getProfile: () => api.get('/faculty/me'),
    getSubjects: () => api.get('/faculty/subjects'),
    getActiveSession: () => api.get('/faculty/sessions/active'),
    startSession: (subjectId) => api.post('/faculty/sessions/start', { subject_id: subjectId }),
    endSession: (id) => api.post(`/faculty/sessions/${id}/end`),
    getSessionStudents: (id) => api.get(`/faculty/sessions/${id}/students`),
    overrideAttendance: (id, studentId, present) =>
        api.patch(`/faculty/sessions/${id}/override`, { student_id: studentId, present }),
    getAnalytics: () => api.get('/faculty/analytics'),
    exportReport: (type, fromDate, toDate) => {
        const params = new URLSearchParams();
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return request('GET', `/faculty/reports/${type}${qs}`);
    },
    refreshCode: (sessionId) => api.post(`/faculty/sessions/${sessionId}/refresh-code`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
    getOverview: () => api.get('/admin/overview'),
    // Students
    getStudents: (q = '') => api.get(`/admin/students${q ? `?query=${encodeURIComponent(q)}` : ''}`),
    enrollStudent: (body) => api.post('/admin/students', body),
    updateStudent: (id, body) => api.put(`/admin/students/${id}`, body),
    deleteStudent: (id) => api.delete(`/admin/students/${id}`),
    massEnrollStudents: (formData) => api.post('/admin/students/upload', formData),
    // Faculty
    getFaculty: () => api.get('/admin/faculty'),
    addFaculty: (body) => api.post('/admin/faculty', body),
    updateFaculty: (id, body) => api.put(`/admin/faculty/${id}`, body),
    deleteFaculty: (id) => api.delete(`/admin/faculty/${id}`),
    massAddFaculty: (formData) => api.post('/admin/faculty/upload', formData),
    // Devices
    getDevices: () => api.get('/admin/devices'),
    approveDevice: (mac) => api.patch(`/admin/devices/${encodeURIComponent(mac)}/approve`),
    flagDevice: (mac) => api.patch(`/admin/devices/${encodeURIComponent(mac)}/flag`),
    // Logs
    getLogs: (type) => api.get(`/admin/logs${type && type !== 'all' ? `?event_type=${type}` : ''}`),
    exportLogs: () => request('GET', '/admin/logs/export'),
    // Disputes
    getDisputes: () => api.get('/admin/disputes'),
    resolveDispute: (id) => api.patch(`/admin/disputes/${id}/resolve`),
    rejectDispute: (id) => api.patch(`/admin/disputes/${id}/reject`),
    // Analytics
    getAnalytics: () => api.get('/admin/analytics'),
    // Face model
    getFaceModel: () => api.get('/admin/face-model'),
    retrain: () => api.post('/admin/face-model/retrain'),
};

// ── Notifications (generic) ───────────────────────────────────────────────────
export const notifApi = {
    list: () => api.get('/notifications/'),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    delete: (id) => api.delete(`/notifications/${id}`),
};

/** Trigger a file download from a Blob response. */
export const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export default api;
