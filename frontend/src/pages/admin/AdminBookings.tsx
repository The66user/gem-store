/**
 * 管理后台 — 预约管理页面
 * 查看预约列表，更新预约状态和添加备注
 */
import { useState, useEffect, useCallback } from 'react';
import AdminLayout from './AdminLayout';
import { fetchBookings, updateBookingStatus } from '../../services/api';
import type { Booking, PaginatedResponse } from '../../types';
import { BOOKING_STATUS_MAP } from '../../types';

function AdminBookings() {
  const [data, setData] = useState<PaginatedResponse<Booking>>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');

  /** 加载预约列表 */
  const loadBookings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchBookings({
        status: statusFilter || undefined,
        page,
        pageSize: 20
      });
      setData(res);
    } catch (e) {
      console.error('加载预约失败:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  /** 打开编辑弹窗 */
  const startEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setEditStatus(booking.status);
    setEditNote(booking.adminNote || '');
  };

  /** 保存编辑 */
  const saveEdit = async () => {
    if (editingId === null) return;
    try {
      await updateBookingStatus(editingId, {
        status: editStatus,
        adminNote: editNote,
      });
      setEditingId(null);
      loadBookings(data.page);
    } catch (e) {
      alert(e instanceof Error ? e.message : '更新失败');
    }
  };

  /** 根据预约状态返回对应的 badge 样式 */
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'pending': return 'badge badge-warning';
      case 'confirmed': return 'badge badge-info';
      case 'completed': return 'badge badge-success';
      case 'cancelled': return 'badge badge-danger';
      default: return 'badge badge-muted';
    }
  };

  return (
    <AdminLayout title="📋 预约管理">

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-filters">
          <select className="input" style={{ width: '160px' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="confirmed">已确认</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          共 {data.total} 条预约
        </span>
      </div>

      {/* 预约列表 */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>联系方式</th>
                <th>服务类型</th>
                <th>需求描述</th>
                <th>状态</th>
                <th>备注</th>
                <th>提交时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(booking => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.contact}</td>
                  <td>{booking.serviceType}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {booking.description || '-'}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(booking.status)}>
                      {BOOKING_STATUS_MAP[booking.status] || booking.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {booking.adminNote || '-'}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    {booking.createdAt?.replace('T', ' ').slice(0, 19) || '-'}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(booking)}>
                      处理
                    </button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                    暂无预约记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 翻页 */}
      {data.total > data.pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          {Array.from({ length: Math.ceil(data.total / data.pageSize) }, (_, i) => (
            <button
              key={i + 1}
              className={`btn btn-sm ${data.page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => loadBookings(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingId !== null && (
        <div className="modal-overlay" onClick={() => setEditingId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>处理预约</h2>

            <div className="form-group">
              <label>状态</label>
              <select className="input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                <option value="pending">待处理</option>
                <option value="confirmed">已确认</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>

            <div className="form-group">
              <label>管理员备注</label>
              <textarea
                className="input"
                rows={3}
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                placeholder="添加处理备注..."
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingId(null)}>取消</button>
              <button className="btn btn-primary" onClick={saveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminBookings;
