import { Navigate } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { pageMeta } from '@/lib/pageData';

const Index = () => {
  usePageMeta(pageMeta.Index);
  return <Navigate to="/" replace />;
};

export default Index;
