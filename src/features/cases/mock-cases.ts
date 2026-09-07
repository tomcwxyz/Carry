import type { CarryCase } from './types';

export const mockCases: CarryCase[] = [
  {
    id: 'gutter',
    title: 'Gutter',
    outcome: 'Get the rear gutter flowing normally and check for obvious damage.',
    summary: 'Thursday slot found · £85 · best of three options checked',
    state: 'needs_user',
    domain: 'household',
    space: 'Personal',
    nextAction: 'A suitable cleaner has a Thursday morning slot.',
    decisionLabel: 'Book Thursday',
    plan: [
      { id: 'weather', label: 'Check whether the problem is urgent', state: 'done' },
      { id: 'options', label: 'Find and compare suitable local services', state: 'done' },
      { id: 'book', label: 'Arrange the visit', state: 'active' },
      { id: 'verify', label: 'Check the gutter is flowing afterwards', state: 'todo' },
    ],
    activity: [
      { id: 'g1', at: '20:14', actor: 'you', label: 'Reported the overflowing rear gutter' },
      { id: 'g2', at: '20:15', actor: 'carry', label: 'Checked urgency and likely next steps' },
      { id: 'g3', at: '20:17', actor: 'carry', label: 'Compared three suitable services' },
    ],
  },
  {
    id: 'ship-check',
    title: 'Ship Check alpha',
    outcome: 'Have the next alpha build ready to test.',
    summary: 'Checking the release path and current blockers',
    state: 'carrying',
    domain: 'code',
    space: 'Good Ship',
    nextAction: 'Carry is checking the release workflow.',
    plan: [
      { id: 'inspect', label: 'Inspect current release state', state: 'done' },
      { id: 'build', label: 'Prepare the next build', state: 'active' },
      { id: 'checks', label: 'Run release checks', state: 'todo' },
    ],
    activity: [
      { id: 's1', at: '18:42', actor: 'you', label: 'Asked Carry to get the next alpha ready' },
      { id: 's2', at: '18:44', actor: 'carry', label: 'Started checking the release state' },
    ],
  },
  {
    id: 'sixty-one',
    title: 'Sixty One',
    outcome: 'Reconnect with Elizabeth and arrange the CiviCRM support.',
    summary: 'Waiting for Elizabeth to reply',
    state: 'waiting',
    domain: 'work',
    space: 'Good Ship',
    nextAction: 'Resume when a reply arrives.',
    plan: [
      { id: 'draft', label: 'Prepare reconnection email', state: 'done' },
      { id: 'send', label: 'Send email', state: 'done' },
      { id: 'reply', label: 'Wait for response', state: 'active' },
    ],
    activity: [
      { id: 'e1', at: 'Mon', actor: 'you', label: 'Approved the reconnection email' },
      { id: 'e2', at: 'Mon', actor: 'carry', label: 'Marked the case as waiting for a reply' },
    ],
  },
  {
    id: 'mot',
    title: 'Car MOT',
    outcome: 'Get the car through its MOT before it expires.',
    summary: 'Garage appointment booked for 16 September',
    state: 'waiting',
    domain: 'admin',
    space: 'Personal',
    nextAction: 'Appointment is booked; nothing needed until the day.',
    plan: [
      { id: 'due', label: 'Check due date', state: 'done' },
      { id: 'garage', label: 'Find a suitable garage', state: 'done' },
      { id: 'slot', label: 'Book appointment', state: 'done' },
      { id: 'visit', label: 'Attend MOT', state: 'active' },
    ],
    activity: [
      { id: 'm1', at: 'Fri', actor: 'carry', label: 'Booked the MOT appointment' },
    ],
  },
];

export function getCaseById(id: string | string[] | undefined) {
  const caseId = Array.isArray(id) ? id[0] : id;
  return mockCases.find((item) => item.id === caseId);
}
