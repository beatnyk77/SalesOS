/**
 * app/dashboard/proposals/page.tsx
 *
 * Task 19: Proposal UI + editable output.
 */

import { createClient } from '../../../lib/supabase/server';
import ProposalsClient from './ProposalsClient';

export default async function ProposalsPage() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // For MVP/demo purposes, we allow a bypass if no user is found,
  // but in production this would redirect to login.
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  return (
    <div className="p-8">
      <ProposalsClient userId={userId} />
    </div>
  );
}
