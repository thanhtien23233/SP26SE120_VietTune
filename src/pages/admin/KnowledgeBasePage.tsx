import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import KnowledgeBasePanel from '@/components/features/kb/KnowledgeBasePanel';

export default function KnowledgeBasePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openCreateOnMount, setOpenCreateOnMount] = useState(false);

  useEffect(() => {
    const st = location.state as { kbOpenCreate?: boolean } | null | undefined;
    if (st?.kbOpenCreate) {
      setOpenCreateOnMount(true);
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  return (
    <KnowledgeBasePanel listBackTo="/admin" openCreateOnMount={openCreateOnMount} />
  );
}
