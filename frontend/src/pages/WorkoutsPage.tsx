import { useCurrentUser } from "../auth/useCurrentUser";
import { useAuth } from "../auth/useAuth";
import { useListExercisesApiExerciseGet } from "../api/generated/exercise/exercise";

const WorkoutsPage = () => {
  const { data: user } = useCurrentUser();
  const { data: exercises, isLoading } = useListExercisesApiExerciseGet();
  const { logout } = useAuth();

  return (
    <div>
      <h1>Trening</h1>
      <p>Zalogowano jako: {user?.email}</p>
      <button onClick={logout}> Wyloguj</button>
      {isLoading ?
        <div>Loading exercises</div>
        :
        <div>{exercises?.items.map((e) => e.name)}</div>}
    </div>
  );
};

export default WorkoutsPage;
