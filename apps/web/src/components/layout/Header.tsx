import { useAuthContext } from '../../stores/auth-store';
import { useLogout } from '../../hooks/useAuth';
import { useUnreadCount } from '../../hooks/useNotifications';
import { useTheme } from '../../hooks/useTheme';
import { useMobileSidebar } from './AppLayout';
import { Avatar } from '../common/Avatar';
import { Dropdown, DropdownItem } from '../common/Dropdown';
import { Link } from 'react-router-dom';
import { Bell, Sun, Moon, Menu } from 'lucide-react';

export function Header() {
  const { user } = useAuthContext();
  const logout = useLogout();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.data?.count || 0;
  const { resolvedTheme, toggleTheme } = useTheme();
  const { open: openSidebar } = useMobileSidebar();

  return (
    <header className="h-16 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-4 md:px-6">
      {/* Left: Hamburger (mobile) */}
      <div className="flex items-center gap-2">
        <button
          onClick={openSidebar}
          className="p-2 text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container-highest transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/dashboard" className="md:hidden flex items-center gap-2">
          <img src="/logo.png" alt="CloudTask" className="w-6 h-6 rounded-md" />
          <span className="text-sm font-bold text-on-surface">CloudTask</span>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container-highest transition-colors"
          title={resolvedTheme === 'light' ? 'ダークモード' : 'ライトモード'}
        >
          {resolvedTheme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Notification Bell */}
        <Link to="/notifications" className="relative p-2 text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container-highest transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-error text-on-error text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Menu */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 hover:bg-surface-container-highest rounded-xl p-1.5 transition-colors">
              <Avatar name={user?.displayName || ''} size="sm" />
              <span className="text-sm font-medium text-on-surface hidden sm:inline">{user?.displayName}</span>
            </button>
          }
        >
          <div className="px-4 py-2 border-b border-outline-variant">
            <p className="text-sm font-medium text-on-surface">{user?.displayName}</p>
            <p className="text-xs text-on-surface-variant">{user?.email}</p>
          </div>
          <Link to="/settings/profile">
            <DropdownItem>Profile</DropdownItem>
          </Link>
          <DropdownItem onClick={() => logout.mutate()} danger>
            Logout
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
