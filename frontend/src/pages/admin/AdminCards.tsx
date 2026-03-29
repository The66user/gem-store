/**
 * 管理后台 — 交付内容管理
 * 支持文本导入和文件上传两种交付模式
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchCards, importCards, fetchAdminProducts,
  uploadDeliveryFile, importFileCard,
} from '../../services/api';
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

  // 双 Tab：文本导入 / 文件上传
  const [importTab, setImportTab] = useState<'text' | 'file'>('text');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  /** 文本导入提交 */
  async function handleTextImport(e: React.FormEvent) {
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

  /** 文件上传提交 */
  async function handleFileImport(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!importProductId || !uploadFile) {
      setMsg('请选择商品并上传文件');
      return;
    }
    setUploading(true);
    try {
      // 先上传文件到服务器
      const uploadRes = await uploadDeliveryFile(uploadFile);
      // 再创建交付记录
      const importRes = await importFileCard(Number(importProductId), uploadRes.url);
      setMsg(importRes.message);
      setShowImport(false);
      setUploadFile(null);
      loadCards();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
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

  /**
   * 根据 contentType 展示交付内容
   * 文件类型只显示文件名，文本类型显示原始文本
   */
  function renderContent(card: Card) {
    if (card.contentType === 'file') {
      const fileName = card.content.split('/').pop() || '文件';
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '16px' }}>📄</span>
          <a
            href={card.content}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
          >
            {fileName}
          </a>
        </span>
      );
    }
    return card.content;
  }

  const totalPages = Math.ceil(total / 20);

  // Tab 切换样式
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    background: 'none',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    transition: 'all 0.2s',
  });

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
        <button className="btn btn-primary btn-sm" onClick={() => setShowImport(true)}>+ 导入交付内容</button>
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
                  <th>类型</th>
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
                    <td>
                      <span className={`badge ${c.contentType === 'file' ? 'badge-info' : 'badge-muted'}`}>
                        {c.contentType === 'file' ? '📄 文件' : '📝 文本'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {renderContent(c)}
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

      {/* 导入模态框 — 双 Tab */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>导入交付内容</h2>

            {/* Tab 切换 */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-md)' }}>
              <button style={tabStyle(importTab === 'text')} onClick={() => setImportTab('text')}>
                📝 文本导入
              </button>
              <button style={tabStyle(importTab === 'file')} onClick={() => setImportTab('file')}>
                📄 文件上传
              </button>
            </div>

            {/* 商品选择（两个 Tab 共用） */}
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

            {importTab === 'text' ? (
              /* 文本导入模式 */
              <form onSubmit={handleTextImport}>
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
            ) : (
              /* 文件上传模式 */
              <form onSubmit={handleFileImport}>
                <div className="form-group">
                  <label>选择文件 *（支持 PDF、Word、Excel、PPT、ZIP 等）</label>
                  <div
                    style={{
                      border: '2px dashed var(--color-border)',
                      borderRadius: '8px',
                      padding: 'var(--space-lg)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: uploadFile ? 'var(--color-bg-secondary)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => document.getElementById('delivery-file-input')?.click()}
                  >
                    {uploadFile ? (
                      <div>
                        <span style={{ fontSize: '28px' }}>📄</span>
                        <p style={{ margin: '8px 0 0', fontWeight: 600 }}>{uploadFile.name}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {(uploadFile.size / 1024).toFixed(1)} KB · 点击更换
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '32px' }}>📁</span>
                        <p style={{ margin: '8px 0 0', color: 'var(--color-text-secondary)' }}>
                          点击选择文件或拖放到此处
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          最大 50MB
                        </p>
                      </div>
                    )}
                    <input
                      id="delivery-file-input"
                      type="file"
                      style={{ display: 'none' }}
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>取消</button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? '上传中...' : '上传并导入'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminCards;
