// Runs before any test file — sets env vars before config.ts is imported.
process.env.NODE_ENV = "test";
process.env.PORT = "4001";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "anon-key-test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-test";
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-chars-long!!";
process.env.CORS_ORIGINS = "http://localhost:5173";
