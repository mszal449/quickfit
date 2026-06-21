import React, { useEffect, useRef } from "react";
import { useCurrentUser } from "./useCurrentUser";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";
import { clearReturnTo, peekReturnTo } from "./returnTo";

const LoginPage = () => {
  const { data: user, isLoading } = useCurrentUser();
  const { login } = useAuth();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (user && !redirected.current) {
      redirected.current = true;
      const target = peekReturnTo() ?? "/workouts";
      clearReturnTo();
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  if (isLoading) return <div>Loading...</div>;
  if (user) return <div>Redirecting...</div>;
  return (
    <div>
      <h1>QuickFit</h1>
      <button onClick={login}>Sign in with Google</button>
    </div>
  );
};

export default LoginPage;
