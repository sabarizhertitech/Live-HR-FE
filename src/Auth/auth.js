export const getAuth = () => {
  const data = sessionStorage.getItem("Erti-Portal");
  return data ? JSON.parse(data) : null;
};

export const logout = () => {
  sessionStorage.removeItem("Erti-Portal");
  window.location.href = "/";
};
