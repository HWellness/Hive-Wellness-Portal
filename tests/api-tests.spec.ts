import { test, expect } from '@playwright/test';

// API Testing without browser automation
test.describe('API Health Checks', () => {
  const baseURL = 'http://0.0.0.0:5000';

  test('should return 200 for chatbot endpoint', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/chatbot/chat`, {
      data: {
        message: 'Hello, I need help finding a therapist',
        sessionId: 'test-session-' + Date.now()
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('response');
  });

  test('should authenticate with valid demo credentials - client', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: 'client@demo.hive',
        password: 'demo123'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.user).toHaveProperty('role', 'client');
  });

  test('should authenticate with valid demo credentials - therapist', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: 'therapist@demo.hive',
        password: 'demo123'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.user).toHaveProperty('role', 'therapist');
  });

  test('should authenticate with valid demo credentials - admin', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: 'admin@demo.hive',
        password: 'demo123'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.user).toHaveProperty('role', 'admin');
  });

  test('should reject invalid credentials', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: 'invalid@demo.hive',
        password: 'wrongpassword'
      }
    });
    
    expect(response.status()).toBe(401);
  });

  test('should return session endpoint response', async ({ request }) => {
    // Check session endpoint (may be unauthenticated)
    const sessionResponse = await request.get(`${baseURL}/api/auth/session`);
    
    // Session endpoint should return a valid response
    expect([200, 302, 401]).toContain(sessionResponse.status());
  });
});
