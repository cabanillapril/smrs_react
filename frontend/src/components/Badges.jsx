export function StatusBadge({ status }) {
  const cls = status?.toLowerCase() === 'regular' ? 'regular'
    : status?.toLowerCase() === 'irregular' ? 'irregular'
      : status?.toLowerCase() === 'graduated' ? 'graduated'
        : 'deficient'
  return <span className={`status-badge ${cls}`}>{status}</span>
}

export function RemarksBadge({ remarks }) {
  const label = remarks === 'passed' ? 'Passed' : remarks === 'failed' ? 'Failed' : (remarks || 'INC')
  const cls = remarks === 'passed' ? 'regular' : 'deficient'
  return <span className={`status-badge ${cls}`}>{label}</span>
}

export function DefTypeBadge({ reason }) {
  const cls = (reason || '').toLowerCase().replace(/\s+/g, '')
  return <span className={`def-type ${cls}`}>{reason}</span>
}

export function GwaCell({ grade }) {
  const cls = grade <= 2.0 ? 'good' : grade <= 3.0 ? 'average' : 'bad'
  return <span className={`gwa ${cls}`}>{grade}</span>
}

export function YearBadge({ year }) {
  const labels = ['', '1st', '2nd', '3rd', '4th']
  return <span className="year-badge">{labels[year] || year} Year</span>
}

export function SectionBadge({ section }) {
  return <span className="section-badge">{section || '—'}</span>
}

export function SubjectCodeBadge({ code }) {
  return <span className="subj-code-badge">{code || '—'}</span>
}
