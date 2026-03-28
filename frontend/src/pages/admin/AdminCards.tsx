/**
 * 管理后台 — 交付内容管理
 * 商品信息列表 + 批量导入功能
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchCards, importCards, fetchAdminProducts } from '../../services/api';
import type { Card, Product } from '../../types';
import { CARD_STATUS_MAP } from '../../types';
import AdminLayout from './AdminLayout';
import CustomSelect from '../../components/CustomSelect';

function AdminCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importProductId, setImportProductId] = useState('');
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCards({
        status: filterStatus || undefined,
        page,
        pageSize: 20,
      });
      setCards(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  useEffect(() => { loadCards(); }, [loadCards]);

  useEffect(() => {
    fetchAdminProducts().then(setProducts).catch(console.error);
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const cardLines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!importProductId || cardLines.length === 0) {
      setMsg('请选择商品并输入交付内容');
      return;
    }
    try {
      const res = await importCards(Number(importProductId), cardLines);
      setMsg(res.message);
      setShowImport(false);
      setImportText('');
      loadCards();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : '导入失败');
    }
  }

  /** 根据状态返回对应的 badge 样式 */
  function statusBadge(status: string) {
    const classMap: Record<string, string> = {
      quarantine: 'badge-warning',
      available: 'badge-success',
      sold: 'badge-info',
      replaced: 'badge-muted',
    };
    return classMap[status] || 'badge-muted';
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout title="交付内容管理">
      <div className="toolbar">
        <div className="toolbar-filters">
          <CustomSelect
            options={[
              { value: '', label: '全部状态' },
              { value: 'available', label: '可用' },
              { value: 'sold', label: '已售' },
              { value: 'replaced', label: '已换新' },
            ]}
            value={filterStatus}
            onChange={(val) => { setFilterStatus(val); setPage(1); }}
          />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            共 {total} 条
          </span>
          {msg && <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>{msg}</span>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowImport(true)}>+ 导入商品信息</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>商品ID</th>
                  <th>交付内容</th>
                  <th>状态</th>
                  <th>入库时间</th>
                </tr>
              </thead>
              <tbody>
                {cards.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.productId}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.content}
                    </td>
                    <td><span className={`badge ${statusBadge(c.status)}`}>{CARD_STATUS_MAP[c.status] || c.status}</span></td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
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

      {/* 导入模态框 */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>批量导入商品信息</h2>
            <form onSubmit={handleImport}>
              <div className="form-group">
                <label>选择商品 *</label>
                <CustomSelect
                  options={[
                    { value: '', label: '请选择' },
                    ...products.map(p => ({ value: String(p.id), label: `${p.name} (ID: ${p.id})` }))
                  ]}
                  value={importProductId}
                  onChange={(val) => setImportProductId(val)}
                  placeholder="请选择商品"
                />
              </div>
              <div className="form-group">
                <label>交付内容 *（每行一条，如：邮箱:密码:辅助邮箱 或自定义内容）</label>
                <textarea
                  className="input"
                  rows={8}
                  placeholder={"example@gmail.com:password123:recovery@email.com\nexample2@gmail.com:pass456:rec2@email.com"}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>取消</button>
                <button type="submit" className="btn btn-primary">确认导入</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminCards;
