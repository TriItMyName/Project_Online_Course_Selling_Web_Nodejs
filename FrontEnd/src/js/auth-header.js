(function () {
  if (typeof window.fetch !== 'function' || window.__authHeaderFetchPatched) {
    return;
  }

  const API_BASE_FALLBACK = 'http://localhost:3000';
  const EXCLUDED_PATH_PREFIXES = [
    '/api/auth/users/checklogin',
    '/api/auth/register',
  ];

  function getApiBase() {
    const configuredBase = String(
      window.API_BASE_URL || localStorage.getItem('apiBaseUrl') || API_BASE_FALLBACK
    ).trim();
    return configuredBase || API_BASE_FALLBACK;
  }

  function getStoredAuthHeader() {
    const explicitHeader = String(localStorage.getItem('authHeader') || '').trim();
    if (explicitHeader) {
      return explicitHeader;
    }

    const token = String(localStorage.getItem('authToken') || '').trim();
    if (!token) {
      return '';
    }

    const expiresAt = Number(localStorage.getItem('authTokenExpiresAt') || 0);
    if (expiresAt && Date.now() >= expiresAt) {
      return '';
    }

    const tokenType = String(localStorage.getItem('authTokenType') || 'Bearer').trim() || 'Bearer';
    return `${tokenType} ${token}`;
  }

  function isExcludedApiPath(pathname) {
    return EXCLUDED_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
  }

  function shouldAttachAuthHeader(url) {
    try {
      const requestUrl = new URL(url, window.location.origin);
      const apiBaseUrl = new URL(getApiBase(), window.location.origin);

      if (requestUrl.origin !== apiBaseUrl.origin) {
        return false;
      }

      if (!requestUrl.pathname.startsWith('/api/')) {
        return false;
      }

      if (isExcludedApiPath(requestUrl.pathname)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.__authHeaderFetchPatched = true;

  window.fetch = function (input, init = {}) {
    const requestUrl = typeof input === 'string' ? input : String(input?.url || '');
    if (!shouldAttachAuthHeader(requestUrl)) {
      return nativeFetch(input, init);
    }

    const authHeader = getStoredAuthHeader();
    if (!authHeader) {
      return nativeFetch(input, init);
    }

    const nextInit = { ...init };
    const incomingHeaders = nextInit.headers || (input instanceof Request ? input.headers : undefined);
    const headers = new Headers(incomingHeaders);

    if (!headers.has('Authorization')) {
      headers.set('Authorization', authHeader);
    }

    nextInit.headers = headers;
    return nativeFetch(input, nextInit);
  };
})();