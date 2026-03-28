/**
 * 前台公用导航栏组件
 * 所有前台页面共用，保证导航一致性
 */
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  /** 当前页面是否为首页（首页有锚点链接） */
  showAnchorLinks?: boolean;
}

export default function Navbar({ showAnchorLinks = false }: NavbarProps) {
  const location = useLocation();

  /** 判断当前路径是否匹配 */
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="header-logo" style={{ textDecoration: 'none' }}>
          <img src="/logo.png" alt="The66Shop" style={{ height: '38px', verticalAlign: 'middle', marginRight: '8px' }} />
          The66Shop
        </Link>
        <nav className="header-nav">
          <Link to="/" className={isActive('/') ? 'active' : ''}>首页</Link>
          {/* 首页内的锚点链接只在首页显示 */}
          {showAnchorLinks && <a href="#about">关于我</a>}
          <Link to="/products" className={isActive('/products') ? 'active' : ''}>全部商品</Link>
          <Link to="/booking" className={isActive('/booking') ? 'active' : ''}>服务预约</Link>
          {showAnchorLinks && <a href="#contact">联系方式</a>}
          <Link to="/order" className={isActive('/order') ? 'active' : ''}>订单查询</Link>
        </nav>
      </div>
    </header>
  );
}
