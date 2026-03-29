/**
 * 管理后台 — 交付内容管理
 * 支持三种模式：纯文本、纯文件、文本+文件同时存在
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchCards, importCards, importDeliveryItem,
  fetchAdminProducts, uploadDeliveryFile,
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
  const [msg, setMsg] = useState('');

  // 导入模式：batch = 批量文本，single = 单条(文本+文件)
  const [importMode, setImportMode] = useState<'batch' | 'single'>('batch');

  // 批量文本模式
  const [importText, setImportText] = useState('');

  // 单条模式（文本+文件都可选）
  const [singleText, setSingleText] = useState('');
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

  /** 批量文本导入 */
  async function handleBatchImport(e: React.FormEvent) {
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

  /** 单条导入（文本+文件任意组合） */
  async function handleSingleImport(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!importProductId) {
      setMsg('请选择商品');
      return;
    }
    if (!singleText && !uploadFile) {
      setMsg('文本内容和文件至少填一项');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = '';
      // 如果有文件，先上传
      if (uploadFile) {
        const uploadRes = await uploadDeliveryFile(uploadFile);
        fileUrl = uploadRes.url;
      }
      const res = await importDeliveryItem(Number(importProductId), singleText, fileUrl);
      setMsg(res.message);
      setShowImport(false);
      setSingleText('');
      setUploadFile(null);
      loadCards();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : '导入失败');
    } finally {
      setUploading(false);
    }
  }

  /** 状态 badge 样式 */
  function statusBadge(status: string) {
    const classMap: Record<string, string> = {
      quarantine: 'badge-warning',
      available: 'badge-success',
      sold: 'badge-info',
      replaced: 'badge-muted',
    };
    return classMap[status] || 'badge-muted';
  }

  /** 类型 badge */
  function typeBadge(card: Card) {
    if (card.contentType === 'mixed') return '📝📄 混合';
    if (card.contentType === 'file') return '📄 文件';
    return '📝 文本';
  }

  /** 渲染交付内容预览 */
  function renderContent(card: Card) {
    const parts: React.ReactNode[] = [];
    if (card.content) {
      parts.push(
        <span key="text" style={{ wordBreak: 'break-all' }}>{card.content}</span>
      );
    }
    if (card.fileUrl) {
      const fileName = card.fileUrl.split('/').pop() || '文件';
      parts.push(
        <a
          key="file"
          href={card.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)', textDecoration: 'underline', marginLeft: card.content ? '8px' : 0 }}
        >
          📄 {fileName}
        </a>
      );
    }
    return parts.length > 0 ? parts : '-';
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
                      <span className={`badge ${c.contentType === 'file' ? 'badge-info' : c.contentType === 'mixed' ? 'badge-accent' : 'badge-muted'}`}>
                        {typeBadge(c)}
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
            <h2>导入交付内容</h2>

            {/* 模式切换 */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-md)' }}>
              <button style={tabStyle(importMode === 'batch')} onClick={() => setImportMode('batch')}>
                📋 批量文本导入
              </button>
              <button style={tabStyle(importMode === 'single')} onClick={() => setImportMode('single')}>
                📦 单条导入
              </button>
            </div>

            {/* 商品选择（共用） */}
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

            {importMode === 'batch' ? (
              /* 批量文本导入 */
              <form onSubmit={handleBatchImport}>
                <div className="form-group">
                  <label>交付内容 *（每行一条）</label>
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
              /* 单条导入：文本+文件可同时填写 */
              <form onSubmit={handleSingleImport}>
                <div className="form-group">
                  <label>文本内容（可选）</label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="比如使用说明、账号密码等..."
                    value={singleText}
                    onChange={e => setSingleText(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>文件附件（可选）</label>
                  <div
                    style={{
                      border: '2px dashed var(--color-border)',
                      borderRadius: '8px',
                      padding: 'var(--space-md)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: uploadFile ? 'var(--color-bg-secondary)' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => document.getElementById('delivery-file-input')?.click()}
                  >
                    {uploadFile ? (
                      <div>
                        <span style={{ fontSize: '24px' }}>📄</span>
                        <p style={{ margin: '6px 0 0', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{uploadFile.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {(uploadFile.size / 1024).toFixed(1)} KB · 点击更换
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: '28px' }}>📁</span>
                        <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          点击选择文件（PDF / Word / ZIP 等，最大 50MB）
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

                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-md)' }}>
                  💡 文本和文件至少填一项，也可以同时填写
                </p>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>取消</button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? '上传中...' : '确认导入'}
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
