import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../auth/AuthProvider';
import { useBackend } from '../services/BackendContext';

export function useStaffOverview() {
  const { workspace } = useWorkspace();
  const { data } = useBackend();
  return useQuery({ queryKey: ['ws', workspace.id, 'staff-overview'], queryFn: ({ signal }) => data.getStaffOverview(workspace.id, { signal }), staleTime: 0 });
}
