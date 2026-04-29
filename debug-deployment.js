// Simple diagnostic script to check if the app loads
console.log('App loading test...');
console.log('React version:', React?.version);
console.log('Router available:', typeof RouterProvider !== 'undefined');

// Check if auth context loads
try {
  const auth = useAuth();
  console.log('Auth context loaded:', !!auth);
} catch (e) {
  console.error('Auth context error:', e);
}

// Check API connectivity
fetch('/api/health')
  .then(res => console.log('API health check:', res.status))
  .catch(err => console.error('API connection failed:', err));
