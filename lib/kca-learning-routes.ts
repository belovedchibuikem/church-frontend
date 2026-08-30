import type { AdminScreen } from './admin-routes.ts';

const studentRows = [
  { Name: 'Samuel David', ID: 'KCA-2024-0001', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'Active', Progress: '72%' },
  { Name: 'Grace Ese', ID: 'KCA-2024-0004', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'Active', Progress: '77%' },
  { Name: 'Daniel Johnson', ID: 'KCA-2024-0007', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'Active', Progress: '71%' },
  { Name: 'Precious Adediji', ID: 'KCA-2024-0008', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'Active', Progress: '79%' },
  { Name: 'Michael Emmanuel', ID: 'KCA-2024-0009', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'At Risk', Progress: '19%' },
  { Name: 'Faith Abiola', ID: 'KCA-2024-0011', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'At Risk', Progress: '77%' },
  { Name: 'Esther Daniels', ID: 'KCA-2024-0014', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'At Risk', Progress: '71%' },
  { Name: 'Joshua Peter', ID: 'KCA-2024-0016', Cohort: '2024 Cohort A', Year: 'Year 1', Mentor: 'Mary Okoro', Status: 'Completed', Progress: '72%' },
];

const cohortRows = [
  { 'Cohort Name': '2024 Cohort A', Year: '2024', Region: 'Lagos', Students: '312', Mentors: '28', Status: 'Active', 'Start Date': 'Jan 15, 2024' },
  { 'Cohort Name': '2024 Cohort B', Year: '2024', Region: 'Abuja', Students: '286', Mentors: '24', Status: 'Active', 'Start Date': 'Feb 5, 2024' },
  { 'Cohort Name': '2024 Cohort C', Year: '2024', Region: 'Port Harcourt', Students: '198', Mentors: '20', Status: 'Active', 'Start Date': 'Mar 10, 2024' },
  { 'Cohort Name': '2023 Cohort A', Year: '2023', Region: 'Lagos', Students: '245', Mentors: '22', Status: 'Completed', 'Start Date': 'Jan 16, 2023' },
  { 'Cohort Name': '2023 Cohort B', Year: '2023', Region: 'Abuja', Students: '201', Mentors: '18', Status: 'Completed', 'Start Date': 'Feb 6, 2023' },
  { 'Cohort Name': '2023 Cohort C', Year: '2023', Region: 'Port Harcourt', Students: '160', Mentors: '16', Status: 'Completed', 'Start Date': 'Mar 13, 2023' },
];

const mentorRows = [
  { Mentor: 'Mary Okoro', Region: 'Lagos', Cohorts: '2024 A, B', Students: '48', Status: 'Active' },
  { Mentor: 'Pastor Tunde', Region: 'Abuja', Cohorts: '2024 A', Students: '42', Status: 'Active' },
  { Mentor: 'Sister Grace', Region: 'PH', Cohorts: '2024 A, C', Students: '36', Status: 'Active' },
  { Mentor: 'Brother Daniel', Region: 'Lagos', Cohorts: '2023 A, B', Students: '45', Status: 'Inactive' },
  { Mentor: 'Elder James', Region: 'Abuja', Cohorts: '2023 C', Students: '32', Status: 'Active' },
];

const lecturerRows = [
  { Lecturer: 'Dr. John Samuel', Specialization: 'Systematic Theology', Modules: '5', Status: 'Active' },
  { Lecturer: 'Rev. Peace Okafor', Specialization: 'Bible & Exegesis', Modules: '4', Status: 'Active' },
  { Lecturer: 'Pastor David Emmanuel', Specialization: 'Leadership & Ministry', Modules: '6', Status: 'Active' },
  { Lecturer: 'Dr. Grace Adenina', Specialization: 'Christian Living', Modules: '3', Status: 'Active' },
  { Lecturer: 'Prof. Michael Eze', Specialization: 'Church History', Modules: '2', Status: 'Pending' },
];

const moduleRows = [
  { Title: 'Identity in Christ', Code: 'Y1-M01', Sequence: '1', Lessons: '8', Status: 'Active' },
  { Title: 'Bible Survey', Code: 'Y1-M02', Sequence: '2', Lessons: '10', Status: 'Active' },
  { Title: 'Spiritual Disciplines', Code: 'Y1-M03', Sequence: '3', Lessons: '6', Status: 'Active' },
  { Title: 'Old Testament Overview', Code: 'Y2-M01', Sequence: '4', Lessons: '12', Status: 'Active' },
  { Title: 'Christian Doctrine', Code: 'Y2-M02', Sequence: '5', Lessons: '10', Status: 'Active' },
];

const lessonRows = [
  { Lesson: '1. Who Am I in Christ?', Type: 'Video', Duration: '30 mins', Status: 'Published' },
  { Lesson: '2. Adopted into God’s Family', Type: 'Video', Duration: '26 mins', Status: 'Published' },
  { Lesson: '3. New Creation', Type: 'Bible Study', Duration: '25 mins', Status: 'Published' },
  { Lesson: '4. Authority & Privileges', Type: 'Reading', Duration: '20 mins', Status: 'Published' },
  { Lesson: '5. Living by Identity', Type: 'Assignment', Duration: '30 mins', Status: 'Published' },
  { Lesson: '6. Walk as a Child of God', Type: 'Video', Duration: '22 mins', Status: 'Draft' },
];

export const kcaLearningScreens: AdminScreen[] = [
  {
    id: 'H-01', batch: 'H', route: '/admin/kca/students', title: 'Students',
    subtitle: 'Manage all KCA students across cohorts and years.', kind: 'table',
    permission: 'kca.student.view', scope: 'assigned', nav: 'kca-students', action: '+ Add Student',
    metrics: [
      { label: 'Total Students', value: '1,268', trend: '+10%' },
      { label: 'Active', value: '1,032', trend: '+10%' },
      { label: 'On Track', value: '842', trend: '+8%' },
      { label: 'At Risk', value: '126', trend: '-14%' },
      { label: 'Completed', value: '110', trend: '+10%' },
    ],
    columns: ['Name', 'ID', 'Cohort', 'Year', 'Mentor', 'Status', 'Progress'], rows: studentRows,
  },
  {
    id: 'H-02', batch: 'H', route: '/admin/kca/students/samuel-david', title: 'Samuel David',
    subtitle: 'KCA-2024-0001', kind: 'detail', permission: 'kca.student.view', scope: 'assigned', nav: 'kca-students',
    tabs: ['Overview', 'Academics', 'Attendance', 'Assignments', 'Assessments', 'Mentor', 'Documents', 'Activity'],
    details: { 'Date of Birth': 'May 17, 2004', Gender: 'Male', Church: 'Lagos Mega Crusade', Location: 'Lagos, Nigeria', Cohort: '2024 Cohort A', 'Walk With Christ': '2022', 'KCA Joined': 'Apr 3, 2024', Mentor: 'Mary Okoro' },
    items: ['Overall Progress — 68%', 'Lessons — 68%', 'Assignments — 75%', 'Assessments — 70%', 'Mentor Reviews — 78%'],
  },
  {
    id: 'H-03', batch: 'H', route: '/admin/kca/cohorts', title: 'Cohorts',
    subtitle: 'View and manage KCA cohorts.', kind: 'table', permission: 'kca.cohort.view', scope: 'assigned', nav: 'kca-cohorts', action: '+ Create Cohort',
    items: ['2024 Cohort A — 312 students · Active', '2024 Cohort B — 286 students · Active', '2024 Cohort C — 198 students · Active', '2023 Cohort A — 245 students · Completed', '2023 Cohort B — 201 students · Completed', '2023 Cohort C — 156 students · Completed'],
    columns: ['Cohort Name', 'Year', 'Region', 'Students', 'Mentors', 'Status', 'Start Date'], rows: cohortRows,
  },
  {
    id: 'H-04', batch: 'H', route: '/admin/kca/years', title: 'KCA Years',
    subtitle: 'Configure and manage KCA academic years.', kind: 'operations', permission: 'kca.year.view', scope: 'assigned', nav: 'kca-years',
    columns: ['Year', 'Name', 'Duration', 'Status', 'Students'],
    rows: [
      { Year: 'Year 1', Name: 'Foundation', Duration: '12 Months', Status: 'Active', Students: '8' },
      { Year: 'Year 2', Name: 'Growth', Duration: '12 Months', Status: 'Active', Students: '812' },
      { Year: 'Year 3', Name: 'Ministry', Duration: '12 Months', Status: 'Active', Students: '658' },
      { Year: 'Year 4', Name: 'Leadership', Duration: '12 Months', Status: 'Upcoming', Students: '0' },
      { Year: 'Year 5', Name: 'Commissioning', Duration: '6 Months', Status: 'Upcoming', Students: '0' },
    ],
    items: ['Year 1 — 1,032 students', 'Year 2 — 812 students', 'Year 3 — 658 students', 'Year 4 — 0 students', 'Year 5 — 0 students'],
  },
  {
    id: 'H-05', batch: 'H', route: '/admin/kca/mentors', title: 'Mentors',
    subtitle: 'Manage mentors and their assignments.', kind: 'table', permission: 'kca.mentor.view', scope: 'assigned', nav: 'kca-mentors', action: '+ Add Mentor',
    columns: ['Mentor', 'Students', 'Status'], rows: mentorRows,
  },
  {
    id: 'H-06', batch: 'H', route: '/admin/kca/mentors/mary-okoro', title: 'Mary Okoro',
    subtitle: 'Mentor · Lagos, Nigeria', kind: 'detail', permission: 'kca.mentor.view', scope: 'assigned', nav: 'kca-mentors',
    tabs: ['Overview', 'Students (48)', 'Cohorts (2)', 'Reviews', 'Availability', 'Activity'],
    details: { About: 'Children’s Pastor with 8 years experience in discipleship and mentoring.', Expertise: 'Discipleship, Bible Study, Leadership, Mentoring', 'Average Review Score': '4.7 / 5', Reviewed: '106', 'Review Completion': '92%', Overdue: '36' },
    items: ['On Track — 32 students', 'At Risk — 10 students', 'Completed — 6 students'],
  },
  {
    id: 'H-07', batch: 'H', route: '/admin/kca/lecturers', title: 'Lecturers',
    subtitle: 'Manage lecturers and their subjects.', kind: 'table', permission: 'kca.lecturer.view', scope: 'assigned', nav: 'kca-lecturers', action: '+ Add Lecturer',
    columns: ['Lecturer', 'Modules', 'Status'], rows: lecturerRows,
  },
  {
    id: 'H-08', batch: 'H', route: '/admin/kca/lecturers/dr-john-samuel', title: 'Dr. John Samuel',
    subtitle: 'Senior Lecturer', kind: 'detail', permission: 'kca.lecturer.view', scope: 'assigned', nav: 'kca-lecturers',
    tabs: ['Overview', 'Modules (5)', 'Students', 'Schedules', 'Documents'],
    details: { Specialization: 'Systematic Theology', Qualifications: 'PhD Theology', Experience: '15 years', Church: 'The Covenant Place', Location: 'Lagos, Nigeria' },
    items: ['Modules — 5', 'Classes This Month — 18', 'Students — 246', 'Rating — 5 stars'],
  },
  {
    id: 'H-09', batch: 'H', route: '/admin/kca/modules', title: 'Modules',
    subtitle: 'Manage all learning modules.', kind: 'table', permission: 'kca.module.view', scope: 'assigned', nav: 'kca-modules', action: '+ Create Module',
    columns: ['Title', 'Code', 'Sequence', 'Lessons', 'Status'], rows: moduleRows,
  },
  {
    id: 'H-10', batch: 'H', route: '/admin/kca/modules/new', title: 'Module Builder',
    subtitle: 'Create and configure a new KCA module.', kind: 'wizard', permission: 'kca.module.create', scope: 'assigned', nav: 'kca-modules', action: 'Next: Content',
    tabs: ['Basic Info', 'Content', 'Prerequisites', 'Evidence', 'Review'],
    details: { title: 'Identity in Christ', code: 'Y1-M01', sequence: '1', is_active: 'Active', lecturer_person_id: 'Dr. John Samuel' },
  },
  {
    id: 'H-11', batch: 'H', route: '/admin/kca/modules/identity-in-christ/prerequisites', title: 'Prerequisite Builder',
    subtitle: 'Set prerequisites for this module.', kind: 'tree', permission: 'kca.module.update', scope: 'assigned', nav: 'kca-modules', action: '+ Add Prerequisite',
    items: ['Bible Survey (Year 1) — Completed', 'Spiritual Disciplines (Year 1) — In Progress', 'Walk With Christ — Completed', 'Basic Bible Knowledge — Completed', 'Church Membership — Active'],
  },
  {
    id: 'H-12', batch: 'H', route: '/admin/kca/lessons', title: 'Lessons',
    subtitle: 'Manage lessons in this module.', kind: 'table', permission: 'kca.lesson.view', scope: 'assigned', nav: 'kca-learning', action: '+ Add Lesson',
    details: { Module: 'Identity in Christ (Year 1)' },
    columns: ['Lesson', 'Type', 'Duration', 'Status'], rows: lessonRows,
  },
  {
    id: 'H-13', batch: 'H', route: '/admin/kca/attendance', title: 'Attendance',
    subtitle: 'Track student attendance.', kind: 'operations', permission: 'kca.attendance.view', scope: 'assigned', nav: 'kca-learning', action: 'Export',
    metrics: [{ label: 'Classes', value: '24' }, { label: 'Present', value: '1,842', trend: '82%' }, { label: 'Absent', value: '298', trend: '14%' }, { label: 'Late', value: '56', trend: '4%' }],
    items: ['Samuel David — 92%', 'Grace Ese — 88%', 'Daniel Johnson — 75%', 'Precious Adediji — 60%'],
  },
  {
    id: 'H-14', batch: 'H', route: '/admin/kca/assignments', title: 'Assignments',
    subtitle: 'Manage module assignments.', kind: 'table', permission: 'kca.assignment.view', scope: 'assigned', nav: 'kca-learning', action: '+ Add Assignment',
    details: { Module: 'Identity in Christ' },
    columns: ['Assignment', 'Type', 'Due Date', 'Submissions'],
    rows: [
      { Assignment: 'Identity Reflection Essay', Type: 'Written', 'Due Date': 'May 25, 2024', Submissions: '210/246' },
      { Assignment: 'Memory Verse Challenge', Type: 'Evidence', 'Due Date': 'May 28, 2024', Submissions: '230/246' },
      { Assignment: 'Practical Application', Type: 'Written', 'Due Date': 'Jun 1, 2024', Submissions: '200/246' },
      { Assignment: 'Group Discussion', Type: 'Evidence', 'Due Date': 'Jun 5, 2024', Submissions: '190/246' },
    ],
  },
  {
    id: 'H-15', batch: 'H', route: '/admin/kca/evidence-reviews', title: 'Evidence Reviews',
    subtitle: 'Review students’ practical submissions.', kind: 'table', permission: 'kca.evidence.review', scope: 'assigned', nav: 'kca-assessments',
    metrics: [{ label: 'Pending', value: '54' }, { label: 'In Review', value: '28' }, { label: 'Approved', value: '186' }, { label: 'Needs Revision', value: '32' }],
    columns: ['Student', 'Assignment', 'Submitted', 'Status', 'Reviewer'],
    rows: [
      { Student: 'Samuel David', Assignment: 'Identity Reflection Essay', Submitted: 'May 18, 2024', Status: 'Pending', Reviewer: 'Mary Okoro' },
      { Student: 'Grace Ese', Assignment: 'Memory Verse Challenge', Submitted: 'May 18, 2024', Status: 'In Review', Reviewer: 'Mary Okoro' },
      { Student: 'Daniel Johnson', Assignment: 'Practical Application', Submitted: 'May 14, 2024', Status: 'Approved', Reviewer: 'Pastor Tunde' },
      { Student: 'Precious Adediji', Assignment: 'Group Discussion', Submitted: 'May 17, 2024', Status: 'Needs Revision', Reviewer: 'Sister Grace' },
    ],
  },
  {
    id: 'H-16', batch: 'H', route: '/admin/kca/interventions', title: 'Intervention Queue',
    subtitle: 'Students needing attention and support.', kind: 'table', permission: 'kca.intervention.view', scope: 'assigned', nav: 'kca-assessments',
    metrics: [{ label: 'High Priority', value: '18' }, { label: 'Medium Priority', value: '26' }, { label: 'Low Priority', value: '14' }],
    columns: ['Student', 'Reason', 'Last Activity', 'Priority'],
    rows: [
      { Student: 'Daniel Johnson', Reason: 'Low Assignment Score', 'Last Activity': 'May 16, 2024', Priority: 'High' },
      { Student: 'Precious Adediji', Reason: 'Low Attendance', 'Last Activity': 'May 14, 2024', Priority: 'High' },
      { Student: 'Joshua Peter', Reason: 'Missed Deadline', 'Last Activity': 'May 13, 2024', Priority: 'Medium' },
      { Student: 'Esther Daniels', Reason: 'Low Assessment Score', 'Last Activity': 'May 17, 2024', Priority: 'Medium' },
    ],
  },
  {
    id: 'H-17', batch: 'H', route: '/admin/kca/assessments/final', title: 'Final Assessment',
    subtitle: 'Manage final assessments.', kind: 'table', permission: 'kca.assessment.view', scope: 'assigned', nav: 'kca-assessments', action: '+ Create Assessment',
    details: { Module: 'Identity in Christ' },
    columns: ['Assessment', 'Type', 'Date', 'Submissions', 'Status'],
    rows: [
      { Assessment: 'Final Exam', Type: 'Quiz', Date: 'Jun 10, 2024', Submissions: '230/246', Status: 'Completed' },
      { Assessment: 'Capstone Project', Type: 'Project', Date: 'Jun 12, 2024', Submissions: '210/246', Status: 'In Progress' },
      { Assessment: 'Oral Interview', Type: 'Interview', Date: 'Jun 14, 2024', Submissions: '198/246', Status: 'Scheduled' },
    ],
  },
  {
    id: 'H-18', batch: 'H', route: '/admin/kca/certificates', title: 'Certification Queue',
    subtitle: 'Review and approve certificates.', kind: 'table', permission: 'kca.certificate.view', scope: 'assigned', nav: 'kca-certification',
    metrics: [{ label: 'Eligible', value: '42' }, { label: 'Under Review', value: '18' }, { label: 'Approved', value: '156' }, { label: 'Re-issued', value: '8' }],
    columns: ['Student', 'Certificate', 'Status', 'Issued'],
    rows: [
      { Student: 'Samuel David', Certificate: 'Year 1 Certificate', Status: 'Ready', Issued: 'May 18, 2024' },
      { Student: 'Grace Ese', Certificate: 'Year 1 Certificate', Status: 'Under Review', Issued: 'May 18, 2024' },
      { Student: 'Daniel Johnson', Certificate: 'Year 1 Certificate', Status: 'Approved', Issued: 'May 17, 2024' },
      { Student: 'Faith Abiola', Certificate: 'Year 3 Certificate', Status: 'Ready', Issued: 'May 16, 2024' },
    ],
  },
  {
    id: 'H-19', batch: 'H', route: '/admin/kca/certificates/kca-cert-0000-0001', title: 'Certificate Detail',
    subtitle: 'Certificate of Completion', kind: 'detail', permission: 'kca.certificate.view', scope: 'assigned', nav: 'kca-certification', action: 'Download PDF',
    details: { 'Certificate ID': 'KCA-CERT-0000-0001', Student: 'Samuel David', Year: 'Year 1 Foundation', Cohort: '2024 Cohort A', 'Issue Date': 'May 18, 2024', Status: 'Approved' },
    items: ['Kingdom Citizens Academy', 'Certificate of Completion', 'Awarded to Samuel David', 'YEAR 1 FOUNDATION', 'Issued May 18, 2024'],
  },
  {
    id: 'H-20', batch: 'H', route: '/admin/kca/alumni', title: 'Alumni',
    subtitle: 'Manage alumni network.', kind: 'table', permission: 'kca.alumni.view', scope: 'assigned', nav: 'kca-alumni', action: '+ Add Alumni',
    metrics: [{ label: 'Total Alumni', value: '186' }, { label: 'Active in Network', value: '142' }, { label: 'Serving in Ministry', value: '96' }, { label: 'Mentors', value: '38' }],
    columns: ['Alumni', 'Year Completed', 'Current Role', 'Location'],
    rows: [
      { Alumni: 'John Emmanuel', 'Year Completed': '2023', 'Current Role': 'Ministry Leader', Location: 'Lagos' },
      { Alumni: 'Esther James', 'Year Completed': '2023', 'Current Role': 'Youth Pastor', Location: 'Abuja' },
      { Alumni: 'Michael Osono', 'Year Completed': '2022', 'Current Role': 'Church Planter', Location: 'Port Harcourt' },
      { Alumni: 'Grace Daniel', 'Year Completed': '2023', 'Current Role': 'Missionary', Location: 'Jos' },
    ],
  },
];
