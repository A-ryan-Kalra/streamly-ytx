import { useLocation, Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const hasAccess = searchParams.get("access");

  if (hasAccess !== "granted") {
    return <Navigate to={"/"} state={{ from: location }} replace />;
  }
  return children;
}

export default ProtectedRoute;
