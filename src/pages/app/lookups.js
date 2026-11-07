import { useLms } from '../../lib/store'

export function useLookups() {
  const lms = useLms()
  const { state } = lms
  return {
    ...lms,
    courseName: (id) => state.courses.find((course) => course.id === id)?.name || '—',
    batchName: (id) => state.batches.find((batch) => batch.id === id)?.name || '—',
    studentName: (id) => state.students.find((student) => student.id === id)?.name || '—',
    subjectName: (id) => state.subjects.find((subject) => subject.id === id)?.name || '—',
    profileName: (id) => state.profiles.find((profile) => profile.id === id)?.name || '—',
  }
}

export function monthSeries(count = 6) {
  const labels = []
  const now = new Date()
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    labels.push({ key, label: date.toLocaleString('en-IN', { month: 'short' }) })
  }
  return labels
}
