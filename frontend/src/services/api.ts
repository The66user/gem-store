/**
 * API 服务层
 * 封装所有与后端的 HTTP 交互
 */
import type {
  Product, Order, DashboardData,
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
