export function FormGroup({ label, required, children, fullSpan }) {
  return (
    <div className={`form-group${fullSpan ? ' full-span' : ''}`}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="form-required">*</span>}
        </label>
      )}
      {children}
    </div>
  )
}

export function FormInput({ ...props }) {
  return <input className="form-input" {...props} />
}

export function FormSelect({ children, ...props }) {
  return (
    <select className="form-input" {...props}>
      {children}
    </select>
  )
}

export function FormTextarea({ rows = 2, ...props }) {
  return <textarea className="form-input" rows={rows} {...props} />
}

export function FormGrid({ children }) {
  return <div className="form-grid">{children}</div>
}
