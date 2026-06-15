export interface PermissionItem {
  key: string
  name: string
  desc: string
  module: string
  category: string
}

export interface ModuleInfo {
  id: string
  name: string
  desc: string
  pages: { name: string; path: string }[]
}
