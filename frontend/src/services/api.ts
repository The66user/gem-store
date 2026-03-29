/**
 * API 服务层
 * 封装所有与后端的 HTTP 交互
 */
import type {
  Product, ProductType, Order, DashboardData,
  PaginatedResponse, Card, WarrantyClaim,
  CreateOrderRequest, CreateOrderResponse,
  Booking, CreateBookingRequest
} from '../types';

// NOTE: 生产环境使用相对路径（Nginx 反向代理 /api/ → backend）
// 开发环境通过 .env.development 设置 VITE_API_BASE=http://localhost:8001
const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * 通用请求方法
 * @param path API 路径
 * @param options fetch 配置
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ========== 公开 API ==========

/** 获取上架商品列表 */
export function fetchProducts(): Promise<Product[]> {
  return request('/api/products');
}

/** 获取商品类型列表（公开） */
export function fetchProductTypes(): Promise<ProductType[]> {
  return request('/api/product-types');
}

/** 获取商品详情 */
export function fetchProduct(id: number): Promise<Product> {
  return request(`/api/products/${id}`);
}

/** 创建订单 */
export function createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  return request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 模拟支付 */
export function mockPay(orderNo: string): Promise<{ success: boolean; message: string; orderNo: string }> {
  return request(`/api/orders/${orderNo}/mock-pay`, { method: 'POST' });
}

/** 查询订单 */
export function queryOrder(orderNo: string): Promise<Order> {
  return request(`/api/orders/${orderNo}`);
}

/** 查询订单支付状态（前端轮询用） */
export function checkPaymentStatus(orderNo: string): Promise<{
  orderNo: string;
  status: string;
  paid: boolean;
}> {
  return request(`/api/orders/${orderNo}/payment-status`);
}

/** 根据邮箱查询订单列表 */
export function queryOrdersByEmail(email: string): Promise<Order[]> {
  return request(`/api/orders?email=${encodeURIComponent(email)}`);
}

/** 申请质保换新 */
export function claimWarranty(orderNo: string, reason: string): Promise<{ success: boolean; message: string }> {
  return request(`/api/warranty/${orderNo}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ========== 管理员 API ==========

/** 管理员登录 */
export async function adminLogin(username: string, password: string): Promise<string> {
  const data = await request<{ accessToken: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('admin_token', data.accessToken);
  return data.accessToken;
}

/** 管理员登出 */
export function adminLogout(): void {
  localStorage.removeItem('admin_token');
}

/** 获取仪表盘数据 */
export function fetchDashboard(): Promise<DashboardData> {
  return request('/api/admin/dashboard');
}

/** 获取商品类型列表（管理端，含 id/sortOrder） */
export function fetchAdminProductTypes(): Promise<ProductType[]> {
  return request('/api/admin/product-types');
}

/** 创建商品类型 */
export function createProductType(data: Partial<ProductType>): Promise<{ message: string }> {
  return request('/api/admin/product-types', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 更新商品类型 */
export function updateProductType(id: number, data: Partial<ProductType>): Promise<{ message: string }> {
  return request(`/api/admin/product-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** 删除商品类型 */
export function deleteProductType(id: number): Promise<{ message: string }> {
  return request(`/api/admin/product-types/${id}`, {
    method: 'DELETE',
  });
}

/** 获取所有商品（管理端） */
export function fetchAdminProducts(): Promise<Product[]> {
  return request('/api/admin/products');
}

/** 创建商品 */
export function createProduct(data: Partial<Product>): Promise<{ message: string }> {
  return request('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 更新商品 */
export function updateProduct(id: number, data: Partial<Product>): Promise<{ message: string }> {
  return request(`/api/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 上传图片文件
 * NOTE: 不走通用 request，因为需要 FormData（非 JSON）
 */
export async function uploadImage(file: File): Promise<{ url: string; filename: string; size: number }> {
  const token = localStorage.getItem('admin_token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '上传失败' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * 上传交付文件（文档、资料等）
 * NOTE: 文件保存到 /uploads/files/ 目录
 */
export async function uploadDeliveryFile(file: File): Promise<{ url: string; filename: string; originalName: string; size: number }> {
  const token = localStorage.getItem('admin_token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/admin/upload-file`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: '上传失败' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/** 导入文件类型交付内容 */
export function importFileCard(productId: number, fileUrl: string): Promise<{ message: string }> {
  return request('/api/admin/cards/import-file', {
    method: 'POST',
    body: JSON.stringify({ productId, fileUrl }),
  });
}

/** 批量导入卡密 */
export function importCards(productId: number, cards: string[]): Promise<{ message: string }> {
  return request('/api/admin/cards/import', {
    method: 'POST',
    body: JSON.stringify({ productId, cards }),
  });
}

/** 获取卡密列表 */
export function fetchCards(params?: {
  productId?: number; status?: string; page?: number; pageSize?: number
}): Promise<PaginatedResponse<Card>> {
  const query = new URLSearchParams();
  if (params?.productId) query.set('productId', String(params.productId));
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return request(`/api/admin/cards?${query}`);
}

/** 获取订单列表（管理端） */
export function fetchOrders(params?: {
  status?: string; page?: number; pageSize?: number
}): Promise<PaginatedResponse<Order>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return request(`/api/admin/orders?${query}`);
}

/** 获取售后记录 */
export function fetchWarrantyClaims(params?: {
  page?: number; pageSize?: number
}): Promise<PaginatedResponse<WarrantyClaim>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return request(`/api/admin/warranty-claims?${query}`);
}

// ========== 服务预约 API ==========

/** 提交服务预约（公开） */
export function submitBooking(data: CreateBookingRequest): Promise<{ success: boolean; bookingId: number; message: string }> {
  return request('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 获取预约列表（管理端） */
export function fetchBookings(params?: {
  status?: string; page?: number; pageSize?: number
}): Promise<PaginatedResponse<Booking>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return request(`/api/admin/bookings?${query}`);
}

/** 更新预约状态（管理端） */
export function updateBookingStatus(id: number, data: { status?: string; adminNote?: string }): Promise<{ message: string }> {
  return request(`/api/admin/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
