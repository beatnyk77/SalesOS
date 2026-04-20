/**
 * scratch/test-meeting-prep.ts
 */
import { MeetingPrepCrew, MeetingInput } from '../lib/agents/crews/meeting-prep';

async function test() {
  const crew = new MeetingPrepCrew();
  
  const testInput: MeetingInput = {
    meeting_id: 'test_meeting_123',
    user_id: 'test_user_456',
    company_name: 'Stripe',
    attendees: [
      { name: 'John Doe', role: 'Head of Growth' },
      { name: 'Jane Smith', role: 'Sales Operations Manager' }
    ],
    scheduled_at: new Date().toISOString(),
    description: 'Initial discovery call for SalesOS integration.'
  };

  console.log('Running MeetingPrepCrew test...');
  const result = await crew.run(testInput);
  
  if (result.success) {
    console.log('SUCCESS: Brief generated');
    console.log(JSON.stringify(result.brief, null, 2));
  } else {
    console.log('FAILED:', result.error);
  }
}

test().catch(console.error);
