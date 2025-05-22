import { useEffect } from "react";
import {
  useLocation,
  Navigate,
  useNavigationType,
  useNavigate,
} from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const navigationType = useNavigationType();
  const navigate = useNavigate();

  const hasAccessId = searchParams.get("accessId");
  const userId = sessionStorage.getItem("key");

  useEffect(() => {
    if (navigationType === "POP") {
      sessionStorage.clear();
      navigate("/");
    }
  }, [navigationType]);

  if (hasAccessId === userId) {
    return children;
  }
  return <Navigate to={"/"} state={{ from: location }} replace />;
}

export default ProtectedRoute;
