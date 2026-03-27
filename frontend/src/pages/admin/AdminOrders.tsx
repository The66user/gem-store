/**
 * 管理后台 — 订单管理
 * 订单列表 + 状态筛选 + 分页
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchOrders } from '../../services/api';
import type { Order } from '../../types';
import { ORDER_STATUS_MAP } from '../../types';
import AdminLayout from './AdminLayout';

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrders({
        status: filterStatus || undefined,
        page,
        pageSize: 20,
      });
      setOrders(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  /** 根据状态返回对应的 badge 样式 */
  function statusBadge(status: string) {
    const classMap: Record<string, string> = {
      pending: 'badge-warning',
      delivered: 'badge-success',
      warranty_claimed: 'badge-info',
      completed: 'badge-muted',
    };
    return classMap[status] || 'badge-muted';
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout title="订单管理">
      <div className="toolbar">
        <div className="toolbar-filters">
          <select className="input" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            style={{ width: 'auto', minWidth: 140 }}>
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="delivered">已发货</option>
            <option value="warranty_claimed">已换新</option>
          </select>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            共 {total} 条
          </span>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>商品</th>
                  <th>买家邮箱</th>
                  <th>金额</th>
                  <th>支付方式</th>
                  <th>状态</th>
                  <th>换新</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{o.orderNo}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.productName}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{o.buyerEmail}</td>
                    <td>¥{o.amount.toFixed(2)}</td>
                    <td>{o.paymentMethod === 'alipay' ? '支付宝' : o.paymentMethod === 'wechat' ? '微信' : o.paymentMethod}</td>
                    <td><span className={`badge ${statusBadge(o.status)}`}>{ORDER_STATUS_MAP[o.status] || o.status}</span></td>
                    <td>{o.warrantyUsed ? '✅ 已使用' : '-'}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString('zh-CN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
              <span style={{ padding: '6px 14px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {page} / {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

export default AdminOrders;
