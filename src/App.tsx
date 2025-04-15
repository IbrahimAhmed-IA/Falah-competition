import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

// Auth Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

// Participant Pages
import ParticipantDashboard from "./pages/participant/ParticipantDashboard";
import CreateCompetitionPage from "./pages/CreateCompetitionPage";
import JoinCompetitionPage from "./pages/JoinCompetitionPage";
import CompetitionDetailsPage from "./pages/CompetitionDetailsPage";
import CompetitionsListPage from "./pages/CompetitionsListPage"; // Added import for CompetitionsListPage

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Redirect from root to appropriate path */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected Routes for both roles */}
          <Route element={<ProtectedRoute allowedRoles={["participant", "admin"]} />}>
            <Route element={<MainLayout />}>
              <Route path="/competitions" element={<CompetitionsListPage />} /> {/* Added CompetitionsListPage route */}
              <Route path="/competitions/create" element={<CreateCompetitionPage />} />
              <Route path="/competitions/:competitionId/join" element={<JoinCompetitionPage />} />
              <Route path="/competitions/:competitionId" element={<CompetitionDetailsPage />} />
            </Route>
          </Route>

          {/* Participant Routes */}
          <Route element={<ProtectedRoute allowedRoles={["participant"]} />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<ParticipantDashboard />} />
              {/* More participant routes will be added here */}
              <Route path="/profile" element={<div>My Profile</div>} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<MainLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              {/* More admin routes will be added here */}
              <Route path="/admin/competitions" element={<div>Competitions Management</div>} />
              <Route path="/admin/competitions/:id" element={<div>Manage Competition</div>} />
              <Route path="/admin/participants" element={<div>Participants Management</div>} />
              <Route path="/admin/name-changes" element={<div>Name Change Requests</div>} />
            </Route>
          </Route>

          {/* Catch All Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
