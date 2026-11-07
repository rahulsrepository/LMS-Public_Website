import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AccessDenied } from './components/ui'
import { hasAnyPermission } from './lib/permissions'
import { useLms } from './lib/store'
import { StaffLoginPage, StudentLoginPage } from './pages/auth/Login'
import { AttendancePage, BatchesPage, CoursesPage, MaterialsPage, SubjectsPage } from './pages/app/Academic'
import { AdmissionsPage, EnquiriesPage, FollowUpsPage, SessionsPage } from './pages/app/Crm'
import Dashboard from './pages/app/Dashboard'
import { AssignmentDesk, ExamDesk, PerformancePage, ResultsPage, SubmissionsPage } from './pages/app/Exams'
import { DownloadsPage, FeesPage, ReportsPage } from './pages/app/Fees'
import { FacultyPage, RegisterPage, StaffPage, StudentsPage } from './pages/app/People'
import { ApprovalsDesk, CareersDesk, CashDesk, FacultyAttendancePage, InventoryDesk, ProfilePage, ReferralDesk, TicketsDesk, WorkshopsDesk } from './pages/app/Desk'
import { LogsPage, NotificationsPage, SettingsPage } from './pages/app/System'
import AboutPage from './pages/public/About'
import CourseDetailPage from './pages/public/CourseDetail'
import CoursesPagePublic from './pages/public/Courses'
import HomePage from './pages/public/Home'
import { CareersPage, ContactPage, EnrollPage, FaqPage, PlacementsPage, WhyPage, WorkshopsPage } from './pages/public/SimplePages'
import { StudentAssignments, StudentAttendance, StudentExams, StudentFees, StudentHome, StudentMaterials, StudentNotes } from './pages/learn/StudentPortal'

function StaffShell() {
  const { session } = useLms()
  if (!session) return <Navigate to="/login/staff" replace />
  if (session.role === 'student') return <Navigate to="/learn" replace />
  return <AppShell><Outlet /></AppShell>
}

function StudentShell() {
  const { session } = useLms()
  if (!session) return <Navigate to="/login/student" replace />
  if (session.role !== 'student') return <Navigate to="/app" replace />
  return <AppShell student><Outlet /></AppShell>
}

function StaffArea() {
  return (
    <Routes>
      <Route element={<StaffShell />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Allow anyOf={['students.view']}><StudentsPage /></Allow>} />
        <Route path="my-students" element={<Allow anyOf={['students.assigned']}><StudentsPage /></Allow>} />
        <Route path="register" element={<Allow anyOf={['students.write', 'students.register']}><RegisterPage /></Allow>} />
        <Route path="faculty" element={<Allow anyOf={['faculty.manage']}><FacultyPage /></Allow>} />
        <Route path="receptionists" element={<Allow anyOf={['staff.manage']}><StaffPage role="receptionist" title="Receptionist management" /></Allow>} />
        <Route path="counsellors" element={<Allow anyOf={['staff.manage']}><StaffPage role="counsellor" title="Counsellor management" /></Allow>} />
        <Route path="accountants" element={<Allow anyOf={['staff.manage']}><StaffPage role="accountant" title="Accountant management" /></Allow>} />
        <Route path="courses" element={<Allow anyOf={['courses.manage', 'courses.view']}><CoursesPage /></Allow>} />
        <Route path="subjects" element={<Allow anyOf={['subjects.manage', 'subjects.view']}><SubjectsPage /></Allow>} />
        <Route path="my-subjects" element={<Allow anyOf={['subjects.assigned']}><SubjectsPage mine /></Allow>} />
        <Route path="batches" element={<Allow anyOf={['batches.manage', 'batches.view']}><BatchesPage /></Allow>} />
        <Route path="my-batches" element={<Allow anyOf={['batches.assigned']}><BatchesPage mine /></Allow>} />
        <Route path="attendance" element={<Allow anyOf={['attendance.view', 'attendance.mark']}><AttendancePage /></Allow>} />
        <Route path="faculty-attendance" element={<Allow anyOf={['attendance.faculty', 'attendance.view']}><FacultyAttendancePage /></Allow>} />
        <Route path="materials" element={<Allow anyOf={['materials.manage']}><MaterialsPage /></Allow>} />
        <Route path="mcq" element={<Allow anyOf={['exams.manage']}><ExamDesk mode="mcq" /></Allow>} />
        <Route path="coding" element={<Allow anyOf={['exams.manage']}><ExamDesk mode="coding" /></Allow>} />
        <Route path="exams" element={<Allow anyOf={['exams.manage']}><ExamDesk mode="all" /></Allow>} />
        <Route path="assignments" element={<Allow anyOf={['assignments.manage']}><AssignmentDesk /></Allow>} />
        <Route path="submissions" element={<Allow anyOf={['assignments.manage']}><SubmissionsPage /></Allow>} />
        <Route path="results" element={<Allow anyOf={['results.manage']}><ResultsPage /></Allow>} />
        <Route path="performance" element={<Allow anyOf={['reports.academic']}><PerformancePage /></Allow>} />
        <Route path="enquiries" element={<Allow anyOf={['enquiries.full', 'enquiries.limited']}><EnquiriesPage /></Allow>} />
        <Route path="enquiries/new" element={<Allow anyOf={['enquiries.full', 'enquiries.limited']}><EnquiriesPage createOnly /></Allow>} />
        <Route path="follow-ups" element={<Allow anyOf={['enquiries.full']}><FollowUpsPage /></Allow>} />
        <Route path="sessions" element={<Allow anyOf={['enquiries.full']}><SessionsPage /></Allow>} />
        <Route path="admissions" element={<Allow anyOf={['admissions.manage', 'admissions.assist', 'admissions.view']}><AdmissionsPage /></Allow>} />
        <Route path="fees" element={<Allow anyOf={['fees.manage', 'fees.view']}><FeesPage /></Allow>} />
        <Route path="cash" element={<Allow anyOf={['fees.cash', 'fees.manage']}><CashDesk /></Allow>} />
        <Route path="refunds" element={<Allow anyOf={['fees.manage', 'fees.request']}><ApprovalsDesk kind="refund" /></Allow>} />
        <Route path="discounts" element={<Allow anyOf={['fees.manage', 'fees.request']}><ApprovalsDesk kind="discount" /></Allow>} />
        <Route path="referrals" element={<Allow anyOf={['fees.manage', 'fees.request']}><ReferralDesk /></Allow>} />
        <Route path="workshops" element={<Allow anyOf={['workshops.manage']}><WorkshopsDesk /></Allow>} />
        <Route path="careers" element={<Allow anyOf={['careers.manage']}><CareersDesk /></Allow>} />
        <Route path="inventory" element={<Allow anyOf={['inventory.manage']}><InventoryDesk /></Allow>} />
        <Route path="tickets" element={<Allow anyOf={['tickets.manage']}><TicketsDesk /></Allow>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="collections" element={<Allow anyOf={['fees.manage']}><FeesPage focus="collect" /></Allow>} />
        <Route path="verification" element={<Allow anyOf={['fees.manage']}><FeesPage focus="verify" /></Allow>} />
        <Route path="transactions" element={<Allow anyOf={['fees.manage']}><FeesPage focus="transactions" /></Allow>} />
        <Route path="pending-fees" element={<Allow anyOf={['fees.manage']}><FeesPage focus="pending" /></Allow>} />
        <Route path="receipts" element={<Allow anyOf={['fees.manage']}><FeesPage focus="receipts" /></Allow>} />
        <Route path="reports" element={<Allow anyOf={['reports.institute', 'reports.finance', 'reports.enquiry', 'reports.academic']}><ReportsPage /></Allow>} />
        <Route path="downloads" element={<Allow anyOf={['reports.finance']}><DownloadsPage /></Allow>} />
        <Route path="notifications" element={<Allow anyOf={['notifications', 'notifications.manage']}><NotificationsPage /></Allow>} />
        <Route path="logs" element={<Allow anyOf={['logs']}><LogsPage /></Allow>} />
        <Route path="settings" element={<Allow anyOf={['settings']}><SettingsPage /></Allow>} />
        <Route path="*" element={<AccessDenied />} />
      </Route>
    </Routes>
  )
}

function StudentArea() {
  return (
    <Routes>
      <Route element={<StudentShell />}>
        <Route index element={<StudentHome />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="notifications" element={<StudentNotes />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<AccessDenied />} />
      </Route>
    </Routes>
  )
}

function Allow({ anyOf, children }) {
  const { session } = useLms()
  if (!hasAnyPermission(session?.role, anyOf)) return <AccessDenied />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/courses" element={<CoursesPagePublic />} />
      <Route path="/courses/:slug" element={<CourseDetailPage />} />
      <Route path="/why" element={<WhyPage />} />
      <Route path="/placements" element={<PlacementsPage />} />
      <Route path="/workshops" element={<WorkshopsPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/enroll" element={<EnrollPage />} />
      <Route path="/login/staff" element={<StaffLoginPage />} />
      <Route path="/login/student" element={<StudentLoginPage />} />
      <Route path="/forgot-password" element={<Navigate to="/login/staff" replace />} />
      <Route path="/app/*" element={<StaffArea />} />
      <Route path="/learn/*" element={<StudentArea />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
