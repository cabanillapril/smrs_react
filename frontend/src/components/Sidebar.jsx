export default function Sidebar({ isOpen, activePage, onNavigate, onLogout, user }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ph-squares-four', section: 'MAIN' },
    { id: 'students', label: 'Students', icon: 'ph-users' },
    { id: 'deficiencies', label: 'Deficiencies', icon: 'ph-warning-circle' },
    { id: 'grades', label: 'Grades', icon: 'ph-file-text' },
    { id: 'curriculum', label: 'Curriculum', icon: 'ph-books', section: 'RECORDS' },
    { id: 'reports', label: 'Reports', icon: 'ph-chart-bar' },
  ]

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-mark">
          <i className="ph ph-graduation-cap" />
        </div>
        <div className="logo-text">
          <span className="logo-title">CTech SMRS</span>
          <span className="logo-sub">v1.0</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => (
          <div key={item.id}>
            {item.section && (
              <div className="nav-section-label">
                {item.section}
              </div>
            )}
            <a
              href="#"
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                onNavigate(item.id)
              }}
            >
              <span className="nav-icon">
                <i className={`ph ${item.icon}`} />
              </span>{' '}
              {item.label}
            </a>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{(user || 'A').substring(0, 2).toUpperCase()}</div>
          <div className="user-info">
            <span className="user-name">{user || 'Administrator'}</span>
            <span className="user-role">Registrar Office</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <i className="ph ph-sign-out" /> Logout
        </button>
      </div>
    </aside>
  )
}
