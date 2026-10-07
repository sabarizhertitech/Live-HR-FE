import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const authData = sessionStorage.getItem("Erti-Portal");

  if (!authData) {
    return <Navigate to="/" replace />;
  }

  const { token, role } = JSON.parse(authData);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
