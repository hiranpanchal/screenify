import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLayout from './pages/AdminLayout';
import MediaLibrary from './pages/MediaLibrary';
import SlideshowSettings from './pages/SlideshowSettings';
import ScheduleManager from './pages/ScheduleManager';
import Display from './pages/Display';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#8892a4' }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/display" element={<Display />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/media" replace />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="settings" element={<SlideshowSettings />} />
            <Route path="schedules" element={<ScheduleManager />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin/media" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
