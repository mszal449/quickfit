import React from "react";
import { useCurrentUser } from "./useCurrentUser";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SaveReturnTo } from "./returnTo";

const ProtectedRoute = () => {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading…</div>;
  }

  if (!user) {
    SaveReturnTo(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
