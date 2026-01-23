import { vi } from 'vitest';

// Re-export mocked Tauri functions for direct use in tests
export const mockInvoke = vi.fn();
export const mockListen = vi.fn(() => Promise.resolve(() => {}));
export const mockEmit = vi.fn();

// Helper to set up invoke mock responses
export function mockInvokeResponse(command: string, response: unknown) {
  mockInvoke.mockImplementation((cmd: string) => {
    if (cmd === command) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unexpected command: ${cmd}`));
  });
}

// Helper to set up multiple invoke responses
export function mockInvokeResponses(responses: Record<string, unknown>) {
  mockInvoke.mockImplementation((cmd: string) => {
    if (cmd in responses) {
      return Promise.resolve(responses[cmd]);
    }
    return Promise.reject(new Error(`Unexpected command: ${cmd}`));
  });
}

// Helper to mock invoke to throw an error
export function mockInvokeError(command: string, error: string) {
  mockInvoke.mockImplementation((cmd: string) => {
    if (cmd === command) {
      return Promise.reject(new Error(error));
    }
    return Promise.reject(new Error(`Unexpected command: ${cmd}`));
  });
}

// Reset all mocks
export function resetTauriMocks() {
  mockInvoke.mockReset();
  mockListen.mockReset();
  mockEmit.mockReset();
  mockListen.mockImplementation(() => Promise.resolve(() => {}));
}
