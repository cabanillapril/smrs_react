export default function Topbar({ onMenuClick, onSearch }) {
  // Compute academic year display. If current month is July (6) or later,
  // use currentYear–currentYear+1, otherwise use previousYear–currentYear.
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const ayStart = month >= 6 ? year : year - 1
  const ayEnd = ayStart + 1

  return (
    <header className="topbar">
      <button className="menu-btn" onClick={onMenuClick}>
        <span /><span /><span />
      </button>

      <div className="topbar-search">
        <span className="search-icon">
          <i className="ph ph-magnifying-glass" />
        </span>
        <input
          type="text"
          placeholder="Search by name or student ID…"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="topbar-right">
        <div className="school-badge">A.Y. {ayStart}–{ayEnd}</div>
      </div>
    </header>
  )
}
