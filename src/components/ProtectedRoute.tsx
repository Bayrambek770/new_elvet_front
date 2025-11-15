import { Navigate } from "react-router-dom";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const access = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (!access) return <Navigate to={(import.meta.env.VITE_LOGOUT_REDIRECT ?? "/auth") as string} replace />;
  return children;
};

export default ProtectedRoute;
