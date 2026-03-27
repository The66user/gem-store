/**
 * 应用根组件
 * 配置路由和全局布局
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CheckoutPage from './pages/CheckoutPage';
import OrderQueryPage from './pages/OrderQueryPage';
import BookingPage from './pages/BookingPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCards from './pages/admin/AdminCards';
import AdminOrders from './pages/admin/AdminOrders';
import AdminBookings from './pages/admin/AdminBookings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 商城前台 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/checkout/:productId" element={<CheckoutPage />} />
        <Route path="/order" element={<OrderQueryPage />} />
        <Route path="/booking" element={<BookingPage />} />

        {/* 管理后台 */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/cards" element={<AdminCards />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
