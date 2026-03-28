/**
 * 服务预约页面
 * 用户可以选择服务类型并提交预约请求
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitBooking } from '../services/api';
import Navbar from '../components/Navbar';
import CustomSelect from '../components/CustomSelect';

/** 可预约的服务类型列表 */
const SERVICE_TYPES = [
  'AI 工具咨询',
  'PPT 定制',
  '代码开发',
  '技术支持',
  '数字会员服务',
  '其他服务',
];

function BookingPage() {
  const [form, setForm] = useState({
    contact: '',
    serviceType: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  /**
   * 更新表单字段
   * 使用计算属性名动态设置对应字段
   */
  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  /** 提交预约表单 */
  const handleSubmit = async () => {
    // 基础校验
    if (!form.contact.trim()) {
      setError('请输入联系方式');
      return;
    }
    if (!form.serviceType) {
      setError('请选择服务类型');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await submitBooking(form);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="booking-form">
          {success ? (
            // 提交成功提示
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0' }}>
              <div style={{ fontSize: '64px', marginBottom: 'var(--space-lg)' }}>✅</div>
              <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-md)' }}>
                预约提交成功！
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: 1.8 }}>
                我们已收到您的预约请求，会尽快通过您留下的联系方式与您取得联系。
                <br />请保持通讯畅通，感谢您的信任！
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
                <Link to="/" className="btn btn-secondary">返回首页</Link>
                <button className="btn btn-primary" onClick={() => { setSuccess(false); setForm({ contact: '', serviceType: '', description: '' }); }}>
                  继续预约
                </button>
              </div>
            </div>
          ) : (
            // 预约表单
            <>
              <h2 style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-sm)' }}>
                📋 服务预约
              </h2>
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-xl)' }}>
                请填写以下信息，我们将尽快与您联系确认服务详情
              </p>

              {error && (
                <div className="message message-error">{error}</div>
              )}

              <div className="card" style={{ padding: 'var(--space-xl)' }}>
                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)' }}>
                    联系方式 <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="微信号 / 手机号 / 邮箱"
                    value={form.contact}
                    onChange={e => handleChange('contact', e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)' }}>
                    服务类型 <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <CustomSelect
                    options={SERVICE_TYPES.map(type => ({ value: type, label: type }))}
                    value={form.serviceType}
                    onChange={(val) => handleChange('serviceType', val)}
                    placeholder="请选择服务类型"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)' }}>
                    需求描述
                  </label>
                  <textarea
                    className="input"
                    placeholder="请简要描述您的需求，以便我们更好地为您服务"
                    value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                    rows={4}
                  />
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? '提交中...' : '提交预约'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <p>© 2026 The66Shop · 一站式数字服务平台</p>
        </div>
      </footer>
    </>
  );
}

export default BookingPage;
