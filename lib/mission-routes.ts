import type { AdminScreen } from './admin-routes';

const crusades = [
  { 'Crusade Name': 'Lagos Mega Crusade', Location: 'Lagos, Nigeria', 'Start Date': 'May 15, 2024', 'End Date': 'May 18, 2024', Souls: '1,842', Status: 'Completed' },
  { 'Crusade Name': 'Ibadan City Crusade', Location: 'Ibadan, Nigeria', 'Start Date': 'Apr 25, 2024', 'End Date': 'Apr 28, 2024', Souls: '1,256', Status: 'Completed' },
  { 'Crusade Name': 'Kano Outreach', Location: 'Kano, Nigeria', 'Start Date': 'Apr 12, 2024', 'End Date': 'Apr 14, 2024', Souls: '1,128', Status: 'Completed' },
  { 'Crusade Name': 'Abuja for Jesus', Location: 'Abuja, Nigeria', 'Start Date': 'May 3, 2024', 'End Date': 'May 5, 2024', Souls: '1,022', Status: 'Completed' },
  { 'Crusade Name': 'Port Harcourt Outreach', Location: 'Port Harcourt', 'Start Date': 'Apr 20, 2024', 'End Date': 'Apr 21, 2024', Souls: '892', Status: 'Completed' },
  { 'Crusade Name': 'Kaduna City Crusade', Location: 'Kaduna, Nigeria', 'Start Date': 'May 17, 2024', 'End Date': 'May 19, 2024', Souls: '756', Status: 'Planning' },
];

const souls = [
  { Name: 'Chinedu Okafor', Crusade: 'Lagos Mega Crusade', 'Date Won': 'May 12, 2024', Status: 'New', Mentor: 'Sister Mary' },
  { Name: 'Aisha Mohammed', Crusade: 'Lagos Mega Crusade', 'Date Won': 'May 10, 2024', Status: 'New', Mentor: 'Brother Daniel' },
  { Name: 'Tunde Adeleke', Crusade: 'Ibadan City Crusade', 'Date Won': 'Apr 28, 2024', Status: 'New', Mentor: 'Sister Grace' },
  { Name: 'Blessing Nwosu', Crusade: 'Abuja for Jesus', 'Date Won': 'May 3, 2024', Status: 'New', Mentor: 'Pastor John' },
  { Name: 'Emeka Obi', Crusade: 'Kano Outreach', 'Date Won': 'Apr 14, 2024', Status: 'New', Mentor: 'Brother Mike' },
  { Name: 'Joy Daniel', Crusade: 'Lagos Mega Crusade', 'Date Won': 'May 11, 2024', Status: 'New', Mentor: 'Sister Mary' },
];

const partners = [
  { 'Partner Name': 'Bible Society of Nigeria', Type: 'Organization', Location: 'Lagos', Status: 'Active', Relationship: 'Strategic' },
  { 'Partner Name': 'Global Harvest Missions', Type: 'Ministry', Location: 'Abuja', Status: 'Active', Relationship: 'Partner' },
  { 'Partner Name': 'Youth for Christ', Type: 'Ministry', Location: 'Ibadan', Status: 'Active', Relationship: 'Partner' },
  { 'Partner Name': 'Healing Hands Int.', Type: 'Organization', Location: 'Port Harcourt', Status: 'Inactive', Relationship: 'Supporter' },
  { 'Partner Name': 'Outreach International', Type: 'Organization', Location: 'Lagos', Status: 'Active', Relationship: 'Partner' },
];

export const missionScreens: AdminScreen[] = [
  {
    id: 'I-01', batch: 'I', route: '/admin/mission', title: 'Mission Dashboard',
    subtitle: 'Global overview of missions and soul winning.', kind: 'ministry-dashboard',
    permission: 'mission.dashboard.view', scope: 'assigned', nav: 'mission',
    metrics: [
      { label: 'Crusades', value: '32', trend: '+12%' },
      { label: 'Souls Won', value: '12,458', trend: '+18%' },
      { label: 'New Converts', value: '6,842', trend: '+15%' },
      { label: 'Follow-ups', value: '8,206', trend: '+12%' },
    ],
    tabs: ['May 1 – May 31, 2024', 'Souls Over Time', 'Souls by Status'],
    rows: crusades.slice(0, 5),
    items: ['Create Crusade', 'Add Soul', 'Invite to Crusade', 'Mission Report'],
  },
  {
    id: 'I-02', batch: 'I', route: '/admin/mission/crusades', title: 'Crusades',
    subtitle: 'Manage all crusades and outreach events.', kind: 'table',
    permission: 'mission.crusade.view', scope: 'assigned', nav: 'crusades', action: '+ Create Crusade',
    tabs: ['All Statuses', 'All Types'], columns: ['Crusade Name', 'Location', 'Start Date', 'End Date', 'Souls', 'Status'], rows: crusades,
  },
  {
    id: 'I-03', batch: 'I', route: '/admin/mission/crusades/lagos-mega-crusade', title: 'Lagos Mega Crusade',
    subtitle: 'May 15 – May 18, 2024 · Lagos, Nigeria · Completed', kind: 'detail',
    permission: 'mission.crusade.view', scope: 'assigned', nav: 'crusades',
    tabs: ['Overview', 'Planning', 'Teams', 'Souls', 'Follow-Ups', 'Reports', 'Finance'],
    metrics: [
      { label: 'Souls Won', value: '1,842' }, { label: 'New Converts', value: '1,023' },
      { label: 'Follow Ups', value: '689' }, { label: 'Teams', value: '28' }, { label: 'Workers', value: '312' },
    ],
    details: {
      Theme: 'Jesus Saves', 'Host Church': 'The Covenant Place, Lagos',
      'Crusade Lead': 'Pastor Samuel Adeyemi', Venue: 'Tafawa Balewa Square, Lagos',
      Type: 'Open Air Crusade', Focus: 'Salvation & Healing', Status: 'Completed',
    },
    items: ['View Souls', 'Follow-Up Dashboard', 'Crusade Report', 'Financial Summary'],
  },
  {
    id: 'I-04', batch: 'I', route: '/admin/mission/crusades/create', title: 'Create Crusade',
    subtitle: 'Step 1 of 4 · Basic information.', kind: 'wizard',
    permission: 'mission.crusade.create', scope: 'assigned', nav: 'crusades', action: 'Next: Planning',
    tabs: ['Basics', 'Planning', 'Teams', 'Review'],
    details: {
      'Crusade Name': 'Enter crusade name', Theme: 'Enter theme', Location: 'Select location', Venue: 'Enter venue',
      'Start Date': 'Select start date', 'End Date': 'Select end date', 'Crusade Type': 'Select type', Focus: 'Select focus', Description: 'Enter description...',
    },
  },
  {
    id: 'I-05', batch: 'I', route: '/admin/mission/crusades/lagos-mega-crusade/invitations', title: 'Crusade Invitations',
    subtitle: 'Review and manage crusade invitations.', kind: 'table',
    permission: 'mission.invitation.view', scope: 'assigned', nav: 'crusades',
    tabs: ['All (24)', 'Pending (12)', 'Approved (8)', 'Declined (2)', 'Withdrawn (2)'],
    columns: ['Invitee', 'Location', 'Invited By', 'Date', 'Status'],
    rows: [
      { Invitee: 'RCCG City Chapel', Location: 'Lagos', 'Invited By': 'Pastor John', Date: 'May 14, 2024', Status: 'Pending' },
      { Invitee: 'Living Faith Church', Location: 'Abuja', 'Invited By': 'Pastor David', Date: 'May 13, 2024', Status: 'Pending' },
      { Invitee: 'Winners Chapel', Location: 'Ibadan', 'Invited By': 'Pastor James', Date: 'May 14, 2024', Status: 'Approved' },
      { Invitee: 'Christ Embassy', Location: 'Port Harcourt', 'Invited By': 'Pastor Felix', Date: 'May 12, 2024', Status: 'Approved' },
      { Invitee: 'The Elevation Church', Location: 'Lagos', 'Invited By': 'Pastor Femi', Date: 'May 11, 2024', Status: 'Declined' },
    ],
  },
  {
    id: 'I-06', batch: 'I', route: '/admin/mission/crusades/lagos-mega-crusade/invitations/rccg-city-chapel', title: 'Review Invitation',
    subtitle: 'Step 3 of 3 · Review invitation.', kind: 'approval',
    permission: 'mission.invitation.review', scope: 'assigned', nav: 'crusades', action: 'Approve',
    details: {
      Invitee: 'RCCG City Chapel', Location: 'Lagos, Nigeria', 'Invited By': 'Pastor John Adele',
      Date: 'May 12, 2024', Crusade: 'Lagos Mega Crusade', 'Start Date': 'May 15, 2024',
      'End Date': 'May 18, 2024', Type: 'Open Air Crusade',
      Message: 'We would like to partner with you in the Lagos Mega Crusade. Your church is invited to participate in this kingdom work.',
    },
    items: ['Invitation Letter.pdf', 'Crusade Outline.pdf', 'Logistics Plan.pdf'],
  },
  {
    id: 'I-07', batch: 'I', route: '/admin/mission/crusades/lagos-mega-crusade/planning', title: 'Planning',
    subtitle: '7 / 7 steps completed.', kind: 'workflow',
    permission: 'mission.crusade.plan', scope: 'assigned', nav: 'crusades',
    tabs: ['General', 'Schedule', 'Logistics', 'Communication', 'Budget'],
    details: {
      Theme: 'Jesus Saves', Objectives: 'Win souls for Christ; heal the sick; raise disciples; strengthen local churches.',
      'Planning Start': 'Apr 10, 2024', 'Workers Training': 'Apr 30, 2024',
      'Publicity Start': 'May 1, 2024', 'Crusade Start': 'May 15, 2024', 'Crusade End': 'May 18, 2024', 'Follow-Up Start': 'May 19, 2024',
    },
    items: ['General — Completed', 'Schedule — Completed', 'Logistics — Completed', 'Communication — Completed', 'Budget — Completed'],
  },
  {
    id: 'I-08', batch: 'I', route: '/admin/mission/crusades/lagos-mega-crusade/teams', title: 'Teams',
    subtitle: 'Manage crusade teams.', kind: 'table',
    permission: 'mission.team.view', scope: 'assigned', nav: 'crusades', action: '+ Add Team',
    metrics: [
      { label: 'Total Teams', value: '28' }, { label: 'Team Leaders', value: '28' },
      { label: 'Team Members', value: '312' }, { label: 'Vacancies', value: '32' },
    ],
    columns: ['Team', 'Leader', 'Members', 'Size', 'Status'],
    rows: [
      { Team: 'Prayer Team', Leader: 'Sister Mary', Members: '18', Size: '100%', Status: 'Active' },
      { Team: 'Counselling Team', Leader: 'Brother Daniel', Members: '14', Size: '100%', Status: 'Active' },
      { Team: 'Follow-Up Team', Leader: 'Brother John', Members: '24', Size: '80%', Status: 'Active' },
      { Team: 'Media Team', Leader: 'Sister Ruth', Members: '14', Size: '80%', Status: 'Active' },
      { Team: 'Logistics Team', Leader: 'Brother Mike', Members: '20', Size: '100%', Status: 'Active' },
    ],
  },
  {
    id: 'I-09', batch: 'I', route: '/admin/mission/crusades/lagos-mega-crusade/teams/counselling', title: 'Counselling Team',
    subtitle: 'Crusade team · Active', kind: 'detail',
    permission: 'mission.team.view', scope: 'assigned', nav: 'crusades',
    tabs: ['Overview', 'Members', 'Souls', 'Performance', 'Notes'],
    metrics: [
      { label: 'Members', value: '18' }, { label: 'Assigned Souls', value: '150' }, { label: 'Followed Up', value: '96 (64%)' },
    ],
    details: { Leader: 'Brother Daniel', Description: 'Responsible for counselling new souls, prayer and immediate follow-up.' },
    items: ['Brother Daniel — Leader', 'Sister Mary — Co-Leader', 'Brother James — Member', 'Sister Ruth — Member', 'Brother David — Member'],
  },
  {
    id: 'I-10', batch: 'I', route: '/admin/mission/souls', title: 'Souls',
    subtitle: 'Manage all souls won in crusades.', kind: 'table',
    permission: 'mission.soul.view', scope: 'assigned', nav: 'souls', action: '+ Add Soul',
    tabs: ['All Statuses', 'All Crusades'], columns: ['Name', 'Crusade', 'Date Won', 'Status', 'Mentor'], rows: souls,
  },
  {
    id: 'I-11', batch: 'I', route: '/admin/mission/souls/chinedu-okafor', title: 'Chinedu Okafor',
    subtitle: 'New soul · Lagos Mega Crusade', kind: 'detail',
    permission: 'mission.soul.view', scope: 'assigned', nav: 'souls', action: 'Register',
    details: {
      Age: '28', Gender: 'Male', Phone: '+234 806 234 5678', Email: 'chinedu.okafor@gmail.com',
      Address: 'Lagos, Nigeria', Occupation: 'Student', 'Referred By': 'Friend', 'Date Won': 'May 12, 2024',
      'Spiritual Information': 'Decision made: Yes · Baptism: No · Prayer of salvation: May 12, 2024',
    },
    items: ['Declare', 'Discipleship Status', 'Register'],
  },
  {
    id: 'I-12', batch: 'I', route: '/admin/mission/souls/distribution', title: 'Soul Distribution',
    subtitle: 'Distribute souls to teams and mentors.', kind: 'operations',
    permission: 'mission.soul.assign', scope: 'assigned', nav: 'souls', action: 'Distribute Souls',
    metrics: [
      { label: 'Unassigned Souls', value: '245' }, { label: 'Assigned Today', value: '86' },
      { label: 'Total Teams', value: '18' }, { label: 'Total Mentors', value: '42' },
    ],
    tabs: ['Distribution by Team', 'Recent Distributions'],
    items: ['Counselling — 35%', 'Discipleship — 30%', 'Follow-Up — 20%', 'Other — 15%'],
    rows: [
      { Crusade: 'Lagos Mega Crusade', Mentor: 'Sister Mary', Souls: '42', Date: 'May 11, 2024' },
      { Crusade: 'Abuja Outreach', Mentor: 'Brother Daniel', Souls: '28', Date: 'May 10, 2024' },
      { Crusade: 'Ibadan City', Mentor: 'Sister Grace', Souls: '36', Date: 'May 10, 2024' },
    ],
  },
  {
    id: 'I-13', batch: 'I', route: '/admin/mission/mentor-assignments', title: 'Mentor Assignment',
    subtitle: 'Assign mentors to souls.', kind: 'table',
    permission: 'mission.mentor.assign', scope: 'assigned', nav: 'souls', action: 'Edit Mentor',
    metrics: [
      { label: 'Total Mentors', value: '42' }, { label: 'Available', value: '38' },
      { label: 'Souls per Mentor', value: '23' }, { label: 'Mentors Near', value: '6' },
    ],
    columns: ['Mentor', 'Soul', 'Program', 'Date', 'Status'],
    rows: [
      { Mentor: 'Sister Mary', Soul: 'Aisha Mohammed', Program: 'Leadership', Date: 'May 20, 2024', Status: 'Pending' },
      { Mentor: 'Brother Daniel', Soul: 'Chinedu Okafor', Program: 'Bible Study', Date: 'May 20, 2024', Status: 'Pending' },
      { Mentor: 'Pastor Samuel', Soul: 'Tunde Adeleke', Program: 'Welfare', Date: 'May 18, 2024', Status: 'Assigned' },
      { Mentor: 'Sister Grace', Soul: 'Blessing Nwosu', Program: 'Engagement', Date: 'May 20, 2024', Status: 'Assigned' },
    ],
  },
  {
    id: 'I-14', batch: 'I', route: '/admin/mission/follow-up', title: 'Follow-Up',
    subtitle: 'Crusade soul follow-up and response gaps.', kind: 'operations',
    permission: 'mission.follow_up.view', scope: 'assigned', nav: 'mission-follow-up', action: 'View Follow-Up List',
    metrics: [
      { label: 'Total Souls', value: '1,842' }, { label: 'Contacted', value: '1,234' },
      { label: 'Awaiting Follow-Up', value: '368' }, { label: 'Overdue', value: '6' },
    ],
    tabs: ['Follow-Up by Status', 'Overdue Follow-Ups'],
    items: ['On Track — 44%', 'Overdue — 26%', 'Completed — 18%', 'Dropped — 12%'],
    rows: [
      { Name: 'Aisha Mohammed', Mentor: 'Sister Mary', Status: '5 days overdue' },
      { Name: 'Emeka Obi', Mentor: 'Brother Daniel', Status: '7 days overdue' },
      { Name: 'Joy Daniel', Mentor: 'Sister Grace', Status: '4 days overdue' },
      { Name: 'Peter Okoro', Mentor: 'Brother Mike', Status: '6 days overdue' },
    ],
  },
  {
    id: 'I-15', batch: 'I', route: '/admin/mission/follow-up/gaps', title: 'Follow-Up Gap Dashboard',
    subtitle: 'Follow-up gaps and mentor workload trends.', kind: 'kpi',
    permission: 'mission.follow_up.report', scope: 'assigned', nav: 'mission-follow-up', action: 'Take Action',
    metrics: [
      { label: 'Total Souls', value: '1,842' }, { label: 'Followed Up', value: '1,074', trend: '+8%' },
      { label: 'Not Contacted', value: '768' }, { label: 'Overdue (7+ days)', value: '312', trend: '+14%' },
    ],
    tabs: ['Gap by Crusade', 'Gap by Days'],
    items: ['Lagos Mega — 85%', 'Ibadan City — 65%', 'Kano Outreach — 55%', 'Abuja for Jesus — 45%', 'Port Harcourt — 40%', '0–3 days — 35%', '4–7 days — 28%', '8–14 days — 24%', '15+ days — 13%'],
  },
  {
    id: 'I-16', batch: 'I', route: '/admin/mission/partners', title: 'Mission Partners',
    subtitle: 'Manage mission partners and organizations.', kind: 'table',
    permission: 'mission.partner.view', scope: 'assigned', nav: 'partners', action: '+ Add Partner',
    metrics: [
      { label: 'Partners', value: '86' }, { label: 'Active', value: '64' },
      { label: 'Inactive', value: '12' }, { label: 'New This Month', value: '10' },
    ],
    columns: ['Partner Name', 'Type', 'Location', 'Status', 'Relationship'], rows: partners,
  },
  {
    id: 'I-17', batch: 'I', route: '/admin/mission/partners/bible-society-of-nigeria', title: 'Bible Society of Nigeria',
    subtitle: 'Mission partner · Active', kind: 'detail',
    permission: 'mission.partner.view', scope: 'assigned', nav: 'partners',
    tabs: ['Overview', 'Contacts', 'Partnership', 'Activities', 'Support', 'Documents'],
    details: {
      Type: 'Organization', Location: 'Lagos, Nigeria', Established: 'Jan 11, 1993',
      Website: 'www.biblesociety.org.ng', Email: 'info@biblesociety.org.ng', Phone: '+234 800 000 0000',
      'About Partner': 'Bible distribution and affordable access to scripture.',
      'Current Partnership': 'Crusade materials; training evangelists; literacy and Bible engagement.',
    },
  },
  {
    id: 'I-18', batch: 'I', route: '/admin/mission/support-requests', title: 'Support Requests',
    subtitle: 'Mission support requests awaiting response.', kind: 'table',
    permission: 'mission.support.view', scope: 'assigned', nav: 'partners', action: '+ New Request',
    metrics: [
      { label: 'Total Requests', value: '36' }, { label: 'Pending', value: '14' },
      { label: 'Approved', value: '16' }, { label: 'Completed', value: '6' },
    ],
    columns: ['Request Title', 'Requested By', 'Type', 'Amount', 'Status'],
    rows: [
      { 'Request Title': 'Bibles for Outreach', 'Requested By': 'Pastor John', Type: 'Bibles', Amount: '₦125,000', Status: 'Pending' },
      { 'Request Title': 'Transport Support', 'Requested By': 'Sister Mary', Type: 'Logistics', Amount: '₦85,000', Status: 'Approved' },
      { 'Request Title': 'Feeding Program', 'Requested By': 'Brother Daniel', Type: 'Welfare', Amount: '₦250,000', Status: 'Pending' },
      { 'Request Title': 'Sound System', 'Requested By': 'Pastor Samuel', Type: 'Equipment', Amount: '₦450,000', Status: 'Approved' },
      { 'Request Title': 'Tents and Chairs', 'Requested By': 'Brother Mike', Type: 'Logistics', Amount: '₦300,000', Status: 'Completed' },
    ],
  },
  {
    id: 'I-19', batch: 'I', route: '/admin/mission/follow-up/management', title: 'Follow-Up Management',
    subtitle: 'Follow-up management and mission reports.', kind: 'kpi',
    permission: 'mission.follow_up.manage', scope: 'assigned', nav: 'mission-follow-up', action: 'View Report',
    metrics: [
      { label: 'Total Souls', value: '1,842' }, { label: 'Followed Up', value: '1,234', trend: '+8%' },
      { label: 'Not Contacted', value: '768', trend: '+14%' },
    ],
    tabs: ['Gap by Crusade', 'Gap by Days'],
    items: ['Lagos Mega — 35%', 'Ibadan City — 22%', 'Abuja for Jesus — 18%', 'Kano Outreach — 15%', 'Port Harcourt — 10%', '0–3 days — 35%', '4–7 days — 28%', '8–14 days — 24%', '15+ days — 13%'],
  },
  {
    id: 'I-20', batch: 'I', route: '/admin/mission/reports', title: 'Mission Reports',
    subtitle: 'Generate and download mission reports.', kind: 'reports',
    permission: 'mission.report.view', scope: 'assigned', nav: 'reports', action: 'Create Custom Report',
    tabs: ['Popular Reports', 'Recent Reports'],
    items: [
      'Crusade Report', 'Soul Winning Report', 'Follow-Up Report', 'Partners Report', 'Financial Report',
      'Impact Report', 'Monthly Summary', 'May 2024 Giving Report', 'Finance Report — May 2024',
      'Follow-Up Report — May 2024', 'April 2024 Summary', 'April 2024 Giving Report',
    ],
  },
  {
    id: 'I-21', batch: 'I', route: '/admin/mission/ai-assistant', title: 'Mission AI Assistant',
    subtitle: 'Your AI companion for mission intelligence.', kind: 'command',
    permission: 'mission.ai.use', scope: 'assigned', nav: 'ai-assistant', action: 'Ask Mission AI',
    items: [
      'How can we improve follow-up?', 'Which crusade has the highest conversion?',
      'Predict next month’s soul target', 'List inactive partners',
      'AI Insight — Based on your data, follow-up rates can be improved by assigning more mentors. 312 souls are overdue for follow-up.',
    ],
  },
];
