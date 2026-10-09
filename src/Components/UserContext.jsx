import { createContext, useContext, useState, useEffect } from "react";
import React from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize from sessionStorage to survive page refreshes
    const savedData = sessionStorage.getItem("Erti-Portal");
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (err) {
        console.error("Error parsing saved user data:", err);
        return null;
      }
    }
    return null;
  });

  const updateUserData = (newData) => {
    setUser((prev) => {
      if (!newData) return null;
      let storedToken = null;
      try {
        const raw = sessionStorage.getItem("Erti-Portal");
        if (raw) storedToken = JSON.parse(raw)?.token;
      } catch (_) {}
      return {
        ...newData,
        token: newData.token || prev?.token || storedToken,
      };
    });
  };

  return (
    <UserContext.Provider value={{ user, setUser: updateUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);