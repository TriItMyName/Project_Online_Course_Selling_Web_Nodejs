function getBaseUrl(req) {
  const host = req.get('host') || `localhost:${process.env.PORT || 3000}`;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

function encodePathSegments(pathValue) {
  return String(pathValue || '')
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function normalizeImageUrl(req, value) {
  const normalizedRaw = String(value || '').trim().replace(/\\/g, '/');
  if (!normalizedRaw) {
    return '';
  }
  if (/^https?:\/\//i.test(normalizedRaw)) {
    return normalizedRaw;
  }
  const filePart = normalizedRaw.includes('src/assets/img/')
    ? normalizedRaw.split('src/assets/img/')[1]
    : normalizedRaw
      .replace(/^\/+/, '')
      .replace(/^images\//, '');
  return `${getBaseUrl(req)}/images/${encodePathSegments(filePart)}`;
}

function normalizeVideoUrl(req, value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  const fileName = raw.split(/[\\/]/).pop();
  return `${getBaseUrl(req)}/videos/${encodeURIComponent(fileName)}`;
}

module.exports = {
  getBaseUrl,
  normalizeImageUrl,
  normalizeVideoUrl,
};
