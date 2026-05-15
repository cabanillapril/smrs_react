export function makeDummyData() {
  const students = [
    {
      student_number: 1001,
      student_id: '2024-1001',
      first_name: 'Juan',
      middle_name: 'D.',
      last_name: 'Cruz',
      birthday: '2002-01-15',
      gender: 'Male',
      address: 'Sample Address',
      contact_number: '0917-000-1111',
      email: 'juan.cruz@example.com',
      year_level: 1,
      course: 'BS Industrial Technology',
      section: 'A',
      status: 'Regular',
      major: 'BSIT',
    },
    {
      student_number: 1002,
      student_id: '2024-1002',
      first_name: 'Maria',
      middle_name: '',
      last_name: 'Santos',
      birthday: '2001-06-03',
      gender: 'Female',
      address: 'Sample Address',
      contact_number: '0917-000-2222',
      email: 'maria.santos@example.com',
      year_level: 2,
      course: 'BS Mechatronics and Automation Technology',
      section: 'B',
      status: 'Irregular',
      major: 'BSMAT',
    },
    {
      student_number: 1003,
      student_id: '2023-2003',
      first_name: 'Luis',
      middle_name: '',
      last_name: 'Reyes',
      birthday: '2000-09-21',
      gender: 'Male',
      address: 'Sample Address',
      contact_number: '0917-000-3333',
      email: 'luis.reyes@example.com',
      year_level: 3,
      course: '2-Year Program',
      section: 'C',
      status: 'Regular',
      major: '2-Year',
    },
  ]

  const deficiencies = [
    {
      id: 1,
      deficiency_id: 1,
      student_id: 1001,
      student_number: 1001,
      subject_code: 'MATH101',
      subject_name: 'Mathematics I',
      type: 'Incomplete',
      status: 'pending',
      semester: '1',
      remarks: 'Needs completion',
      date_recorded: '2024-05-01',
      date_resolved: null,
    },
    {
      id: 2,
      deficiency_id: 2,
      student_id: 1002,
      student_number: 1002,
      subject_code: 'ENG101',
      subject_name: 'English',
      type: 'Failed',
      status: 'pending',
      semester: '2',
      remarks: 'Failed assessment',
      date_recorded: '2024-05-10',
      date_resolved: null,
    },
  ]

  const grades = [
    {
      id: 1,
      grade_id: 1,
      student_id: '2024-1001',
      student_number: 1001,
      subject_code: 'MATH101',
      subject_name: 'Mathematics I',
      unit: 3,
      semester: 1,
      school_year: '2024-2025',
      midterm_grade: 2.5,
      final_grade: 3.0,
      grade: 2.75,
      remarks: 'Passed',
    },
    {
      id: 2,
      grade_id: 2,
      student_id: '2024-1002',
      student_number: 1002,
      subject_code: 'ENG101',
      subject_name: 'English',
      unit: 3,
      semester: 1,
      school_year: '2024-2025',
      midterm_grade: 5.0,
      final_grade: 4.5,
      grade: 4.75,
      remarks: 'Failed',
    },
  ]

  const subjects = [
    {
      id: 1,
      subject_id: 1,
      subject_code: 'MATH101',
      subject_name: 'Mathematics I',
      unit: 3,
      course: 'BS Industrial Technology',
      major: 'BSIT',
    },
    {
      id: 2,
      subject_id: 2,
      subject_code: 'ENG101',
      subject_name: 'English',
      unit: 3,
      course: 'BS Mechatronics and Automation Technology',
      major: 'BSMAT',
    },
  ]

  const stats = {
    total_students: students.length,
    active_students: students.filter((s) => s.status !== 'Graduated').length,
    total_deficiencies: deficiencies.length,
    pending_deficiencies: deficiencies.filter((d) => d.status === 'pending').length,
    resolved_count: 0,
    incomplete_count: deficiencies.filter((d) => (d.type || '').toLowerCase().includes('incomplete')).length,
    failed_count: deficiencies.filter((d) => (d.type || '').toLowerCase().includes('failed')).length,
  }

  const activities = [
    { text: 'Dummy activity: Login successful', type: 'green', time: 'just now' },
    { text: 'Dummy activity: Added new student record', type: 'blue', time: 'just now' },
  ]

  return { students, deficiencies, grades, subjects, stats, activities }
}

