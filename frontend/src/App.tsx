import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotFoundPage } from "./components/NotFoundPage";
import { ProgressPlaceholderPage } from "./features/progress/ProgressPlaceholderPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { PlansPage } from "./features/plans/PlansPage";
import { PlanBuilderPage } from "./features/plans/PlanBuilderPage";
import { ExercisesPage } from "./features/exercises/ExercisesPage";
import { ExerciseDetailPage } from "./features/exercises/ExerciseDetailPage";
import { HistoryPage } from "./features/history/HistoryPage";
import { HistoryDetailPage } from "./features/history/HistoryDetailPage";
import { FriendsPage } from "./features/friends/FriendsPage";
import { LiveSessionPage } from "./features/session/LiveSessionPage";
import { WorkoutSummaryPage } from "./features/session/WorkoutSummaryPage";
import { LandingPage } from "./features/landing/LandingPage";
import { AccountPage } from "./features/account/AccountPage";
import LoginPage from "./auth/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <ErrorBoundary>
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
              <Route
                path="/exercises/:exerciseId"
                element={<ExerciseDetailPage />}
              />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:id" element={<HistoryDetailPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/progress" element={<ProgressPlaceholderPage />} />
            </Route>

            <Route path="/session/:sessionId" element={<LiveSessionPage />} />
            <Route
              path="/session/:sessionId/summary"
              element={<WorkoutSummaryPage />}
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
