import React, { useState, createContext, useContext, useEffect } from "react";
import App from "../App";
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/auth-status",{
          credentials: "include",
        });
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Auth check failed", error);
      }
    };
    checkAuth();
  }, []);
  const login=(userData)=>{
    setUser(userData);
  }
  const logout = async () => {
    try {
      await fetch("http://localhost:3000/api/logout",{
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  return (
    <AuthContext.Provider value={{user,login,logout}}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
