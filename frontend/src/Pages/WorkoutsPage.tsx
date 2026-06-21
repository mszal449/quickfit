import React from "react";
import { useCurrentUser } from "../auth/useCurrentUser";
import { useAuth } from "../auth/useAuth";

const WorkoutsPage = () => {
  const { data: user } = useCurrentUser();
  const { logout } = useAuth();

  return (
    <div>
      <h1>Trening</h1>
      <p>Zalogowano jako: {user?.email}</p>
      <button onClick={logout}> Wyloguj</button>
    </div>
  );
};

export default WorkoutsPage;
