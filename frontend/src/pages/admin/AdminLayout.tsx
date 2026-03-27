/**
 * 管理后台 — 通用布局组件
 * 包含侧边栏导航
 */
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { adminLogout } from '../../services/api';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

function AdminLayout({ children, title }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  function handleLogout() {
    adminLogout();
    navigate('/admin/login');
  }

  const navItems = [
    { path: '/admin', label: '📊 仪表盘' },
    { path: '/admin/products', label: '📦 商品管理' },
    { path: '/admin/cards', label: '📦 交付管理' },
    { path: '/admin/orders', label: '📋 订单管理' },
    { path: '/admin/bookings', label: '📅 预约管理' },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo"><img src="/logo.png" alt="The66Shop" style={{ height: '38px', verticalAlign: 'middle', marginRight: '8px' }} />The66Shop</div>
        <nav>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-xl)' }}>
          <Link to="/" style={{ display: 'block', padding: '10px var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            ← 返回前台
          </Link>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: 'var(--space-sm)' }}
          >
            退出登录
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
