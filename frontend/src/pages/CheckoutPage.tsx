/**
 * 结账页 — 输入邮箱 → 选择支付方式 → 创建订单 → 扫码/跳转支付 → 轮询等待 → 显示结果
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchProduct, createOrder, mockPay, queryOrder, checkPaymentStatus } from '../services/api';
import type { Product, Order, CreateOrderResponse } from '../types';
import { ORDER_STATUS_MAP } from '../types';
import Navbar from '../components/Navbar';

/** 轮询间隔（毫秒） */
const POLL_INTERVAL = 3000;
/** 最大轮询时间（30 分钟），与后端 ORDER_TIMEOUT_MINUTES 保持一致 */
const MAX_POLL_DURATION = 30 * 60 * 1000;

function CheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [email, setEmail] = useState('');
  const [payMethod, setPayMethod] = useState('wechat');
  const [step, setStep] = useState<'form' | 'paying' | 'done' | 'expired'>('form');
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<CreateOrderResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  useEffect(() => {
    if (productId) {
      fetchProduct(Number(productId))
        .then(setProduct)
        .catch(() => navigate('/'));
    }
  }, [productId, navigate]);

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  /**
   * 轮询检查支付状态
   * 每 3 秒查询一次，支付成功后自动跳转到结果页
   */
  const startPolling = useCallback((orderNo: string) => {
    pollStartRef.current = Date.now();

    pollTimerRef.current = setInterval(async () => {
      try {
        // 超时检查：30 分钟未支付自动过期
        if (Date.now() - pollStartRef.current > MAX_POLL_DURATION) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setStep('expired');
          return;
        }

        const result = await checkPaymentStatus(orderNo);
        if (result.paid) {
          // 支付成功，停止轮询并显示结果
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          const orderData = await queryOrder(orderNo);
          setOrder(orderData);
          setStep('done');
        }
      } catch {
        // 轮询失败不中断，继续等待
      }
    }, POLL_INTERVAL);
  }, []);

  /** 提交订单 */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !product) return;
    setError('');
    setLoading(true);

    try {
      // 创建订单
      const res = await createOrder({
        productId: product.id,
        buyerEmail: email,
        paymentMethod: payMethod,
      });

      setPaymentInfo(res);

      if (res.isMock) {
        // Mock 模式：直接模拟支付
        setStep('paying');
        await mockPay(res.orderNo);
        const orderData = await queryOrder(res.orderNo);
        setOrder(orderData);
        setStep('done');
      } else {
        // 真实支付：展示二维码或跳转收银台
        setStep('paying');
        // 启动 30 分钟倒计时
        const deadlineMs = Date.now() + MAX_POLL_DURATION;
        setCountdown(Math.ceil(MAX_POLL_DURATION / 1000));
        countdownTimerRef.current = setInterval(() => {
          const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
          setCountdown(remaining);
          if (remaining <= 0 && countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
        }, 1000);
        // 开始轮询等待支付完成
        startPolling(res.orderNo);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败');
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  if (!product) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  return (
    <>
      <Navbar />

      <div className="container">
        {step === 'form' && (
          <div className="checkout-box">
            <h2 style={{ textAlign: 'center', margin: 'var(--space-xl) 0' }}>确认购买</h2>

            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: 'var(--font-size-base)' }}>{product.name}</h3>
              <div className="product-price" style={{ marginTop: 'var(--space-sm)' }}>
                <span className="price-current" style={{ fontSize: 'var(--font-size-xl)' }}>
                  ¥{product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="price-original">¥{product.originalPrice.toFixed(2)}</span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>接收邮箱 *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="输入您的邮箱，用于接收账号信息"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>支付方式</label>
                <div className="payment-methods">
                  <button
                    type="button"
                    className={`payment-btn ${payMethod === 'wechat' ? 'selected' : ''}`}
                    onClick={() => setPayMethod('wechat')}
                  >
                    💚 微信支付
                  </button>
                </div>
              </div>

              <div className="order-summary">
                <span style={{ color: 'var(--color-text-secondary)' }}>应付金额</span>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-accent)' }}>
                  ¥{product.price.toFixed(2)}
                </span>
              </div>

              {error && <div className="message message-error">{error}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={loading || !email}
              >
                {loading ? <span className="spinner" /> : '确认支付'}
              </button>
            </form>
          </div>
        )}

        {step === 'paying' && paymentInfo && (
          <div className="checkout-box" style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-lg)' }}>
            {paymentInfo.isMock ? (
              /* Mock 模式的加载状态 */
              <>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, marginBottom: 'var(--space-lg)' }} />
                <h2>支付处理中...</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}>
                  请稍候，正在处理订单
                </p>
              </>
            ) : (
              /* 真实支付：显示二维码 + 轮询等待 */
              <>
                <h2 style={{ marginBottom: 'var(--space-md)' }}>📱 请使用微信扫码支付</h2>

                <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>商品</span>
                    <span>{paymentInfo.productName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>金额</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>¥{paymentInfo.amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* 支付区域：移动端直接跳转，PC 端扫码 */}
                {(() => {
                  // NOTE: 移动端不显示二维码（微信禁止从相册扫码支付），直接提供跳转按钮
                  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
                  if (!isMobile && paymentInfo.qrcodeUrl) {
                    return (
                      <div style={{
                        background: '#fff',
                        padding: 'var(--space-lg)',
                        borderRadius: 'var(--radius-lg)',
                        display: 'inline-block',
                        margin: 'var(--space-md) auto',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                      }}>
                        <img
                          src={paymentInfo.qrcodeUrl}
                          alt="微信支付二维码"
                          style={{ width: 220, height: 220, display: 'block' }}
                        />
                      </div>
                    );
                  }
                  return (
                    <a
                      href={paymentInfo.payUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-lg"
                      style={{ display: 'inline-block', marginTop: 'var(--space-md)', fontSize: '1.1rem', padding: '14px 48px' }}
                    >
                      前往支付
                    </a>
                  );
                })()}

                <div style={{ marginTop: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      等待支付完成...支付成功后将自动跳转
                    </span>
                  </div>
                  {countdown > 0 && (
                    <span style={{
                      color: countdown < 300 ? 'var(--color-danger, #e74c3c)' : 'var(--color-text-muted)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'monospace'
                    }}>
                      剩余支付时间：{String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>

                <p style={{
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--font-size-xs)',
                  marginTop: 'var(--space-lg)'
                }}>
                  订单号：{paymentInfo.orderNo}
                </p>
              </>
            )}
          </div>
        )}

        {step === 'done' && order && (
          <div className="order-result">
            <div className="message message-success" style={{ textAlign: 'center', fontSize: 'var(--font-size-base)' }}>
              🎉 购买成功！账号信息已发送至 {order.buyerEmail}
            </div>

            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>订单详情</h3>

              <div className="info-row">
                <span className="info-label">订单号</span>
                <span style={{ fontFamily: 'monospace' }}>{order.orderNo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">商品</span>
                <span>{order.productName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">金额</span>
                <span>¥{order.amount.toFixed(2)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">状态</span>
                <span className="badge badge-success">{ORDER_STATUS_MAP[order.status] || order.status}</span>
              </div>
              <div className="info-row">
                <span className="info-label">质保截止</span>
                <span>{order.warrantyExpiresAt ? new Date(order.warrantyExpiresAt).toLocaleDateString('zh-CN') : '-'}</span>
              </div>
            </div>

            {(order.cardContent || order.fileUrl) && (
              <div className="card-reveal" style={{ marginTop: 'var(--space-md)' }}>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                  您的交付内容（请妥善保管）：
                </p>
                {order.cardContent && (
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    <code>{order.cardContent}</code>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 'var(--space-sm)', marginLeft: 'var(--space-sm)' }}
                      onClick={() => {
                        navigator.clipboard.writeText(order.cardContent || '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
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

            <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
                请保存好订单号，可随时在"订单查询"页面查看
              </p>
              <Link to="/" className="btn btn-secondary">返回首页</Link>
            </div>
          </div>
        )}

        {step === 'expired' && (
          <div className="order-result" style={{ textAlign: 'center' }}>
            <div className="message" style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              color: '#e74c3c',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--font-size-base)'
            }}>
              ⏰ 订单已过期
            </div>
            <p style={{ color: 'var(--color-text-secondary)', margin: 'var(--space-lg) 0', fontSize: 'var(--font-size-sm)' }}>
              支付超时（30 分钟），订单已自动取消。如果您已付款但未到账，请通过订单查询页面检查状态。
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => { setStep('form'); setPaymentInfo(null); setError(''); }}
              >
                重新下单
              </button>
              <Link to="/order" className="btn btn-secondary">订单查询</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default CheckoutPage;
