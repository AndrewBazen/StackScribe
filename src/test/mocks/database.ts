import { vi } from "vitest";

// Mock database instance
export const mockDb = {
  execute: vi.fn(() => Promise.resolve()),
  select: vi.fn(() => Promise.resolve([] as unknown[])),
};

// Helper to mock select query results
export function mockSelectResult<T>(result: T[]) {
  mockDb.select.mockResolvedValueOnce(result as unknown[]);
}

// Helper to mock execute to succeed
export function mockExecuteSuccess() {
  mockDb.execute.mockResolvedValueOnce(undefined);
}

// Helper to mock execute to fail
export function mockExecuteError(error: string) {
  mockDb.execute.mockRejectedValueOnce(new Error(error));
}

// Reset database mocks
export function resetDbMocks() {
  mockDb.execute.mockReset();
  mockDb.select.mockReset();
  mockDb.execute.mockImplementation(() => Promise.resolve());
  mockDb.select.mockImplementation(() => Promise.resolve([]));
}
