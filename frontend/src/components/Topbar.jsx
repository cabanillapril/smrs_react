export default function Topbar({ onMenuClick, onSearch }) {
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
        <div className="school-badge">A.Y. 2025–2026</div>
      </div>
    </header>
  )
}
