/**
 * 首页 — 多品类数字会员服务订阅平台
 * NOTE: 页面措辞需符合虎皮椒合规要求，不得出现"发卡/卡密/自动发货"等字样
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProducts } from '../services/api';
import type { Product } from '../types';
import Navbar from '../components/Navbar';

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar showAnchorLinks />

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>
            <span className="accent">The66Shop</span>
            <br />
            你的一站式数字服务平台
          </h1>
          <p>
            AI 工具订阅 · PPT 定制 · 代码帮助 · 数字会员 — 我们提供多元化的数字服务，满足你的各种需求。
          </p>
          <a href="#products" className="btn btn-primary btn-lg">
            浏览服务 ↓
          </a>
        </div>
      </section>

      {/* 平台优势 */}
      <section className="container" style={{ marginBottom: 'var(--space-3xl)' }}>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {[
            { icon: '🤖', title: 'AI 服务', desc: '各类 AI 工具订阅与会员服务，助力效率提升' },
            { icon: '🎨', title: '创意定制', desc: 'PPT 制作、设计排版等专业创意服务' },
            { icon: '💻', title: '技术支持', desc: '代码调试、技术咨询，解决你的编程难题' },
            { icon: '⚡', title: '极速交付', desc: '数字商品即买即得，定制服务高效响应' },
          ].map((f, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: 'var(--space-md)' }}>{f.icon}</div>
              <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-base)' }}>{f.title}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 关于我 */}
      <section id="about" className="container" style={{ marginBottom: 'var(--space-3xl)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>
          👋 关于我
        </h2>
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-xl)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <img src="/avatar.png" alt="头像" style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', marginBottom: 'var(--space-md)' }} />
            <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-sm)' }}>一个66用户</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              全栈开发者 · AI 爱好者 · 数字服务提供者
            </p>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 2, fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
            热衷于用技术解决实际问题，擅长 AI 工具集成、Web 全栈开发和自动化解决方案。
            <br />通过 The66Shop 为你提供各类数字服务，从 AI 工具咨询到代码开发，从 PPT 定制到技术支持，
            <br />致力于为每一位客户提供高效、专业的服务体验。
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--space-lg)' }}>
            {['Python', 'React', 'AI/LLM', 'FastAPI', 'TypeScript', '自动化'].map(skill => (
              <span key={skill} className="badge" style={{ background: 'var(--color-accent-glow)', color: 'var(--color-accent)', padding: '6px 14px' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 商品列表（预览） */}
      <section id="products" className="container">
        <h2 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>
          在售商品
        </h2>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>
              🚧 商品上架准备中
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              我们正在精选优质数字服务，敬请期待
            </p>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {products.slice(0, 4).map(product => (
                <div
                  key={product.id}
                  className="card card-glow product-card"
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {/* 商品图片 */}
                  <div className="product-card-image-wrap">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <div className="product-card-image-placeholder">🛍️</div>
                    )}
                  </div>

                  <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-sm)' }}>
                    {product.name}
                  </h3>

                  <div className="product-price">
                    <span className="price-current">¥{product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="price-original">¥{product.originalPrice.toFixed(2)}</span>
                    )}
                  </div>

                  <p className="product-stock">
                    {product.productType === 'service' ? (
                      <span className="badge badge-success">可预约</span>
                    ) : product.stockCount > 0 ? (
                      <span className="badge badge-success">库存充足</span>
                    ) : (
                      <span className="badge badge-danger">暂时缺货</span>
                    )}
                  </p>

                  <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: 'var(--space-md)',
                    lineHeight: 1.6
                  }}>
                    {product.description}
                  </p>

                  <div className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                    查看详情
                  </div>
                </div>
              ))}
            </div>

            {/* 查看全部商品链接 */}
            {products.length > 4 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
                <button
                  className="btn"
                  style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', padding: '10px 32px' }}
                  onClick={() => navigate('/products')}
                >
                  查看全部商品 →
                </button>
              </div>
            )}

            {/* 商品不足 4 个也显示链接 */}
            {products.length <= 4 && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
                <span
                  style={{ color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}
                  onClick={() => navigate('/products')}
                >
                  查看全部商品 →
                </span>
              </div>
            )}
          </>
        )}
      </section>

      {/* 购买流程 */}
      <section className="container" style={{ marginTop: 'var(--space-3xl)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>
          购买流程
        </h2>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {[
            { step: '01', title: '选择商品', desc: '浏览并选择您需要的数字服务' },
            { step: '02', title: '填写信息', desc: '输入接收邮箱，确认订单信息' },
            { step: '03', title: '完成支付', desc: '扫码支付后，商品即时交付' },
            { step: '04', title: '开始使用', desc: '查收邮件，按说明即可使用' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--color-accent)',
                marginBottom: 'var(--space-sm)'
              }}>
                {s.step}
              </div>
              <h4 style={{ marginBottom: 'var(--space-xs)', fontSize: 'var(--font-size-base)' }}>{s.title}</h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container" style={{ marginTop: 'var(--space-3xl)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>
          常见问题
        </h2>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {[
            { q: '购买后如何使用？', a: '支付成功后，系统会将商品信息发送至您填写的邮箱，按照邮件中的说明操作即可。' },
            { q: '有售后保障吗？', a: '有的。每件商品都有明确的质保期限，在质保期内遇到任何问题，我们都会及时为您处理。' },
            { q: '支付后多久能收到？', a: '付款完成后即时交付，商品信息会同步显示在订单页面并发送至您的邮箱。' },
            { q: '支持哪些支付方式？', a: '目前支持微信支付，扫码即可完成付款，安全便捷。' },
            { q: '如何查询订单？', a: '点击页面顶部的"订单查询"，输入您的订单号或邮箱即可查看订单详情。' },
          ].map((faq, i) => (
            <div key={i} className="card" style={{ marginBottom: 'var(--space-md)' }}>
              <h4 style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
                Q: {faq.q}
              </h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.8 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 联系方式 */}
      <section id="contact" className="container" style={{ marginTop: 'var(--space-3xl)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>
          📬 联系方式
        </h2>
        <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {[
            { icon: '💬', title: '微信', desc: '添加微信号沟通需求', detail: 'The66user' },
            { icon: '🐧', title: 'QQ', desc: '添加 QQ 好友咨询', detail: '1992146069' },
            { icon: '📅', title: '服务预约', desc: '在线提交预约申请', detail: '点击下方按钮预约' },
          ].map((c, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: 'var(--space-md)' }}>{c.icon}</div>
              <h3 style={{ marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-base)' }}>{c.title}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-sm)' }}>{c.desc}</p>
              <p style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{c.detail}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/booking')}>
            📋 立即预约服务
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2026 The66Shop · 一站式数字服务平台</p>
          <p style={{ marginTop: 'var(--space-xs)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
            AI 服务 · 创意定制 · 技术支持 · 数字会员 | 如有疑问请通过订单页面联系我们
          </p>
        </div>
      </footer>
    </>
  );
}

export default HomePage;
