/**
 * 管理后台 — 仪表盘
 * 展示关键业务指标
 */
import { useState, useEffect } from 'react';
import { fetchDashboard } from '../../services/api';
import type { DashboardData } from '../../types';
import AdminLayout from './AdminLayout';

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboard().then(setData).catch(console.error);
  }, []);

  if (!data) {
    return (
      <AdminLayout title="仪表盘">
        <div className="loading-center"><div className="spinner" /></div>
      </AdminLayout>
    );
  }

  const stats = [
    { label: '总收入', value: `¥${data.totalRevenue.toFixed(2)}`, accent: true },
    { label: '今日收入', value: `¥${data.todayRevenue.toFixed(2)}`, accent: true },
    { label: '总订单数', value: data.totalOrders },
    { label: '今日订单', value: data.todayOrders },
    { label: '总库存', value: data.totalCards },
    { label: '可用库存', value: data.availableCards },
    { label: '隔离中', value: data.quarantineCards },
    { label: '已售出', value: data.soldCards },
    { label: '换新记录', value: data.warrantyClaimsCount },
  ];

  return (
    <AdminLayout title="仪表盘">
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className={`card stat-card ${stat.accent ? 'accent' : ''}`}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
