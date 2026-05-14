import { MAJORS_BY_PROGRAM } from '../utils/constants'

export default function MajorSelect({ program, value, onChange, isFilter = false, id, ...rest }) {
  const majors = MAJORS_BY_PROGRAM[program] || []

  return (
    <select
      id={id}
      className={rest.className || 'form-input'}
      value={value}
      onChange={onChange}
      {...rest}
    >
      {isFilter
        ? <option value="">All Majors</option>
        : program
          ? majors.length === 0
            ? <option value="">No majors for this program</option>
            : <option value="">Select Major…</option>
          : <option value="">Select Program first…</option>
      }
      {majors.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  )
}
