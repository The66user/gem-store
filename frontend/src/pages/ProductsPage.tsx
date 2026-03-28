/**
 * 全部商品页面
 * 展示所有上架商品，支持查看详情
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../services/api';
import type { Product } from '../types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* 导航栏 */}
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="nav-brand" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="logo" style={{ height: '28px', marginRight: '8px' }} />
            <span>The66Shop</span>
          </Link>
          <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
            <Link to="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>首页</Link>
            <Link to="/products" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>全部商品</Link>
            <Link to="/booking" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>服务预约</Link>
            <Link to="/order" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 'var(--font-size-sm)' }}>订单查询</Link>
          </div>
        </div>
      </nav>

      {/* 商品列表 */}
      <section className="container" style={{ paddingTop: 'var(--space-xl)' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-lg)' }}>
          全部商品
        </h2>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>
              🚧 商品上架准备中
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map(product => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card card-glow product-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>
                      {product.name}
                    </h3>
                    {product.productType === 'service' && (
                      <span className="badge" style={{ background: 'var(--color-accent)', color: '#fff', fontSize: '11px' }}>服务</span>
                    )}
                  </div>

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

                  <div className="btn btn-primary" style={{ textAlign: 'center' }}>
                    查看详情
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
