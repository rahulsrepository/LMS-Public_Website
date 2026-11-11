import { COURSES, INSTITUTE, JOBS, WORKSHOPS } from './catalog'

const DATA_VERSION = 3

export function createSeed() {
  const courses = COURSES.map((course) => ({
    id: `course-${course.slug}`,
    ...course,
  }))

  const subjects = [
    { id: 'sub-java', courseId: 'course-java-full-stack', name: 'Core Java', code: 'JAV101' },
    { id: 'sub-spring', courseId: 'course-java-full-stack', name: 'Spring Boot', code: 'JAV204' },
    { id: 'sub-react', courseId: 'course-mern-stack', name: 'React', code: 'MER201' },
    { id: 'sub-node', courseId: 'course-mern-stack', name: 'Node & Express', code: 'MER220' },
    { id: 'sub-python', courseId: 'course-python', name: 'Python Programming', code: 'PY101' },
    { id: 'sub-analytics', courseId: 'course-data-analytics', name: 'Analytics Lab', code: 'DA210' },
    { id: 'sub-sql', courseId: 'course-sql', name: 'SQL & Reporting', code: 'SQL110' },
    { id: 'sub-fe', courseId: 'course-frontend', name: 'Frontend Studio', code: 'FE130' },
    { id: 'sub-test', courseId: 'course-software-testing', name: 'Software Testing', code: 'QA150' },
    { id: 'sub-cloud', courseId: 'course-cloud-computing', name: 'Cloud Foundations', code: 'CLD180' },
    { id: 'sub-dsa', courseId: 'course-dsa', name: 'DSA Practice', code: 'DSA160' },
  ]

  return {
    version: DATA_VERSION,
    profiles: [],
    faculty: [],
    receptionists: [],
    counsellors: [],
    accountants: [],
    students: [],
    courses,
    subjects,
    batches: [],
    materials: [],
    enquiries: [],
    admissions: [],
    attendance: [],
    exams: [],
    attempts: [],
    assignments: [],
    submissions: [],
    feeRecords: [],
    payments: [],
    notifications: [],
    notificationReads: {},
    sessions: [],
    logs: [],
    facultyAttendance: [],
    workshops: WORKSHOPS.map((item) => ({ ...item, status: 'open' })),
    jobs: JOBS.map((item) => ({ ...item, open: true })),
    inventory: [],
    tickets: [],
    cashNotes: [],
    referrals: [],
    settings: {
      name: INSTITUTE.name,
      phone: INSTITUTE.phone,
      email: INSTITUTE.email,
      address: INSTITUTE.address,
      whatsapp: INSTITUTE.whatsapp,
      established: INSTITUTE.established,
      hours: INSTITUTE.hours,
    },
  }
}

export const DATA_KEY = 'c2c-lms-v1'
export { DATA_VERSION }
