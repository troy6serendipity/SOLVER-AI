import os from "os";
import path from "path";

// 测试期间把本地文件存储根目录重定向到系统临时目录，
// 避免 src/lib/storage/local-adapter.ts 在导入初始化时污染项目目录。
process.env.STORAGE_ROOT = path.join(os.tmpdir(), "solver-ai-test-storage");

import '@testing-library/jest-dom';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Auth.js
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
  })),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    // 各模型的mock会在具体测试中定义
  },
}));
