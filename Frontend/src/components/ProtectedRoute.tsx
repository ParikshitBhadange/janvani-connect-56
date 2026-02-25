import { Navigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role: 'citizen' | 'admin' }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to={role === 'admin' ? '/admin/login' : '/citizen/login'} replace />;
  if (currentUser.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
