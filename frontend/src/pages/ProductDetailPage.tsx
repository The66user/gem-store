/**
 * 商品详情页
 * 展示商品完整信息，支持下单购买
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchProduct, createOrder, mockPay, checkPaymentStatus } from '../services/api';
import type { Product } from '../types';
import Navbar from '../components/Navbar';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 购买表单状态
  const [buyerEmail, setBuyerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    orderNo: string; payUrl: string; qrcodeUrl?: string; isMock?: boolean;
  } | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProduct(Number(id))
      .then(setProduct)
      .catch(() => setError('商品不存在'))
      .finally(() => setLoading(false));
  }, [id]);

  /** 提交订单 */
  const handleOrder = async () => {
    if (!product) return;
    if (!buyerEmail || !buyerEmail.includes('@')) {
      alert('请输入有效的邮箱地址');
      return;
    }
    setOrdering(true);
    try {
      const result = await createOrder({
        productId: product.id,
        buyerEmail,
        paymentMethod,
      });
      setOrderResult(result);

      // mock 模式直接模拟支付
      if (result.isMock) {
        await mockPay(result.orderNo);
        setPaySuccess(true);
      } else {
        // 真实支付：打开支付链接 + 轮询状态
        window.open(result.payUrl, '_blank');
        pollPaymentStatus(result.orderNo);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '下单失败');
    } finally {
      setOrdering(false);
    }
  };

  /** 轮询支付状态 */
  const pollPaymentStatus = (orderNo: string) => {
    let attempts = 0;
    const maxAttempts = 60;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const status = await checkPaymentStatus(orderNo);
        if (status.paid) {
          clearInterval(interval);
          setPaySuccess(true);
        }
      } catch { /* 忽略轮询错误 */ }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 3000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
        <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>😔 {error || '商品不存在'}</p>
        <Link to="/products" className="btn btn-primary">返回商品列表</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar />

      <section className="container" style={{ paddingTop: 'var(--space-xl)', maxWidth: '800px' }}>
        {/* 面包屑 */}
        <div style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          <Link to="/products" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>全部商品</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span>{product.name}</span>
        </div>

        {/* 商品信息卡片 */}
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
            <h1 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>{product.name}</h1>
            {product.productType === 'service' && (
              <span className="badge" style={{ background: 'var(--color-accent)', color: '#fff' }}>服务类</span>
            )}
          </div>

          <div className="product-price" style={{ marginBottom: 'var(--space-md)' }}>
            <span className="price-current" style={{ fontSize: '28px' }}>¥{product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <span className="price-original" style={{ fontSize: '16px' }}>¥{product.originalPrice.toFixed(2)}</span>
            )}
          </div>

          {/* 商品标签 */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
            {product.productType === 'service' ? (
              <span className="badge badge-success">人工服务</span>
            ) : product.stockCount > 0 ? (
              <span className="badge badge-success">库存充足</span>
            ) : (
              <span className="badge badge-danger">暂时缺货</span>
            )}
            {product.productType === 'digital' && (
              <>
                <span className="badge">⚡ 自动发货</span>
                <span className="badge">🛡️ {product.warrantyDays}天质保</span>
              </>
            )}
          </div>

          {/* 商品简介 */}
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: 'var(--space-lg)' }}>
            {product.description}
          </p>

          {/* 商品详情 */}
          {product.detailDescription && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-md)' }}>📋 详细说明</h3>
              <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {product.detailDescription}
              </div>
            </div>
          )}
        </div>

        {/* 购买区域 */}
        {!paySuccess ? (
          <div className="card" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-lg)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-lg)' }}>
              {product.productType === 'service' ? '📋 预约下单' : '🛒 立即购买'}
            </h3>

            {orderResult ? (
              // 已创建订单，等待支付
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: 'var(--space-md)' }}>订单号：<strong>{orderResult.orderNo}</strong></p>
                {orderResult.qrcodeUrl && (
                  <img src={orderResult.qrcodeUrl} alt="支付二维码" style={{ width: '200px', margin: '0 auto var(--space-md)' }} />
                )}
                <p style={{ color: 'var(--color-text-secondary)' }}>请在支付页面完成付款，支付成功后将自动跳转</p>
                <div className="spinner" style={{ margin: 'var(--space-lg) auto' }} />
              </div>
            ) : (
              // 填写购买信息
              <div className="booking-form">
                <div>
                  <label className="input-label">邮箱地址 *</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="用于接收订单信息"
                    value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="input-label">支付方式</label>
                  <select
                    className="input"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                  >
                    <option value="wechat">微信支付</option>
                    <option value="alipay">支付宝</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleOrder}
                  disabled={ordering || (product.productType === 'digital' && product.stockCount <= 0)}
                  style={{ width: '100%', marginTop: 'var(--space-md)' }}
                >
                  {ordering ? '处理中...' : `支付 ¥${product.price.toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        ) : (
          // 支付成功
          <div className="card" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🎉</div>
            <h3 style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-md)' }}>
              {product.productType === 'service' ? '预约成功！' : '支付成功！'}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
              {product.productType === 'service'
                ? '我们会尽快联系您确认服务详情'
                : '卡密已发送至您的邮箱，请查收'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/order?orderNo=${orderResult?.orderNo}`)}>
                查看订单
              </button>
              <Link to="/products" className="btn" style={{ border: '1px solid var(--color-border)' }}>
                继续浏览
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
