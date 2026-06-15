import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    storeId: string;
    storeName?: string;
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
      storeId: string;
      storeName?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: string;
    storeId: string;
    storeName?: string;
  }
}
