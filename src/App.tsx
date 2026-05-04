import { lazy, Suspense, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  createBrowserRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
  Outlet,
  Navigate,
} from 'react-router-dom';

import AdminGuard from './components/admin/AdminGuard';
import ResearcherGuard from './components/admin/ResearcherGuard';
import LoginModal from './components/auth/LoginModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingState from './components/common/LoadingState';
import ScrollToTop from './components/common/ScrollToTop';
import MainLayout from './components/layout/MainLayout';
import ResearcherPortalPage from './pages/researcher/ResearcherPortalPage';

const SearchPage = lazy(() => import('./pages/SearchPage'));
const SemanticSearchPage = lazy(() => import('./pages/SemanticSearchPage'));
const ChatbotPage = lazy(() => import('./pages/ChatbotPage'));
const KbEntryPublicViewPage = lazy(() => import('./pages/KbEntryPublicViewPage'));
const InstrumentsPage = lazy(() => import('./pages/InstrumentsPage'));
const EthnicitiesPage = lazy(() => import('./pages/EthnicitiesPage'));
const MastersPage = lazy(() => import('./pages/MastersPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ConfirmAccountPage = lazy(() => import('./pages/auth/ConfirmAccountPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ContributionsPage = lazy(() => import('./pages/ContributionsPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const KnowledgeBasePage = lazy(() => import('./pages/admin/KnowledgeBasePage'));
const CreateExpertPage = lazy(() => import('./pages/admin/CreateExpertPage'));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));
const ApprovedRecordingsPage = lazy(() => import('./pages/ApprovedRecordingsPage'));
const EditRecordingPage = lazy(() => import('./pages/EditRecordingPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const NotificationPage = lazy(() => import('./pages/NotificationPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const RecordingDetailPage = lazy(() => import('./pages/RecordingDetailPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState size="lg" padded />}>
      {children}
    </Suspense>
  );
}

// Root wrapper to provide shared context/components within the RouterProvider
function RootWrapper() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      <ScrollToTop />
      <LoginModal />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootWrapper />}>
      <Route path="/" element={<MainLayout />}>
        <Route
          index
          element={
            <RouteSuspense>
              <HomePage />
            </RouteSuspense>
          }
        />
        <Route
          path="explore"
          element={
            <RouteSuspense>
              <ExplorePage />
            </RouteSuspense>
          }
        />
        <Route
          path="recordings/:id"
          element={
            <RouteSuspense>
              <RecordingDetailPage />
            </RouteSuspense>
          }
        />
        {/* TODO(route-policy): candidate protected route review in Sprint 3.2+ */}
        <Route
          path="recordings/:id/edit"
          element={
            <RouteSuspense>
              <EditRecordingPage />
            </RouteSuspense>
          }
        />
        {/* TODO(route-policy): candidate protected route review in Sprint 3.2+ */}
        <Route
          path="upload"
          element={
            <RouteSuspense>
              <UploadPage />
            </RouteSuspense>
          }
        />
        <Route
          path="search"
          element={
            <RouteSuspense>
              <SearchPage />
            </RouteSuspense>
          }
        />
        <Route
          path="semantic-search"
          element={
            <RouteSuspense>
              <SemanticSearchPage />
            </RouteSuspense>
          }
        />
        <Route
          path="chatbot"
          element={
            <RouteSuspense>
              <ChatbotPage />
            </RouteSuspense>
          }
        />
        <Route
          path="kb/entry/:id"
          element={
            <RouteSuspense>
              <KbEntryPublicViewPage />
            </RouteSuspense>
          }
        />
        <Route
          path="instruments"
          element={
            <RouteSuspense>
              <InstrumentsPage />
            </RouteSuspense>
          }
        />
        <Route
          path="ethnicities"
          element={
            <RouteSuspense>
              <EthnicitiesPage />
            </RouteSuspense>
          }
        />
        <Route
          path="masters"
          element={
            <RouteSuspense>
              <MastersPage />
            </RouteSuspense>
          }
        />
        <Route
          path="about"
          element={
            <RouteSuspense>
              <AboutPage />
            </RouteSuspense>
          }
        />
        <Route
          path="terms"
          element={
            <RouteSuspense>
              <TermsPage />
            </RouteSuspense>
          }
        />
        {/* TODO(route-policy): auth-only route candidate in Sprint 3.2+ */}
        <Route
          path="profile"
          element={
            <RouteSuspense>
              <ProfilePage />
            </RouteSuspense>
          }
        />
        {/* TODO(route-policy): auth-only route candidate in Sprint 3.2+ */}
        <Route
          path="contributions"
          element={
            <RouteSuspense>
              <ContributionsPage />
            </RouteSuspense>
          }
        />
        <Route path="dashboard" element={<Navigate to="/moderation" replace />} />
        {/* TODO(route-policy): role/auth review in Sprint 3.2+ */}
        <Route
          path="moderation"
          element={
            <RouteSuspense>
              <ModerationPage />
            </RouteSuspense>
          }
        />
        {/* TODO(route-policy): role/auth review in Sprint 3.2+ */}
        <Route
          path="approved-recordings"
          element={
            <RouteSuspense>
              <ApprovedRecordingsPage />
            </RouteSuspense>
          }
        />
        {/* TODO(route-policy): auth-only route candidate in Sprint 3.2+ */}
        <Route
          path="notifications"
          element={
            <RouteSuspense>
              <NotificationPage />
            </RouteSuspense>
          }
        />
        <Route path="researcher" element={<ResearcherGuard />}>
          <Route
            index
            element={
              <RouteSuspense>
                <ResearcherPortalPage />
              </RouteSuspense>
            }
          />
        </Route>
        <Route path="admin" element={<AdminGuard />}>
          <Route
            index
            element={
              <RouteSuspense>
                <AdminDashboard />
              </RouteSuspense>
            }
          />
          <Route
            path="create-expert"
            element={
              <RouteSuspense>
                <CreateExpertPage />
              </RouteSuspense>
            }
          />
          <Route
            path="knowledge-base"
            element={
              <RouteSuspense>
                <KnowledgeBasePage />
              </RouteSuspense>
            }
          />
        </Route>
      </Route>
      <Route
        path="/login"
        element={
          <ErrorBoundary region="auth">
            <RouteSuspense>
              <LoginPage />
            </RouteSuspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/register"
        element={
          <ErrorBoundary region="auth">
            <RouteSuspense>
              <RegisterPage />
            </RouteSuspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/auth/register-researcher"
        element={
          <ErrorBoundary region="auth">
            <RouteSuspense>
              <RegisterPage />
            </RouteSuspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/confirm-account"
        element={
          <ErrorBoundary region="auth">
            <RouteSuspense>
              <ConfirmAccountPage />
            </RouteSuspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <ErrorBoundary region="auth">
            <RouteSuspense>
              <ForgotPasswordPage />
            </RouteSuspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/403"
        element={
          <RouteSuspense>
            <ForbiddenPage />
          </RouteSuspense>
        }
      />
      <Route
        path="*"
        element={
          <RouteSuspense>
            <NotFoundPage />
          </RouteSuspense>
        }
      />
    </Route>,
  ),
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
