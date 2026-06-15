export enum Permission {
  VIEW_ORDERS = "pos.orders_view",
  CREATE_ORDER = "POS_ACCESS",
  EDIT_ORDER = "POS_ACCESS",
  CANCEL_ORDER = "pos.orders_refund",

  VIEW_STOCK = "STOCK_ACCESS",
  EDIT_STOCK = "STOCK_ADJUSTMENT",

  VIEW_PAYROLL = "accounting.payroll_view",
  EDIT_PAYROLL = "accounting.payroll_generate",

  OPEN_SHIFT = "pos.shift_open",
  CLOSE_SHIFT = "pos.shift_close",

  REFUND_ORDER = "pos.orders_refund",
  MANAGE_USERS = "admin.users_manage",
  VIEW_REPORTS = "ANALYTICS_ACCESS",

  // Critical Financial / Operational Permissions
  OVERRIDE_PRICE = "pos.price_override",
  OVERRIDE_DISCOUNT = "pos.discounts",
  VOID_ORDER = "pos.void_order",
  DELETE_ORDER = "pos.delete_order",
  REOPEN_ORDER = "pos.reopen_order",

  EXPORT_REPORTS = "dashboard.export_pdf",
  VIEW_COST_PRICE = "stock.valuation",
  VIEW_MARGIN = "dashboard.margins"
}
