export function runJavaScriptTests(code, testcases) {
  const results = []
  for (const testcase of testcases || []) {
    try {
      const factory = new Function(`${code}\nreturn typeof solution === 'function' ? solution : null;`)
      const solution = factory()
      if (!solution) throw new Error('Define a function named solution.')
      const input = JSON.parse(testcase.input)
      const actual = Array.isArray(input) ? solution(...input) : solution(input)
      const expected = JSON.parse(testcase.expected)
      const pass = JSON.stringify(actual) === JSON.stringify(expected)
      results.push({
        id: testcase.id,
        hidden: !!testcase.hidden,
        pass,
        actual: testcase.hidden ? undefined : actual,
        expected: testcase.hidden ? undefined : expected,
      })
    } catch (error) {
      results.push({
        id: testcase.id,
        hidden: !!testcase.hidden,
        pass: false,
        error: testcase.hidden ? 'Hidden test failed' : error.message,
      })
    }
  }
  return results
}

export function scoreAttempt(exam, attempt) {
  let earned = 0
  let total = 0
  for (const question of exam.questions || []) {
    total += Number(question.marks) || 0
    if (question.type === 'mcq') {
      if (Number(attempt.answers?.[question.id]) === Number(question.answer)) earned += Number(question.marks) || 0
    }
    if (question.type === 'coding' && question.language === 'javascript') {
      const results = runJavaScriptTests(attempt.code?.[question.id] || '', question.testcases)
      const cases = question.testcases || []
      if (cases.length && results.every((item) => item.pass)) earned += Number(question.marks) || 0
    }
  }
  return { earned, total }
}
