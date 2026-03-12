import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Outlet } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import RecordingDetailPage from "./pages/RecordingDetailPage";
import UploadPage from "./pages/UploadPage";
import SearchPage from "./pages/SearchPage";
import SemanticSearchPage from "./pages/SemanticSearchPage";
import ChatbotPage from "./pages/ChatbotPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import EthnicitiesPage from "./pages/EthnicitiesPage";
import MastersPage from "./pages/MastersPage";
import AboutPage from "./pages/AboutPage";
import TermsPage from "./pages/TermsPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ConfirmAccountPage from "./pages/auth/ConfirmAccountPage";
import ProfilePage from "./pages/ProfilePage";
import ContributionsPage from "./pages/ContributionsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateExpertPage from "./pages/admin/CreateExpertPage";
import AdminGuard from "./components/admin/AdminGuard";
import ModerationPage from "./pages/ModerationPage";
import ApprovedRecordingsPage from "./pages/ApprovedRecordingsPage";
import ResearcherPortalPage from "./pages/researcher/ResearcherPortalPage";
import ResearcherGuard from "./components/admin/ResearcherGuard";
import EditRecordingPage from "./pages/EditRecordingPage";
import NotificationPage from "./pages/NotificationPage";
import NotFoundPage from "./pages/NotFoundPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import ScrollToTop from "./components/common/ScrollToTop";
import NotificationProvider from "./components/common/NotificationProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Root wrapper to provide shared context/components within the RouterProvider
function RootWrapper() {
  return (
    <NotificationProvider>
      <ScrollToTop />
      <Outlet />
    </NotificationProvider>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootWrapper />}>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="recordings/:id" element={<RecordingDetailPage />} />
        <Route path="recordings/:id/edit" element={<EditRecordingPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="semantic-search" element={<SemanticSearchPage />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="instruments" element={<InstrumentsPage />} />
        <Route path="ethnicities" element={<EthnicitiesPage />} />
        <Route path="masters" element={<MastersPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="contributions" element={<ContributionsPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="approved-recordings" element={<ApprovedRecordingsPage />} />
        <Route path="notifications" element={<NotificationPage />} />
        <Route path="researcher" element={<ResearcherGuard />}>
          <Route index element={<ResearcherPortalPage />} />
        </Route>
        <Route path="admin" element={<AdminGuard />}>
          <Route index element={<AdminDashboard />} />
          <Route path="create-expert" element={<CreateExpertPage />} />
        </Route>
      </Route>
      <Route path="/login" element={<ErrorBoundary region="auth"><LoginPage /></ErrorBoundary>} />
      <Route path="/register" element={<ErrorBoundary region="auth"><RegisterPage /></ErrorBoundary>} />
      <Route path="/confirm-account" element={<ErrorBoundary region="auth"><ConfirmAccountPage /></ErrorBoundary>} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;