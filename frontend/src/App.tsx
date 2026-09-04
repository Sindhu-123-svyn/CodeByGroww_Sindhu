import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/shared/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DigestPage } from "./pages/DigestPage";
import { WatchlistManagePage } from "./pages/WatchlistManagePage";
import { SymbolDetailPage } from "./pages/SymbolDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DigestPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/watchlists"
        element={
          <ProtectedRoute>
            <Layout>
              <WatchlistManagePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/symbols/:symbolId"
        element={
          <ProtectedRoute>
            <Layout>
              <SymbolDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
