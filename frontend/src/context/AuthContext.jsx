import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const PYTHON_API = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';
const NODE_API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);
  const [workspaceId, setWorkspaceId] = useState(localStorage.getItem('workspace_id') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (jwt) => {
    if (!jwt) { setLoading(false); return; }
    try {
      const res = await fetch(`${PYTHON_API}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      if (!res.ok) throw new Error('Session expired');
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error('Profile fetch failed:', err);
      // Token invalid — clear session
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('workspace_id');
      localStorage.removeItem('user_email');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile(token);
  }, [token, fetchUserProfile]);

  const login = (jwt, userId, email) => {
    localStorage.setItem('jwt_token', jwt);
    if (userId) localStorage.setItem('workspace_id', userId);
    if (email) localStorage.setItem('user_email', email);
    setToken(jwt);
    setWorkspaceId(userId);
    fetchUserProfile(jwt);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('workspace_id');
    localStorage.removeItem('user_email');
    setToken(null);
    setWorkspaceId(null);
    setUser(null);
  };

  const refreshProfile = () => fetchUserProfile(token);

  return (
    <AuthContext.Provider value={{
      token,
      workspaceId,
      user,
      loading,
      login,
      logout,
      refreshProfile,
      isAuthenticated: !!token && !!user,
      isPro: user?.tier === 'pro' || user?.tier === 'enterprise',
      PYTHON_API,
      NODE_API,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
