/**
 * 订单查询 + 质保换新页面
 * 支持：订单号查询、邮箱查询、本地缓存历史订单、URL 参数自动查询
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { queryOrder, claimWarranty, queryOrdersByEmail } from '../services/api';
import type { Order } from '../types';
import { ORDER_STATUS_MAP } from '../types';
import Navbar from '../components/Navbar';

/** localStorage 中保存历史订单的 key */
const HISTORY_STORAGE_KEY = 'gemstore_order_history';
/** 最多保留历史记录条数 */
const MAX_HISTORY_COUNT = 20;

interface OrderHistoryItem {
  orderNo: string;
  productName: string;
  amount: number;
  status: string;
  createdAt: string | null;
  queriedAt: number;
}

/**
 * 从 localStorage 读取历史订单
 */
function loadOrderHistory(): OrderHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 保存订单到历史记录
 * 按查询时间倒序排列，去重，最多保留 MAX_HISTORY_COUNT 条
 */
function saveToHistory(order: Order): void {
  const history = loadOrderHistory();
  const newItem: OrderHistoryItem = {
    orderNo: order.orderNo,
    productName: order.productName,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    queriedAt: Date.now(),
  };

  // 去重：移除同订单号的旧记录
  const filtered = history.filter(h => h.orderNo !== order.orderNo);
  // 插入到最前面
  filtered.unshift(newItem);
  // 截取最大条数
  const trimmed = filtered.slice(0, MAX_HISTORY_COUNT);

  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * 从历史记录中删除指定订单
 */
function removeFromHistory(orderNo: string): OrderHistoryItem[] {
  const history = loadOrderHistory();
  const updated = history.filter(h => h.orderNo !== orderNo);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * 判断输入是邮箱还是订单号
 */
function isEmail(input: string): boolean {
  return input.includes('@') && input.includes('.');
}

function OrderQueryPage() {
  const [searchParams] = useSearchParams();
  const [queryInput, setQueryInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [warrantyMsg, setWarrantyMsg] = useState('');
  const [warrantyReason, setWarrantyReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<OrderHistoryItem[]>(loadOrderHistory());

  /** 查询单个订单（by 订单号） */
  const queryByOrderNo = useCallback(async (orderNo: string) => {
    setError('');
    setOrder(null);
    setOrders([]);
    setWarrantyMsg('');
    setLoading(true);
    try {
      const data = await queryOrder(orderNo.trim());
      setOrder(data);
      // 保存到历史记录
      saveToHistory(data);
      setHistory(loadOrderHistory());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /** 查询订单列表（by 邮箱） */
  const queryByEmail = useCallback(async (email: string) => {
    setError('');
    setOrder(null);
    setOrders([]);
    setWarrantyMsg('');
    setLoading(true);
    try {
      const data = await queryOrdersByEmail(email.trim());
      if (data.length === 0) {
        setError('未找到与该邮箱关联的订单');
      } else if (data.length === 1) {
        // 只有一个结果直接展示详情
        setOrder(data[0]);
        saveToHistory(data[0]);
        setHistory(loadOrderHistory());
      } else {
        setOrders(data);
        // 保存所有到历史
        data.forEach(o => saveToHistory(o));
        setHistory(loadOrderHistory());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /** URL 参数自动查询 */
  useEffect(() => {
    const urlOrderNo = searchParams.get('orderNo');
    if (urlOrderNo) {
      setQueryInput(urlOrderNo);
      queryByOrderNo(urlOrderNo);
    }
  }, [searchParams, queryByOrderNo]);

  /** 表单提交：自动识别订单号或邮箱 */
  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    const input = queryInput.trim();
    if (!input) return;

    if (isEmail(input)) {
      await queryByEmail(input);
    } else {
      await queryByOrderNo(input);
    }
  }

  /** 质保换新 */
  async function handleWarranty() {
    if (!order) return;
    setLoading(true);
    setWarrantyMsg('');
    try {
      const res = await claimWarranty(order.orderNo, warrantyReason);
      setWarrantyMsg(res.message);
      const updated = await queryOrder(order.orderNo);
      setOrder(updated);
    } catch (err: unknown) {
      setWarrantyMsg(err instanceof Error ? err.message : '换新失败');
    } finally {
      setLoading(false);
    }
  }

  /** 复制并显示反馈 */
  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  /** 删除历史记录 */
  function handleDeleteHistory(orderNo: string) {
    const updated = removeFromHistory(orderNo);
    setHistory(updated);
  }

  /** 点击历史记录项 */
  function handleHistoryClick(orderNo: string) {
    setQueryInput(orderNo);
    queryByOrderNo(orderNo);
  }

  /** 从邮箱查询列表中选择一个订单查看详情 */
  function handleSelectOrder(selectedOrder: Order) {
    setOrder(selectedOrder);
    setOrders([]);
  }

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="query-box">
          <h2>📦 订单查询</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' }}>
            输入订单号或邮箱，查看订单状态和账号信息
          </p>

          <form onSubmit={handleQuery}>
            <div className="search-group">
              <input
                type="text"
                className="input"
                placeholder="请输入订单号 或 邮箱地址"
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !queryInput.trim()}>
                {loading ? <span className="spinner" /> : '🔍 查询'}
              </button>
            </div>
          </form>

          {error && <div className="message message-error">{error}</div>}
        </div>

        {/* 邮箱查询多结果列表 */}
        {orders.length > 0 && (
          <div className="order-result">
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-md)' }}>
                查询到 {orders.length} 个订单，请选择查看：
              </h3>
              {orders.map(o => (
                <div
                  key={o.orderNo}
                  className="info-row"
                  style={{ cursor: 'pointer', padding: 'var(--space-sm) 0' }}
                  onClick={() => handleSelectOrder(o)}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                    {o.orderNo}
                  </span>
                  <span>
                    <span style={{ marginRight: 'var(--space-sm)' }}>{o.productName}</span>
                    <span className={`badge ${o.status === 'delivered' ? 'badge-success' : 'badge-info'}`}>
                      {ORDER_STATUS_MAP[o.status] || o.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 单个订单详情 */}
        {order && (
          <div className="order-result">
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-md)' }}>订单信息</h3>
              <div className="info-row">
                <span className="info-label">订单号</span>
                <span style={{ fontFamily: 'monospace' }}>{order.orderNo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">商品</span>
                <span>{order.productName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">买家邮箱</span>
                <span>{order.buyerEmail}</span>
              </div>
              <div className="info-row">
                <span className="info-label">金额</span>
                <span>¥{order.amount.toFixed(2)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">状态</span>
                <span className={`badge ${order.status === 'delivered' ? 'badge-success' : 'badge-info'}`}>
                  {ORDER_STATUS_MAP[order.status] || order.status}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">质保截止</span>
                <span>{order.warrantyExpiresAt ? new Date(order.warrantyExpiresAt).toLocaleDateString('zh-CN') : '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">换新机会</span>
                <span>{order.warrantyUsed ? '已使用' : '未使用（剩余1次）'}</span>
              </div>
            </div>

            {/* 交付内容 */}
            {(order.cardContent || order.fileUrl) && (
              <div className="card-reveal" style={{ marginTop: 'var(--space-md)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  您的交付内容：
                </p>
                {order.cardContent && (
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    <code>{order.cardContent}</code>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 'var(--space-sm)', marginLeft: 'var(--space-sm)' }}
                      onClick={() => handleCopy(order.cardContent || '')}
                    >
                      {copied ? '✅ 已复制' : '📋 复制'}
                    </button>
                  </div>
                )}
                {order.fileUrl && (
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    <a
                      href={order.fileUrl}
                      download
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      📄 下载文件
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 质保换新 */}
            {order.status === 'delivered' && !order.warrantyUsed && order.warrantyExpiresAt && (
              <div className="card" style={{ marginTop: 'var(--space-md)' }}>
                <h4 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                  🛡️ 申请质保换新
                </h4>
                <div className="form-group">
                  <textarea
                    className="input"
                    placeholder="请简要描述问题（如：高级权益被撤销）"
                    value={warrantyReason}
                    onChange={e => setWarrantyReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleWarranty}
                  disabled={loading}
                >
                  {loading ? <span className="spinner" /> : '提交换新申请'}
                </button>
                {warrantyMsg && (
                  <div className={`message ${warrantyMsg.includes('成功') ? 'message-success' : 'message-error'}`}
                    style={{ marginTop: 'var(--space-md)' }}>
                    {warrantyMsg}
                  </div>
                )}
              </div>
            )}

            {/* 返回按钮（邮箱查询多结果时显示） */}
            {orders.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setOrder(null); setQueryInput(''); }}
                >
                  ← 返回查询
                </button>
              </div>
            )}
          </div>
        )}

        {/* 最近订单（本地缓存） */}
        {!order && orders.length === 0 && history.length > 0 && (
          <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
            <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
              📋 最近订单（本机/此浏览器）
            </h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-md)' }}>
              我们会在此设备保存您的订单，便于下次快速查询（仅保存在本机）
            </p>
            {history.map(h => (
              <div
                key={h.orderNo}
                className="info-row"
                style={{ cursor: 'pointer', padding: 'var(--space-xs) 0' }}
              >
                <span
                  onClick={() => handleHistoryClick(h.orderNo)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}
                >
                  <span style={{ fontSize: '14px', opacity: 0.4 }}>🕐</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                    {h.orderNo.slice(0, 6)}...{h.orderNo.slice(-6)}
                  </span>
                  <span className={`badge ${h.status === 'delivered' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '11px' }}>
                    {ORDER_STATUS_MAP[h.status] || h.status}
                  </span>
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '12px', opacity: 0.6 }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteHistory(h.orderNo); }}
                  title="删除此记录"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default OrderQueryPage;
