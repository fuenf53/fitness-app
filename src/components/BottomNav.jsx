/** Mobile-style bottom navigation — 4 tabs per the plan. */
import { HomeIcon, DumbbellIcon, CalendarIcon, UserIcon } from './Icons.jsx';
import './BottomNav.css';

const TABS = [
  { id: 'home',     label: 'Home',    Icon: HomeIcon },
  { id: 'workout',  label: 'Workout', Icon: DumbbellIcon },
  { id: 'plan',     label: 'Plan',    Icon: CalendarIcon },
  { id: 'profile',  label: 'Profile', Icon: UserIcon },
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav__inner">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item ${tab === id ? 'nav-item--active' : ''}`}
            onClick={() => onChange(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <span className="nav-item__icon"><Icon /></span>
            <span className="nav-item__label">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
