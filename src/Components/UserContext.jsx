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

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);