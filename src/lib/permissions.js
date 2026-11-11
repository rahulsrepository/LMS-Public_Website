import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserPlus,
  Briefcase,
  BookOpen,
  Library,
  Layers,
  CalendarCheck,
  FileQuestion,
  Code,
  ClipboardList,
  FolderOpen,
  Inbox,
  MessagesSquare,
  Wallet,
  BadgeCheck,
  Receipt,
  BarChart3,
  Bell,
  ScrollText,
  Settings,
  Presentation,
  NotebookPen,
  LineChart,
  Download,
  UserRound,
  CircleDollarSign,
  Clock,
  Package,
  LifeBuoy,
  Banknote,
  BadgePercent,
  UserCog,
  Bookmark,
} from 'lucide-react'

/** Permission keys shared by the UI, the local data layer, and supabase/schema.sql */
export const ROLE_PERMISSIONS = {
  admin: ['*'],
  receptionist: [
    'dashboard',
    'students.write',
    'students.view',
    'students.status',
    'students.delete',
    'faculty.manage',
    'staff.manage',
    'courses.view',
    'batches.delete',
    'batches.view',
    'subjects.view',
    'attendance.view',
    'attendance.faculty',
    'enquiries.limited',
    'admissions.assist',
    'fees.view',
    'fees.request',
    'fees.cash',
    'workshops.manage',
    'inventory.manage',
    'tickets.manage',
    'notifications',
  ],
  faculty: [
    'dashboard',
    'jobs.view',
    'students.assigned',
    'subjects.assigned',
    'batches.assigned',
    'attendance.mark',
    'materials.manage',
    'exams.manage',
    'assignments.manage',
    'results.manage',
    'reports.academic',
    'notifications',
  ],
  counsellor: [
    'dashboard',
    'enquiries.full',
    'admissions.manage',
    'students.register',
    'courses.view',
    'subjects.view',
    'batches.delete',
    'batches.view',
    'fees.view',
    'reports.enquiry',
    'workshops.manage',
    'tickets.manage',
    'notifications',
  ],
  accountant: [
    'dashboard',
    'students.fees',
    'fees.manage',
    'fees.cash',
    'fees.request',
    'reports.finance',
    'admissions.view',
    'batches.view',
    'courses.view',
    'notifications',
  ],
  student: ['learn'],
}

export function hasPermission(role, permission) {
  if (!role || !permission) return false
  const owned = ROLE_PERMISSIONS[role] || []
  if (owned.includes('*')) return true
  if (owned.includes(permission)) return true
  return false
}

export function hasAnyPermission(role, permissions) {
  return permissions.some((permission) => hasPermission(role, permission))
}

export const NAV = {
  admin: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    {
      label: 'People',
      icon: Users,
      children: [
        { to: '/app/students', label: 'Students', icon: Users, permission: 'students.view' },
        { to: '/app/faculty', label: 'Faculty', icon: GraduationCap, permission: 'faculty.manage' },
        { to: '/app/admins', label: 'Admins', icon: UserCog, permission: 'staff.manage' },
        { to: '/app/receptionists', label: 'Receptionist', icon: UserPlus, permission: 'staff.manage' },
        { to: '/app/counsellors', label: 'Counsellor', icon: MessagesSquare, permission: 'staff.manage' },
        { to: '/app/accountants', label: 'Accountant', icon: Briefcase, permission: 'staff.manage' },
      ],
    },
    {
      label: 'Academic',
      icon: BookOpen,
      children: [
        { to: '/app/courses', label: 'Courses', icon: BookOpen, permission: 'courses.manage' },
        { to: '/app/subjects', label: 'Subjects', icon: Library, permission: 'subjects.manage' },
        { to: '/app/batches', label: 'Batches', icon: Layers, permission: 'batches.manage' },
        { to: '/app/attendance', label: 'Student Attendance', icon: CalendarCheck, permission: 'attendance.view' },
        { to: '/app/faculty-attendance', label: 'Staff Attendance', icon: CalendarCheck, permission: 'attendance.faculty' },
        { to: '/app/exams', label: 'Examinations', icon: FileQuestion, permission: 'exams.manage' },
      ],
    },
    {
      label: 'Finance',
      icon: Wallet,
      children: [
        { to: '/app/fees', label: 'Fee Records', icon: Receipt, permission: 'fees.manage' },
        { to: '/app/cash', label: 'Cash on Hand', icon: Banknote, permission: 'fees.cash' },
        { to: '/app/refunds', label: 'Refunds', icon: Wallet, permission: 'fees.manage' },
        { to: '/app/referrals', label: 'Referral wallet', icon: CircleDollarSign, permission: 'fees.manage' },
        { to: '/app/discounts', label: 'Discount approvals', icon: BadgePercent, permission: 'fees.manage' },
      ],
    },
    {
      label: 'Operations',
      icon: FolderOpen,
      children: [
        { to: '/app/enquiries', label: 'Enquiries', icon: Inbox, permission: 'enquiries.full' },
        { to: '/app/workshops', label: 'Workshops', icon: Presentation, permission: 'workshops.manage' },
        { to: '/app/jobs', label: 'Job postings', icon: Briefcase, permission: 'jobs.manage' },
        { to: '/app/inventory', label: 'Inventory', icon: Package, permission: 'inventory.manage' },
        { to: '/app/tickets', label: 'Support Tickets', icon: LifeBuoy, permission: 'tickets.manage' },
      ],
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      children: [
        { to: '/app/reports', label: 'Reports', icon: BarChart3, permission: 'reports.institute' },
        { to: '/app/logs', label: 'Audit Logs', icon: ScrollText, permission: 'logs' },
      ],
    },
    {
      label: 'Settings',
      icon: Settings,
      children: [
        { to: '/app/settings', label: 'Institute', icon: Settings, permission: 'settings' },
        { to: '/app/profile', label: 'Profile Settings', icon: UserCog },
      ],
    },
  ],
  receptionist: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    {
      label: 'People',
      icon: Users,
      children: [
        { to: '/app/students', label: 'Students', icon: Users, permission: 'students.view' },
        { to: '/app/faculty', label: 'Faculty', icon: GraduationCap, permission: 'faculty.manage' },
        { to: '/app/receptionists', label: 'Receptionist', icon: UserPlus, permission: 'staff.manage' },
        { to: '/app/counsellors', label: 'Counsellor', icon: MessagesSquare, permission: 'staff.manage' },
        { to: '/app/accountants', label: 'Accountant', icon: Briefcase, permission: 'staff.manage' },
      ],
    },
    { to: '/app/register', label: 'Student Registration', icon: UserPlus, permission: 'students.write' },
    {
      label: 'Academic',
      icon: BookOpen,
      children: [
        { to: '/app/courses', label: 'Courses', icon: BookOpen, permission: 'courses.view' },
        { to: '/app/subjects', label: 'Subjects', icon: Library, permission: 'subjects.view' },
        { to: '/app/batches', label: 'Batches', icon: Layers, permission: 'batches.view' },
        { to: '/app/attendance', label: 'Student Attendance', icon: CalendarCheck, permission: 'attendance.view' },
        { to: '/app/faculty-attendance', label: 'Staff Attendance', icon: CalendarCheck, permission: 'attendance.faculty' },
      ],
    },
    {
      label: 'Finance',
      icon: Wallet,
      children: [
        { to: '/app/fees', label: 'Fee Records', icon: Receipt, permission: 'fees.view' },
        { to: '/app/cash', label: 'Cash on Hand', icon: Banknote, permission: 'fees.cash' },
        { to: '/app/refunds', label: 'Refunds', icon: Wallet, permission: 'fees.request' },
        { to: '/app/referrals', label: 'Referral wallet', icon: CircleDollarSign, permission: 'fees.request' },
        { to: '/app/discounts', label: 'Discount approvals', icon: BadgePercent, permission: 'fees.request' },
      ],
    },
    {
      label: 'Operations',
      icon: FolderOpen,
      children: [
        { to: '/app/enquiries', label: 'Enquiries', icon: Inbox, permission: 'enquiries.limited' },
        { to: '/app/workshops', label: 'Workshops', icon: Presentation, permission: 'workshops.manage' },
        { to: '/app/inventory', label: 'Inventory', icon: Package, permission: 'inventory.manage' },
        { to: '/app/tickets', label: 'Support Tickets', icon: LifeBuoy, permission: 'tickets.manage' },
      ],
    },
    { to: '/app/profile', label: 'Profile Settings', icon: UserCog },
  ],
  faculty: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/jobs', label: 'Jobs', icon: Briefcase, permission: 'jobs.view' },
    { to: '/app/my-subjects', label: 'My Subjects', icon: Library, permission: 'subjects.assigned' },
    { to: '/app/my-batches', label: 'My Batches', icon: Layers, permission: 'batches.assigned' },
    { to: '/app/my-students', label: 'My Students', icon: Users, permission: 'students.assigned' },
    { to: '/app/attendance', label: 'Attendance', icon: CalendarCheck, permission: 'attendance.mark' },
    { to: '/app/materials', label: 'Study Materials', icon: Presentation, permission: 'materials.manage' },
    { to: '/app/mcq', label: 'MCQ Management', icon: FileQuestion, permission: 'exams.manage' },
    { to: '/app/coding', label: 'Coding Problems', icon: Code, permission: 'exams.manage' },
    { to: '/app/exams', label: 'Examinations', icon: NotebookPen, permission: 'exams.manage' },
    { to: '/app/assignments', label: 'Assignments', icon: ClipboardList, permission: 'assignments.manage' },
    { to: '/app/submissions', label: 'Student Submissions', icon: Inbox, permission: 'assignments.manage' },
    { to: '/app/results', label: 'Results', icon: BadgeCheck, permission: 'results.manage' },
    { to: '/app/performance', label: 'Performance Reports', icon: LineChart, permission: 'reports.academic' },
    { to: '/app/profile', label: 'Profile Settings', icon: UserCog },
  ],
  counsellor: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/enquiries', label: 'Enquiries', icon: Inbox, permission: 'enquiries.full' },
    { to: '/app/enquiries/new', label: 'Add New Enquiry', icon: UserPlus, permission: 'enquiries.full' },
    { to: '/app/follow-ups', label: 'Follow-ups', icon: Clock, permission: 'enquiries.full' },
    { to: '/app/sessions', label: 'Counselling Sessions', icon: MessagesSquare, permission: 'enquiries.full' },
    { to: '/app/admissions', label: 'Admissions', icon: BadgeCheck, permission: 'admissions.manage' },
    { to: '/app/register', label: 'Student Registration', icon: UserRound, permission: 'students.register' },
    {
      label: 'Academic',
      icon: BookOpen,
      children: [
        { to: '/app/courses', label: 'Courses', icon: BookOpen, permission: 'courses.view' },
        { to: '/app/subjects', label: 'Subjects', icon: Library, permission: 'subjects.view' },
        { to: '/app/batches', label: 'Batches', icon: Layers, permission: 'batches.view' },
      ],
    },
    {
      label: 'Operations',
      icon: FolderOpen,
      children: [
        { to: '/app/workshops', label: 'Workshops', icon: Presentation, permission: 'workshops.manage' },
        { to: '/app/tickets', label: 'Support Tickets', icon: LifeBuoy, permission: 'tickets.manage' },
      ],
    },
    { to: '/app/reports', label: 'Reports', icon: BarChart3, permission: 'reports.enquiry' },
    { to: '/app/profile', label: 'Profile Settings', icon: UserCog },
  ],
  accountant: [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/fees', label: 'Student Fee Management', icon: CircleDollarSign, permission: 'fees.manage' },
    { to: '/app/collections', label: 'Fee Collection', icon: Wallet, permission: 'fees.manage' },
    { to: '/app/verification', label: 'Payment Verification', icon: BadgeCheck, permission: 'fees.manage' },
    { to: '/app/transactions', label: 'UTR / Transaction Records', icon: Receipt, permission: 'fees.manage' },
    { to: '/app/pending-fees', label: 'Pending Fees', icon: Clock, permission: 'fees.manage' },
    { to: '/app/receipts', label: 'Payment Receipts', icon: FileQuestion, permission: 'fees.manage' },
    { to: '/app/reports', label: 'Financial Reports', icon: BarChart3, permission: 'reports.finance' },
    { to: '/app/downloads', label: 'Excel / PDF Downloads', icon: Download, permission: 'reports.finance' },
    { to: '/app/cash', label: 'Cash on Hand', icon: Banknote, permission: 'fees.cash' },
    { to: '/app/refunds', label: 'Refunds', icon: Wallet, permission: 'fees.request' },
    { to: '/app/referrals', label: 'Referral wallet', icon: CircleDollarSign, permission: 'fees.request' },
    { to: '/app/discounts', label: 'Discount approvals', icon: BadgePercent, permission: 'fees.request' },
    { to: '/app/profile', label: 'Profile Settings', icon: UserCog },
  ],
}

export const STUDENT_NAV = [
  { to: '/learn', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/learn/courses', label: 'Courses', icon: BookOpen },
  { to: '/learn/exams', label: 'Tests', icon: FileQuestion },
  { to: '/learn/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/learn/company-questions', label: 'Company Questions', icon: Code },
  { to: '/learn/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/learn/workshops', label: 'Workshops', icon: Presentation },
  { to: '/learn/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/learn/materials', label: 'Study Materials', icon: Presentation },
  { to: '/learn/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/learn/fees', label: 'Fees', icon: Wallet },
  { to: '/learn/notifications', label: 'Notifications', icon: Bell },
  { to: '/learn/profile', label: 'Profile', icon: UserRound },
]

function visible(role, item) {
  return !item.permission || hasPermission(role, item.permission) || role === 'admin'
}

export function navFor(role) {
  return (NAV[role] || [])
    .map((item) => {
      if (!item.children) return item
      const children = item.children.filter((child) => visible(role, child))
      return children.length ? { ...item, children } : null
    })
    .filter((item) => item && visible(role, item))
}
