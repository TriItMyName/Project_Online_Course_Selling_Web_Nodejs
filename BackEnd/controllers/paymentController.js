const crypto = require('crypto');
const { getBaseUrl } = require('../utils/media');
const db = require('../config/db');
const withTransaction = db.withTransaction;
const { emitOrderCreated, emitOrderUpdated } = require('../utils/socket');

let enrollmentColumnsCache = null;

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function httpError(status, message) {
  const err = new Error(message || 'Request khong hop le.');
  err.status = status;
  return err;
}

function isBlank(value) {
  return value == null || String(value).trim() === '';
}

function defaultIfBlank(value, fallback) {
  return isBlank(value) ? fallback : String(value).trim();
}

function safeTimingEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function buildRawSignature(entries) {
  return entries.map(([key, value]) => `${key}=${value}`).join('&');
}

function signHmacSha256(rawData, secretKey) {
  return crypto.createHmac('sha256', String(secretKey || '')).update(String(rawData || '')).digest('hex');
}

function uniqueNumberList(list) {
  return Array.from(
    new Set((Array.isArray(list) ? list : []).map((x) => toNumber(x)).filter((x) => Number.isInteger(x) && x > 0))
  );
}

function generateSeed() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return crypto.randomBytes(16).toString('hex');
}

function buildMomoOrderId(orderId, requestSeed, partnerCode) {
  const safePartner = defaultIfBlank(partnerCode, 'MOMO').replace(/[^A-Za-z0-9_]/g, '').toUpperCase() || 'MOMO';
  let suffix = defaultIfBlank(requestSeed, generateSeed());
  if (suffix.length > 12) {
    suffix = suffix.slice(-12);
  }
  return `${safePartner}_${orderId}_${suffix}`;
}

function limitNotePart(value, maxLength) {
  const text = defaultIfBlank(value, '');
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength);
}

function buildOrderNotes({ momoOrderId, requestId, status, resultCode, transId }) {
  const parts = [
    'provider=MOMO',
    `momoOrderId=${limitNotePart(momoOrderId, 48)}`,
    `requestId=${limitNotePart(requestId, 48)}`,
    `status=${limitNotePart(status, 16)}`,
  ];

  if (resultCode !== undefined && resultCode !== null && !isNaN(Number(resultCode))) {
    parts.push(`resultCode=${Number(resultCode)}`);
  }
  if (!isBlank(transId)) {
    parts.push(`transId=${limitNotePart(transId, 40)}`);
  }

  return parts.join(';');
}

function extractNoteValue(notes, key) {
  if (isBlank(notes) || isBlank(key)) {
    return null;
  }
  const prefix = `${key}=`;
  const chunks = String(notes).split(/[;\r\n]+/);
  for (const chunk of chunks) {
    const text = chunk.trim();
    if (text.startsWith(prefix)) {
      return text.slice(prefix.length);
    }
  }
  return null;
}

function amountMatches(orderTotalAmount, callbackAmount) {
  const dbAmount = toNumber(orderTotalAmount, NaN);
  const cbAmount = toNumber(callbackAmount, NaN);
  if (!Number.isFinite(dbAmount) || !Number.isFinite(cbAmount)) {
    return false;
  }
  return Math.abs(dbAmount - cbAmount) < 0.0001;
}

function getMomoConfig(req) {
  let frontendBase = '';
  const originOrReferer = defaultIfBlank(req.get('origin') || req.get('referer'), '');
  if (!isBlank(originOrReferer)) {
    try {
      frontendBase = new URL(originOrReferer).origin;
    } catch {
      frontendBase = String(originOrReferer).replace(/\/$/, '');
    }
  }

  const redirectUrl = process.env.MOMO_REDIRECT_URL
    || (frontendBase ? `${frontendBase}/payment-result.html` : 'http://localhost:5000/payment-result.html');

  return {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl,
    ipnUrl: process.env.MOMO_IPN_URL || `${getBaseUrl(req)}/api/payment/momo/ipn`,
    requestType: process.env.MOMO_REQUEST_TYPE || 'payWithMethod',
    lang: process.env.MOMO_LANG || 'vi',
    orderInfoPrefix: process.env.MOMO_ORDER_INFO_PREFIX || 'Thanh toan khoa hoc',
  };
}

function buildOrderInfo(inputOrderInfo, config, courses) {
  if (!isBlank(inputOrderInfo)) {
    return String(inputOrderInfo).trim();
  }

  if (courses.length === 1) {
    return `${config.orderInfoPrefix}: ${courses[0].CourseName}`;
  }
  return `${config.orderInfoPrefix}: ${courses.length} khoa hoc`;
}

async function ensureUserExists(conn, userId) {
  const [rows] = await conn.query('SELECT UserID FROM users WHERE UserID = ? LIMIT 1', [userId]);
  if (!rows.length) {
    throw httpError(404, 'Khong tim thay nguoi dung.');
  }
}

async function loadCourses(conn, courseIds) {
  if (!courseIds.length) {
    return [];
  }

  const placeholders = courseIds.map(() => '?').join(', ');
  const [rows] = await conn.query(
    `SELECT CourseID, CourseName, price
     FROM courses
     WHERE CourseID IN (${placeholders})`,
    courseIds
  );

  if (rows.length !== courseIds.length) {
    throw httpError(400, 'Co khoa hoc khong ton tai hoac da bi xoa.');
  }

  const byId = new Map(rows.map((row) => [toNumber(row.CourseID), row]));
  return courseIds.map((id) => byId.get(id));
}

async function ensureCoursesNotPurchased(conn, userId, courseIds) {
  if (!courseIds.length) {
    return;
  }

  const placeholders = courseIds.map(() => '?').join(', ');
  const [rows] = await conn.query(
    `SELECT CourseID
     FROM enrollment
     WHERE UserID = ? AND CourseID IN (${placeholders})`,
    [userId, ...courseIds]
  );

  if (rows.length) {
    const owned = rows.map((row) => toNumber(row.CourseID)).filter(Boolean);
    throw httpError(409, `Nguoi dung da so huu khoa hoc: ${owned.join(', ')}`);
  }
}

async function insertOrderDetails(conn, orderId, courseIds) {
  for (const courseId of courseIds) {
    await conn.query('INSERT INTO order_details (OrderID, CourseID) VALUES (?, ?)', [orderId, courseId]);
  }
}

async function updateOrderStatus(conn, orderId, status, notes) {
  await conn.query('UPDATE orders SET Status = ?, Notes = ? WHERE OrderID = ?', [status, notes, orderId]);
}

async function resolveOrderByMomoOrderId(conn, momoOrderId) {
  if (isBlank(momoOrderId)) {
    return null;
  }

  const [rows] = await conn.query(
    `SELECT *
     FROM orders
     WHERE Notes LIKE ?
     ORDER BY OrderID DESC
     LIMIT 1`,
    [`%momoOrderId=${momoOrderId}%`]
  );

  return rows[0] || null;
}

async function getEnrollmentColumns(conn) {
  if (enrollmentColumnsCache) {
    return enrollmentColumnsCache;
  }

  const [rows] = await conn.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'enrollment'`
  );

  const columns = new Set((rows || []).map((row) => String(row.COLUMN_NAME || '').toLowerCase()));
  enrollmentColumnsCache = columns;
  return columns;
}

function hasEnrollmentColumn(columns, columnName) {
  return columns.has(String(columnName || '').toLowerCase());
}

function buildEnrollmentInsertStatement(columns, userId, courseId) {
  const insertColumns = [];
  const insertValues = [];
  const params = [];

  if (hasEnrollmentColumn(columns, 'UserID')) {
    insertColumns.push('UserID');
    insertValues.push('?');
    params.push(userId);
  }

  if (hasEnrollmentColumn(columns, 'CourseID')) {
    insertColumns.push('CourseID');
    insertValues.push('?');
    params.push(courseId);
  }

  if (hasEnrollmentColumn(columns, 'EnrollmentDate')) {
    insertColumns.push('EnrollmentDate');
    insertValues.push('NOW()');
  }

  if (hasEnrollmentColumn(columns, 'CompletionStatus')) {
    insertColumns.push('CompletionStatus');
    insertValues.push('?');
    params.push('Not Started');
  }

  if (hasEnrollmentColumn(columns, 'SumPrice')) {
    insertColumns.push('SumPrice');
    insertValues.push('?');
    params.push(0);
  }

  if (hasEnrollmentColumn(columns, 'CurrentLessonID')) {
    insertColumns.push('CurrentLessonID');
    insertValues.push('?');
    params.push(null);
  }

  if (insertColumns.length < 2) {
    throw new Error('Bang enrollment thieu cot UserID/CourseID de tao du lieu dang ky hoc.');
  }

  return {
    sql: `INSERT INTO enrollment (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')})`,
    params,
  };
}

async function activateEnrollmentsForOrder(conn, orderId) {
  const [orderRows] = await conn.query('SELECT UserID FROM orders WHERE OrderID = ? LIMIT 1', [orderId]);
  if (!orderRows.length) {
    return;
  }

  const userId = toNumber(orderRows[0].UserID);
  const [detailRows] = await conn.query('SELECT CourseID FROM order_details WHERE OrderID = ?', [orderId]);
  if (!detailRows.length) {
    return;
  }

  const enrollmentColumns = await getEnrollmentColumns(conn);

  for (const detail of detailRows) {
    const courseId = toNumber(detail.CourseID);
    const [existing] = await conn.query(
      'SELECT 1 FROM enrollment WHERE UserID = ? AND CourseID = ? LIMIT 1',
      [userId, courseId]
    );

    if (existing.length) {
      continue;
    }

    const enrollmentInsert = buildEnrollmentInsertStatement(enrollmentColumns, userId, courseId);
    await conn.query(enrollmentInsert.sql, enrollmentInsert.params);
  }
}

async function requestMomoCreatePayment(config, requestBody) {
  if (typeof fetch !== 'function') {
    throw httpError(500, 'Runtime NodeJS hien tai khong ho tro fetch de goi MoMo API.');
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || rawText || `MoMo API tra ve HTTP ${response.status}`;
    throw httpError(502, message);
  }

  if (!payload || typeof payload !== 'object') {
    throw httpError(502, 'Phan hoi tu MoMo khong hop le.');
  }

  return payload;
}

function normalizeCallbackData(callbackData, config) {
  const normalized = {};
  const source = callbackData || {};

  Object.keys(source).forEach((key) => {
    const raw = source[key];
    normalized[key] = raw == null ? '' : String(raw);
  });

  normalized.partnerCode = defaultIfBlank(normalized.partnerCode, config.partnerCode);
  normalized.accessKey = defaultIfBlank(normalized.accessKey, config.accessKey);
  normalized.extraData = defaultIfBlank(normalized.extraData, '');
  normalized.orderType = defaultIfBlank(normalized.orderType, config.requestType);
  normalized.payType = defaultIfBlank(normalized.payType, 'qr');
  normalized.message = defaultIfBlank(normalized.message, '');
  normalized.responseTime = defaultIfBlank(normalized.responseTime, String(Date.now()));
  normalized.resultCode = defaultIfBlank(normalized.resultCode, '0');
  normalized.transId = defaultIfBlank(normalized.transId, '');
  normalized.requestId = defaultIfBlank(normalized.requestId, '');
  normalized.orderId = defaultIfBlank(normalized.orderId, '');
  normalized.orderInfo = defaultIfBlank(normalized.orderInfo, '');
  normalized.amount = defaultIfBlank(normalized.amount, '0');
  normalized.signature = defaultIfBlank(normalized.signature, '');

  return normalized;
}

function isValidCallbackSignature(values, config) {
  if (isBlank(values.signature)) {
    return false;
  }

  const fields = [
    ['accessKey', values.accessKey],
    ['amount', values.amount],
    ['extraData', values.extraData],
    ['message', values.message],
    ['orderId', values.orderId],
    ['orderInfo', values.orderInfo],
    ['orderType', values.orderType],
    ['partnerCode', config.partnerCode],
    ['payType', values.payType],
    ['requestId', values.requestId],
    ['responseTime', values.responseTime],
    ['resultCode', values.resultCode],
    ['transId', values.transId],
  ];

  const rawHash = buildRawSignature(fields);
  const expectedSignature = signHmacSha256(rawHash, config.secretKey);
  return safeTimingEqual(expectedSignature, values.signature);
}

function validateCallbackAgainstOrder(orderRow, callbackValues) {
  const notes = orderRow.Notes || orderRow.notes || '';
  const storedRequestId = extractNoteValue(notes, 'requestId');

  if (!isBlank(storedRequestId) && !isBlank(callbackValues.requestId) && storedRequestId !== callbackValues.requestId) {
    return 'requestId callback khong khop voi don hang.';
  }

  const orderAmount = orderRow.TotalAmount ?? orderRow.total_amount;
  if (!amountMatches(orderAmount, callbackValues.amount)) {
    return 'So tien callback khong khop voi don hang.';
  }

  return null;
}

function resolveIpnResultCode(callbackResult) {
  if (!callbackResult.validSignature) {
    return 97;
  }
  if (['NOT_FOUND', 'MISMATCHED_CALLBACK'].includes(String(callbackResult.status || '').toUpperCase())) {
    return 1;
  }
  return 0;
}

async function processMomoCallback(req, callbackData) {
  const config = getMomoConfig(req);
  const values = normalizeCallbackData(callbackData, config);

  const baseResponse = {
    status: 'FAILED',
    message: '',
    orderId: values.orderId,
    requestId: values.requestId,
    resultCode: toNumber(values.resultCode, -1),
    validSignature: false,
  };

  baseResponse.validSignature = isValidCallbackSignature(values, config);
  if (!baseResponse.validSignature) {
    baseResponse.status = 'INVALID_SIGNATURE';
    baseResponse.message = 'Chu ky callback MoMo khong hop le.';
    return baseResponse;
  }

  const callbackResult = await withTransaction(async (conn) => {
    const orderRow = await resolveOrderByMomoOrderId(conn, values.orderId);
    if (!orderRow) {
      return {
        ...baseResponse,
        status: 'NOT_FOUND',
        message: 'Khong tim thay don hang.',
      };
    }

    const internalOrderId = toNumber(orderRow.OrderID);
    const orderStatus = String(orderRow.Status || '').toUpperCase();
    const mismatchError = validateCallbackAgainstOrder(orderRow, values);

    if (mismatchError) {
      return {
        ...baseResponse,
        orderId: internalOrderId,
        status: 'MISMATCHED_CALLBACK',
        message: mismatchError,
      };
    }

    if (orderStatus === 'SUCCESS') {
      return {
        ...baseResponse,
        orderId: internalOrderId,
        status: 'SUCCESS',
        resultCode: 0,
        message: 'Don hang da duoc xac nhan truoc do.',
      };
    }

    const notes = orderRow.Notes || orderRow.notes || '';
    const momoOrderId = extractNoteValue(notes, 'momoOrderId') || values.orderId;

    if (String(values.resultCode) === '0') {
      const successNotes = buildOrderNotes({
        momoOrderId,
        requestId: values.requestId,
        status: 'SUCCESS',
        resultCode: 0,
        transId: values.transId,
      });

      await updateOrderStatus(conn, internalOrderId, 'SUCCESS', successNotes);
      await activateEnrollmentsForOrder(conn, internalOrderId);

      return {
        ...baseResponse,
        orderId: internalOrderId,
        status: 'SUCCESS',
        resultCode: 0,
        message: defaultIfBlank(values.message, 'Thanh toan thanh cong va da kich hoat khoa hoc.'),
      };
    }

    const failedNotes = buildOrderNotes({
      momoOrderId,
      requestId: values.requestId,
      status: 'FAILED',
      resultCode: toNumber(values.resultCode, -1),
      transId: values.transId,
    });
    await updateOrderStatus(conn, internalOrderId, 'FAILED', failedNotes);

    return {
      ...baseResponse,
      orderId: internalOrderId,
      status: 'FAILED',
      message: defaultIfBlank(values.message, 'Thanh toan that bai.'),
    };
  });

  const internalOrderId = Number(callbackResult?.orderId);
  const normalizedStatus = String(callbackResult?.status || '').toUpperCase();
  if (Number.isInteger(internalOrderId) && internalOrderId > 0 && (normalizedStatus === 'SUCCESS' || normalizedStatus === 'FAILED')) {
    emitOrderUpdated({
      id: internalOrderId,
      status: normalizedStatus,
      message: callbackResult?.message || '',
    });
  }

  return callbackResult;
}

exports.createMomoPayment = async (req, res, next) => {
  try {
    const config = getMomoConfig(req);
    const userId = toNumber(req.body.userId || req.body.UserID);
    const courseIds = uniqueNumberList(req.body.courseIds);
    const requestedAmount = req.body.amount;
    const extraData = defaultIfBlank(req.body.extraData, '');

    if (!userId || !courseIds.length) {
      return res.status(400).json({ message: 'userId va courseIds la bat buoc.' });
    }

    const createdOrder = await withTransaction(async (conn) => {
      await ensureUserExists(conn, userId);

      const courses = await loadCourses(conn, courseIds);
      await ensureCoursesNotPurchased(conn, userId, courseIds);

      const totalAmount = courses.reduce((sum, course) => sum + toNumber(course.price), 0);
      const requested = toNumber(requestedAmount, totalAmount);
      if (Math.abs(requested - totalAmount) >= 0.0001) {
        throw httpError(400, 'So tien gui len khong khop tong gia khoa hoc.');
      }

      const [orderResult] = await conn.query(
        'INSERT INTO orders (UserID, OrderDate, TotalAmount, Status, Notes) VALUES (?, NOW(), ?, ?, ?)',
        [userId, totalAmount, 'PENDING', 'provider=MOMO;status=PENDING']
      );

      const dbOrderId = toNumber(orderResult.insertId);
      const requestSeed = generateSeed();
      const momoOrderId = buildMomoOrderId(dbOrderId, requestSeed, config.partnerCode);
      const requestId = momoOrderId;

      const pendingNotes = buildOrderNotes({
        momoOrderId,
        requestId,
        status: 'PENDING',
      });

      await updateOrderStatus(conn, dbOrderId, 'PENDING', pendingNotes);
      await insertOrderDetails(conn, dbOrderId, courseIds);

      return {
        dbOrderId,
        momoOrderId,
        requestId,
        totalAmount,
        courses,
      };
    });

    emitOrderCreated({
      id: createdOrder.dbOrderId,
      status: 'PENDING',
      totalAmount: createdOrder.totalAmount,
      user: { id: userId },
      source: 'MOMO',
    });

    const orderInfo = buildOrderInfo(req.body.orderInfo, config, createdOrder.courses);

    const signatureFields = [
      ['accessKey', config.accessKey],
      ['amount', String(Math.round(createdOrder.totalAmount))],
      ['extraData', extraData],
      ['ipnUrl', config.ipnUrl],
      ['orderId', createdOrder.momoOrderId],
      ['orderInfo', orderInfo],
      ['partnerCode', config.partnerCode],
      ['redirectUrl', config.redirectUrl],
      ['requestId', createdOrder.requestId],
      ['requestType', config.requestType],
    ];

    const rawHash = buildRawSignature(signatureFields);
    const signature = signHmacSha256(rawHash, config.secretKey);

    const requestBody = {
      partnerCode: config.partnerCode,
      partnerName: 'BackEnd',
      storeId: 'BackEndStore',
      requestId: createdOrder.requestId,
      amount: Math.round(createdOrder.totalAmount),
      orderId: createdOrder.momoOrderId,
      orderInfo,
      redirectUrl: config.redirectUrl,
      ipnUrl: config.ipnUrl,
      lang: config.lang,
      requestType: config.requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    let momoResponse = null;
    try {
      momoResponse = await requestMomoCreatePayment(config, requestBody);
    } catch (gatewayError) {
      await withTransaction(async (conn) => {
        const failedNotes = buildOrderNotes({
          momoOrderId: createdOrder.momoOrderId,
          requestId: createdOrder.requestId,
          status: 'FAILED',
          resultCode: -1,
        });
        await updateOrderStatus(conn, createdOrder.dbOrderId, 'FAILED', failedNotes);
      });
      emitOrderUpdated({
        id: createdOrder.dbOrderId,
        status: 'FAILED',
        source: 'MOMO',
      });
      throw gatewayError;
    }

    const resultCode = toNumber(momoResponse.resultCode, -1);
    const payUrl = momoResponse.payUrl || '';
    const deeplink = momoResponse.deeplink || '';
    const qrCodeUrl = momoResponse.qrCodeUrl || '';

    if (resultCode !== 0 || (isBlank(payUrl) && isBlank(deeplink) && isBlank(qrCodeUrl))) {
      await withTransaction(async (conn) => {
        const failedNotes = buildOrderNotes({
          momoOrderId: createdOrder.momoOrderId,
          requestId: createdOrder.requestId,
          status: 'FAILED',
          resultCode,
        });
        await updateOrderStatus(conn, createdOrder.dbOrderId, 'FAILED', failedNotes);
      });

      emitOrderUpdated({
        id: createdOrder.dbOrderId,
        status: 'FAILED',
        source: 'MOMO',
      });

      return res.status(502).json({
        message: defaultIfBlank(momoResponse.message, 'Khong the khoi tao thanh toan MoMo.'),
      });
    }

    return res.json({
      message: defaultIfBlank(momoResponse.message, 'Tao giao dich MoMo thanh cong.'),
      payUrl,
      deeplink,
      qrCodeUrl,
      orderId: createdOrder.dbOrderId,
      requestId: createdOrder.requestId,
      momoOrderId: createdOrder.momoOrderId,
      amount: Math.round(createdOrder.totalAmount),
      status: 'PENDING',
      resultCode,
      callbackUrl: `${getBaseUrl(req)}/api/payment/momo/callback`,
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    const message = error?.message || 'Khong the khoi tao thanh toan MoMo!';
    if (status >= 500) {
      console.error(error);
    }
    return res.status(status).json({ message });
  }
};

exports.momoCallback = async (req, res, next) => {
  try {
    const callbackResult = await processMomoCallback(req, req.query);
    return res.json({
      ...callbackResult,
      callbackUrl: `${getBaseUrl(req)}/api/payment/momo/callback`,
    });
  } catch (error) {
    return next(error);
  }
};

exports.momoIpn = async (req, res, next) => {
  try {
    const callbackResult = await processMomoCallback(req, req.body || {});
    const config = getMomoConfig(req);

    return res.json({
      partnerCode: config.partnerCode,
      orderId: callbackResult.orderId,
      requestId: callbackResult.requestId,
      resultCode: resolveIpnResultCode(callbackResult),
      message: callbackResult.message,
      status: callbackResult.status,
    });
  } catch (error) {
    return next(error);
  }
};
