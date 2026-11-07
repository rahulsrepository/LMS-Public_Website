export const INSTITUTE = {
  name: 'C2C Academy',
  short: 'C2C',
  tagline: 'Campus to Corporate',
  ribbon: 'Campus to Corporate',
  phone: '+91 63603 30277',
  phoneHref: 'tel:+916360330277',
  whatsapp: 'https://wa.me/916360330277',
  email: 'info@c2cacademy.in',
  address: 'Bidar',
  mapHref: 'https://www.google.com/maps/search/?api=1&query=Bidar',
  established: '',
  hours: 'Mon–Sat, 8:00 AM – 7:30 PM',
}

export function contactLinks({ phone, email, address } = {}) {
  const shownPhone = phone || INSTITUTE.phone
  const shownEmail = email || INSTITUTE.email
  const shownAddress = address || INSTITUTE.address
  const digits = String(shownPhone).replace(/\D/g, '')
  const intl = digits.length === 10 ? `91${digits}` : digits
  return {
    phone: shownPhone,
    tel: intl ? `tel:+${intl}` : INSTITUTE.phoneHref,
    email: shownEmail,
    mail: `mailto:${shownEmail}`,
    address: shownAddress,
    map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shownAddress)}`,
    whatsapp: intl ? `https://wa.me/${intl}` : INSTITUTE.whatsapp,
  }
}

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/courses', label: 'Courses' },
  { to: '/why', label: 'Why Choose Us' },
  { to: '/placements', label: 'Placements' },
  { to: '/workshops', label: 'Workshops' },
  { to: '/careers', label: 'Careers' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact Us' },
]

export const COURSES = [
  {
    slug: 'java-full-stack',
    name: 'Java Full Stack',
    duration: '6 months',
    months: 6,
    fee: 48000,
    level: 'Beginner to job-ready',
    mode: 'Classroom + lab',
    accent: 'Java',
    summary: 'Core Java, Spring Boot, REST APIs, SQL and a modern frontend so you can ship complete applications.',
    outcomes: ['Build REST APIs with Spring Boot', 'Design relational schemas', 'Create a responsive web client', 'Present a capstone project'],
    modules: ['Java & OOP', 'Collections and JDBC', 'Spring Boot', 'SQL', 'HTML, CSS & JavaScript', 'Capstone'],
  },
  {
    slug: 'python',
    name: 'Python Programming',
    duration: '4 months',
    months: 4,
    fee: 32000,
    level: 'Beginner',
    mode: 'Classroom + lab',
    accent: 'Py',
    summary: 'Python from fundamentals through automation, APIs and a practical data workflow.',
    outcomes: ['Write clean Python', 'Automate everyday tasks', 'Work with APIs and files', 'Understand testing basics'],
    modules: ['Syntax & data types', 'Functions & OOP', 'Files & APIs', 'Testing', 'Mini projects'],
  },
  {
    slug: 'mern-stack',
    name: 'MERN Stack',
    duration: '5 months',
    months: 5,
    fee: 45000,
    level: 'Intermediate',
    mode: 'Classroom + lab',
    accent: 'MERN',
    summary: 'MongoDB, Express, React and Node — the stack product teams use for modern web apps.',
    outcomes: ['Build React interfaces', 'Design REST services', 'Model data in MongoDB', 'Deploy a full-stack app'],
    modules: ['JavaScript deep dive', 'React', 'Node & Express', 'MongoDB', 'Auth & deployment'],
  },
  {
    slug: 'frontend',
    name: 'Frontend Development',
    duration: '3 months',
    months: 3,
    fee: 28000,
    level: 'Beginner',
    mode: 'Classroom',
    accent: 'UI',
    summary: 'Semantic HTML, modern CSS, JavaScript and React with an eye for accessible interfaces.',
    outcomes: ['Build responsive pages', 'Use React components', 'Ship a portfolio', 'Follow accessibility basics'],
    modules: ['HTML', 'CSS & layout', 'JavaScript', 'React', 'Portfolio project'],
  },
  {
    slug: 'backend',
    name: 'Backend Development',
    duration: '4 months',
    months: 4,
    fee: 36000,
    level: 'Intermediate',
    mode: 'Classroom + lab',
    accent: 'API',
    summary: 'APIs, authentication, databases and the habits that keep production services reliable.',
    outcomes: ['Design REST APIs', 'Secure endpoints', 'Model data', 'Write service tests'],
    modules: ['HTTP & REST', 'Node services', 'SQL', 'Auth', 'Testing & logging'],
  },
  {
    slug: 'sql',
    name: 'SQL & Databases',
    duration: '2 months',
    months: 2,
    fee: 18000,
    level: 'Beginner',
    mode: 'Lab',
    accent: 'SQL',
    summary: 'Queries, joins, indexing and reporting skills that every IT role depends on.',
    outcomes: ['Write multi-table queries', 'Understand indexes', 'Build reports', 'Read a schema'],
    modules: ['Select & filters', 'Joins', 'Aggregation', 'Indexes', 'Reporting'],
  },
  {
    slug: 'data-analytics',
    name: 'Data Analytics',
    duration: '4 months',
    months: 4,
    fee: 40000,
    level: 'Beginner',
    mode: 'Classroom + lab',
    accent: 'Data',
    summary: 'Spreadsheets, SQL, Python and dashboards for people who want to work with data.',
    outcomes: ['Clean datasets', 'Query with SQL', 'Build dashboards', 'Explain a finding'],
    modules: ['Spreadsheets', 'Statistics basics', 'SQL', 'Python for data', 'Dashboards'],
  },
  {
    slug: 'software-testing',
    name: 'Software Testing',
    duration: '3 months',
    months: 3,
    fee: 30000,
    level: 'Beginner',
    mode: 'Classroom + lab',
    accent: 'QA',
    summary: 'Manual testing, bug reporting, API checks and an introduction to automation.',
    outcomes: ['Write test cases', 'Log clear defects', 'Test APIs', 'Automate a basic flow'],
    modules: ['SDLC & STLC', 'Test design', 'Defects', 'API testing', 'Selenium intro'],
  },
  {
    slug: 'cloud-computing',
    name: 'Cloud Computing',
    duration: '3 months',
    months: 3,
    fee: 38000,
    level: 'Intermediate',
    mode: 'Lab',
    accent: 'AWS',
    summary: 'Cloud foundations, core AWS services and the deployment workflow junior engineers need.',
    outcomes: ['Explain core cloud services', 'Deploy a simple app', 'Understand IAM basics', 'Read a cloud bill'],
    modules: ['Cloud basics', 'Compute & storage', 'IAM', 'Deployment', 'Monitoring'],
  },
  {
    slug: 'cyber-security',
    name: 'Cyber Security',
    duration: '4 months',
    months: 4,
    fee: 42000,
    level: 'Intermediate',
    mode: 'Classroom + lab',
    accent: 'Sec',
    summary: 'Security fundamentals, safe system practices and how teams respond to common risks.',
    outcomes: ['Recognise common threats', 'Apply safe configuration', 'Read security alerts', 'Follow a response checklist'],
    modules: ['Security principles', 'Network basics', 'Identity', 'Application risks', 'Response basics'],
  },
  {
    slug: 'dsa',
    name: 'Data Structures & Algorithms',
    duration: '3 months',
    months: 3,
    fee: 25000,
    level: 'Intermediate',
    mode: 'Classroom',
    accent: 'DSA',
    summary: 'Problem solving for interviews — arrays, trees, graphs and the patterns behind them.',
    outcomes: ['Solve timed problems', 'Explain complexity', 'Use core data structures', 'Practice mock interviews'],
    modules: ['Complexity', 'Arrays & strings', 'Trees', 'Graphs', 'Interview drills'],
  },
]

export const WHY_POINTS = [
  { title: 'Experienced faculty', text: 'Trainers who teach the same tools students will use in their first role, with lab time in every module.' },
  { title: 'Practical training', text: 'Classroom theory is paired with guided labs, code reviews and assignments that mirror real tickets.' },
  { title: 'Real-time projects', text: 'Each flagship course ends with a project you can explain in an interview, not a copied sample.' },
  { title: 'Mock interviews', text: 'Technical rounds, HR questions and feedback so the first real interview is not the first practice.' },
  { title: 'Resume building', text: 'A resume, project write-up and LinkedIn checklist reviewed before you start applying.' },
  { title: 'Placement assistance', text: 'Role mapping, company-specific practice and coordination with hiring partners after you are interview-ready.' },
]

export const TESTIMONIALS = [
  { name: 'Ayesha', role: 'Java developer', quote: 'The labs were stricter than the theory. I could walk through my Spring Boot project without reading from a script.' },
  { name: 'Rahul S.', role: 'MERN trainee', quote: 'Faculty stayed back for doubt-clearing. The mock interviews showed me exactly where my explanations were weak.' },
  { name: 'Sneha', role: 'Software tester', quote: 'I joined with no IT background. Test cases, bug reports and the practice project made my resume specific.' },
]

export const PARTNERS = ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini', 'HCL', 'Tech Mahindra']

export const WORKSHOPS = [
  { id: 'ws-java', title: 'Java Weekend Sprint', date: '15 Nov 2026', mode: 'Campus', seats: 40, blurb: 'A hands-on day on OOP, collections and a mini console project.' },
  { id: 'ws-hack', title: 'C2C Code Hackathon', date: '6 Dec 2026', mode: 'Team event', seats: 80, blurb: 'Teams of three build a small web tool and present it to faculty.' },
  { id: 'ws-sql', title: 'SQL for Interviews', date: '22 Nov 2026', mode: 'Lab', seats: 30, blurb: 'Joins, grouping and the query patterns that show up in hiring tests.' },
]

export const JOBS = [
  { id: 'job-trainer', title: 'Java Trainer', type: 'Full-time', place: 'Campus', blurb: 'Take batches, review labs and mentor capstone projects.' },
  { id: 'job-intern', title: 'Training Intern', type: 'Internship', place: 'Campus', blurb: 'Support labs, attendance and study material for frontend and SQL batches.' },
  { id: 'job-counsel', title: 'Admissions Counsellor', type: 'Full-time', place: 'Campus', blurb: 'Guide enquiries, explain courses honestly and follow up until a decision.' },
]

export const FAQS = [
  { q: 'Who can join?', a: 'Students, fresh graduates and career switchers. Most courses start from the basics and move into project work. A short counselling call helps us suggest the right batch.' },
  { q: 'Do you offer placement support?', a: 'Yes. Interview-ready students get mock interviews, resume review and placement assistance with hiring partners. Placement depends on performance, attendance and the role you are preparing for.' },
  { q: 'Are the courses classroom or online?', a: 'C2C Academy is built around classroom and lab training. Practice material is also shared on the student portal after you enroll.' },
  { q: 'How do fees and installments work?', a: 'Each course has a published fee. After admission, the accounts desk can record installments, UPI, cash and bank transfers, and issue a receipt.' },
  { q: 'What does Campus to Corporate mean?', a: 'You learn the tools used on the job, finish a project you can explain, and then practise interviews, resumes and applications with the placement desk.' },
  { q: 'How do I visit or enroll?', a: 'Call +91 63603 30277, use Enroll Now, or walk in during working hours. A counsellor will confirm the course, batch timing and documents.' },
]

export const TECH_CHIPS = [
  { label: 'Java', className: 'top-6 left-2 bg-orange-50 text-orange-700' },
  { label: 'Python', className: 'top-24 -left-2 bg-sky-50 text-sky-700' },
  { label: 'React', className: 'bottom-16 left-4 bg-cyan-50 text-cyan-700' },
  { label: 'HTML', className: 'top-2 right-4 bg-rose-50 text-rose-700' },
  { label: 'CSS', className: 'top-28 -right-1 bg-indigo-50 text-indigo-700' },
  { label: 'JS', className: 'bottom-28 right-0 bg-amber-50 text-amber-700' },
  { label: 'SQL', className: 'bottom-4 left-24 bg-emerald-50 text-emerald-800' },
  { label: 'AWS', className: 'bottom-6 right-16 bg-yellow-50 text-yellow-800' },
]
