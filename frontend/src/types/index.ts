/**
 * 全局类型定义
 * 与后端 API 响应结构保持一致
 */

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;
  isActive: boolean;
  warrantyDays: number;
  warrantyTimes: number;
  createdAt: string | null;
  stockCount: number;
}

export interface Order {
  id: number;
  orderNo: string;
  productId: number;
  productName: string;
  cardId: number | null;
  cardContent: string | null;
  buyerEmail: string;
  amount: number;
  status: string;
  paymentMethod: string;
  deliveredAt: string | null;
  warrantyExpiresAt: string | null;
  warrantyUsed: boolean;
  createdAt: string | null;
}

export interface Card {
  id: number;
  productId: number;
  content: string;
  status: string;
  quarantineUntil: string | null;
  createdAt: string | null;
  soldAt: string | null;
}

export interface WarrantyClaim {
  id: number;
  orderId: number;
  orderNo: string;
  oldCardId: number;
  newCardId: number;
  newCardContent: string;
  reason: string;
  createdAt: string | null;
}

export interface DashboardData {
  totalRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  todayOrders: number;
  totalCards: number;
  availableCards: number;
  quarantineCards: number;
  soldCards: number;
  warrantyClaimsCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderRequest {
  productId: number;
  buyerEmail: string;
  paymentMethod: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderNo: string;
  amount: number;
  productName: string;
  payUrl: string;
  /** PC 端二维码图片链接 */
  qrcodeUrl?: string;
  /** 是否为 mock 模式（未配置真实支付时） */
  isMock?: boolean;
  message: string;
}

/** 订单状态中文映射 */
export const ORDER_STATUS_MAP: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  delivered: '已发货',
  warranty_claimed: '已换新',
  completed: '已完成',
  cancelled: '已取消',
};

/** 商品信息状态中文映射 */
export const CARD_STATUS_MAP: Record<string, string> = {
  quarantine: '隔离中',
  available: '可用',
  sold: '已售',
  replaced: '已换新',
};

/** 服务预约 */
export interface Booking {
  id: number;
  name: string;
  contact: string;
  serviceType: string;
  description: string;
  preferredTime: string;
  status: string;
  adminNote: string;
  createdAt: string | null;
}

export interface CreateBookingRequest {
  name: string;
  contact: string;
  serviceType: string;
  description: string;
  preferredTime: string;
}

/** 预约状态中文映射 */
export const BOOKING_STATUS_MAP: Record<string, string> = {
  pending: '待处理',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消',
};
