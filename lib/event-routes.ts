import type { AdminScreen } from './admin-routes.ts';

function route(
  batch: AdminScreen['batch'],
  index: number,
  routePath: string,
  title: string,
  subtitle: string,
  kind: AdminScreen['kind'],
  nav: AdminScreen['nav'],
  permission: string,
  extra: Partial<AdminScreen> = {},
): AdminScreen {
  return {
    id: `${batch}-${String(index).padStart(2, '0')}`,
    batch,
    route: routePath,
    title,
    subtitle,
    kind,
    permission,
    scope: 'global',
    nav,
    ...extra,
  };
}

export const eventScreens: AdminScreen[] = [
  route('P', 1, '/admin/events', 'Events', 'Manage ministry events, registration windows, and publishing.', 'table', 'events', 'events.events.view', {
    action: '+ Create Event',
    columns: ['Name', 'Category', 'Status', 'Updated'],
  }),
  route('P', 2, '/admin/events/create', 'Create Event', 'Add a new ministry event to the catalogue.', 'form', 'events', 'events.events.manage', {
    action: 'Create Event',
  }),
  route('P', 3, '/admin/events/sample-event', 'Event Detail', 'Review event configuration and registrations.', 'detail', 'events', 'events.events.view', {
    tabs: ['Overview', 'Registrations'],
    details: { Status: 'Loading', 'Event ID': 'sample-event' },
  }),
  route('P', 4, '/admin/events/registrations', 'Event Registrations', 'Review registrations across all events.', 'table', 'events', 'events.registrations.view', {
    columns: ['Name', 'Status', 'Updated'],
  }),
];
