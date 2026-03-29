/**
 * 管理后台 — 系统设置
 * 商品类型管理（CRUD）
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminProductTypes,
  createProductType,
  updateProductType,
  deleteProductType,
} from '../../services/api';
import type { ProductType } from '../../types';
import AdminLayout from './AdminLayout';

function AdminSettings() {
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProductType | null>(null);

  // 表单状态
  const [formSlug, setFormSlug] = useState('');
  const [formName, setFormName] = useState('');
  const [formAutoDeliver, setFormAutoDeliver] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState('0');

  const loadTypes = useCallback(async () => {
    try {
      const data = await fetchAdminProductTypes();
      setTypes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  function openCreate() {
    setEditing(null);
    setFormSlug('');
    setFormName('');
    setFormAutoDeliver(false);
    setFormSortOrder('0');
    setShowModal(true);
  }

  function openEdit(t: ProductType) {
    setEditing(t);
    setFormSlug(t.slug);
    setFormName(t.name);
    setFormAutoDeliver(t.autoDeliver);
    setFormSortOrder(String(t.sortOrder || 0));
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      if (editing) {
        await updateProductType(editing.id!, {
          slug: formSlug,
          name: formName,
          autoDeliver: formAutoDeliver,
          sortOrder: Number(formSortOrder),
        });
        setMsg('更新成功');
      } else {
        await createProductType({
          slug: formSlug,
          name: formName,
          autoDeliver: formAutoDeliver,
          sortOrder: Number(formSortOrder),
        });
        setMsg('创建成功');
      }
      setShowModal(false);
      loadTypes();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : '操作失败');
    }
  }

  async function handleDelete(t: ProductType) {
    if (!confirm(`确定删除「${t.name}」？如果有商品使用此类型则无法删除。`)) return;
    try {
      await deleteProductType(t.id!);
      setMsg('已删除');
      loadTypes();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : '删除失败');
    }
  }

  return (
    <AdminLayout title="系统设置">
      {/* 商品类型管理 */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>📦 商品类型</h2>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ 新增类型</button>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-md)' }}>
          管理商品类型分类。「自动发货」类型的商品在支付后自动分配交付内容，否则走人工处理流程。
        </p>

        {msg && <div className="alert" style={{ marginBottom: 'var(--space-md)' }}>{msg}</div>}

        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>加载中...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Slug（标识）</th>
                  <th>显示名称</th>
                  <th>发货模式</th>
                  <th>排序</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {types.map(t => (
                  <tr key={t.id}>
                    <td><code style={{ background: 'var(--color-bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>{t.slug}</code></td>
                    <td>{t.name}</td>
                    <td>
                      <span className={`badge ${t.autoDeliver ? 'badge-success' : 'badge-info'}`}>
                        {t.autoDeliver ? '⚡ 自动发货' : '👤 人工处理'}
                      </span>
                    </td>
                    <td>{t.sortOrder}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}
                        style={{ marginRight: 'var(--space-xs)' }}>编辑</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t)}
                        style={{ color: 'var(--color-error)' }}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新建/编辑模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? '编辑商品类型' : '新增商品类型'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Slug（唯一标识）*</label>
                <input
                  className="input"
                  value={formSlug}
                  onChange={e => setFormSlug(e.target.value)}
                  required
                  placeholder="英文标识，如: ai_tool, ppt_service"
                  disabled={!!editing}
                />
                {editing && (
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Slug 创建后不可修改，用于系统内部标识
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>显示名称 *</label>
                <input
                  className="input"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  placeholder="如: AI 工具（自动发卡）"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formAutoDeliver}
                    onChange={e => setFormAutoDeliver(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-accent)' }}
                  />
                  自动发货
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    （支付后自动分配交付内容）
                  </span>
                </label>
              </div>
              <div className="form-group">
                <label>排序顺序</label>
                <input
                  className="input"
                  type="number"
                  value={formSortOrder}
                  onChange={e => setFormSortOrder(e.target.value)}
                  placeholder="数字越小排越前"
                />
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

export default AdminSettings;
