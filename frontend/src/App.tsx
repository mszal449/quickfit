import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./Pages/HomePage";
import LoginPage from "./auth/LoginPage";
import ProtectedRoute from "./auth/protectedRoute";
import WorkoutsPage from "./Pages/WorkoutsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/workouts" element={<WorkoutsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
