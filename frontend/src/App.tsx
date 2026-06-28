import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PlansPage } from "./features/plans/PlansPage";
import { PlanBuilderPage } from "./features/plans/PlanBuilderPage";
import { ExercisesPage } from "./features/exercises/ExercisesPage";
import { HistoryPage } from "./features/history/HistoryPage";
import { LiveSessionPage } from "./features/session/LiveSessionPage";
import { WorkoutSummaryPage } from "./features/session/WorkoutSummaryPage";
import { LandingPage } from "./features/landing/LandingPage";
import { AccountPage } from "./features/account/AccountPage";
import LoginPage from "./auth/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/plans/:planId" element={<PlanBuilderPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>

          <Route path="/session/:sessionId" element={<LiveSessionPage />} />
          <Route path="/session/:sessionId/summary" element={<WorkoutSummaryPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
