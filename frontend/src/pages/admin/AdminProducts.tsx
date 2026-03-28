/**
 * 管理后台 — 商品管理
 * 商品列表、创建商品、编辑商品
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchAdminProducts, createProduct, updateProduct } from '../../services/api';
import type { Product } from '../../types';
import AdminLayout from './AdminLayout';

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [msg, setMsg] = useState('');

  // 表单状态
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDetail, setFormDetail] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formOriginal, setFormOriginal] = useState('');
  const [formType, setFormType] = useState<'digital' | 'service'>('digital');

  const loadProducts = useCallback(async () => {
    try {
      const data = await fetchAdminProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  function openCreate() {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormDetail('');
    setFormPrice('');
    setFormOriginal('');
    setFormType('digital');
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormDetail(p.detailDescription || '');
    setFormPrice(String(p.price));
    setFormOriginal(p.originalPrice ? String(p.originalPrice) : '');
    setFormType(p.productType || 'digital');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      if (editing) {
        await updateProduct(editing.id, {
          name: formName,
          description: formDesc,
          detailDescription: formDetail,
          price: Number(formPrice),
          originalPrice: formOriginal ? Number(formOriginal) : undefined,
          productType: formType,
        });
        setMsg('更新成功');
      } else {
        await createProduct({
          name: formName,
          description: formDesc,
          detailDescription: formDetail,
          price: Number(formPrice),
          originalPrice: formOriginal ? Number(formOriginal) : undefined,
          productType: formType,
        });
        setMsg('创建成功');
      }
      setShowModal(false);
      loadProducts();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : '操作失败');
    }
  }

  async function toggleActive(p: Product) {
    await updateProduct(p.id, { isActive: !p.isActive } as Partial<Product>);
    loadProducts();
  }

  return (
    <AdminLayout title="商品管理">
      <div className="toolbar">
        <div>
          {msg && <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>{msg}</span>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ 新建商品</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>类型</th>
                <th>售价</th>
                <th>原价</th>
                <th>库存</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>
                    <span className={`badge ${p.productType === 'service' ? 'badge-info' : 'badge-muted'}`}>
                      {p.productType === 'service' ? '服务' : '数字'}
                    </span>
                  </td>
                  <td>¥{p.price.toFixed(2)}</td>
                  <td>{p.originalPrice ? `¥${p.originalPrice.toFixed(2)}` : '-'}</td>
                  <td>{p.stockCount}</td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-muted'}`}>
                      {p.isActive ? '上架' : '下架'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}
                      style={{ marginRight: 'var(--space-xs)' }}>编辑</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(p)}>
                      {p.isActive ? '下架' : '上架'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建/编辑模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? '编辑商品' : '新建商品'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>商品类型 *</label>
                <select className="input" value={formType} onChange={e => setFormType(e.target.value as 'digital' | 'service')}>
                  <option value="digital">数字商品（自动发卡）</option>
                  <option value="service">服务商品（人工处理）</option>
                </select>
              </div>
              <div className="form-group">
                <label>商品名称 *</label>
                <input className="input" value={formName} onChange={e => setFormName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>商品简介</label>
                <textarea className="input" value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} placeholder="商品卡片上显示的短描述" />
              </div>
              <div className="form-group">
                <label>详细说明</label>
                <textarea className="input" value={formDetail} onChange={e => setFormDetail(e.target.value)} rows={4} placeholder="商品详情页显示的完整说明" />
              </div>
              <div className="form-group">
                <label>售价 (CNY) *</label>
                <input className="input" type="number" step="0.01" value={formPrice}
                  onChange={e => setFormPrice(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>原价 (划线价)</label>
                <input className="input" type="number" step="0.01" value={formOriginal}
                  onChange={e => setFormOriginal(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary">{editing ? '保存' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminProducts;
