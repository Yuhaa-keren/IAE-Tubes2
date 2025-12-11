import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Cek expired sederhana
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
        } else {
          setUser(decoded);
        }
      } catch (e) { localStorage.removeItem('token'); }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axiosInstance.post('/auth/login', { username, password });
      const { token } = res.data;
      localStorage.setItem('token', token);
      setUser(jwtDecode(token));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};