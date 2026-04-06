function pickField(body, keys) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(body, key) && body[key] != null) {
            return body[key];
        }
    }
    return undefined;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pushError(req, message) {
    req.validationErrors = req.validationErrors || [];
    req.validationErrors.push(message);
}

function validatedResult(req, res, next) {
    const errors = req.validationErrors || [];
    if (errors.length) {
        return res.status(400).json({
            message: errors[0],
            errors,
        });
    }
    return next();
}

function validatePositiveIntParam(paramName, label = paramName) {
    return (req, res, next) => {
        const parsed = Number(req.params[paramName]);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return res.status(400).json({ message: `${label} khong hop le.` });
        }

        req.validated = req.validated || {};
        req.validated[paramName] = parsed;
        return next();
    };
}

const validateUserIdParam = validatePositiveIntParam('id', 'id');

function CreateUserValidator(req, _res, next) {
    req.validationErrors = [];

    const username = String(pickField(req.body, ['username', 'UserName']) || '').trim();
    const email = String(pickField(req.body, ['email', 'Email']) || '').trim().toLowerCase();
    const password = String(pickField(req.body, ['password', 'Password']) || '123456').trim();
    const status = String(pickField(req.body, ['status', 'Status']) || 'Hoat dong').trim();
    const roleName = String(pickField(req.body, ['role', 'RoleName']) || 'Student').trim();

    if (!username) {
        pushError(req, 'username la bat buoc.');
    }

    if (!email) {
        pushError(req, 'email la bat buoc.');
    } else if (!isValidEmail(email)) {
        pushError(req, 'email khong dung dinh dang.');
    }

    if (!password) {
        pushError(req, 'password khong duoc de trong.');
    }

    if (!status) {
        pushError(req, 'status khong duoc de trong.');
    }

    if (!roleName) {
        pushError(req, 'role khong duoc de trong.');
    }

    req.validated = req.validated || {};
    req.validated.body = {
        username,
        email,
        password,
        status,
        roleName,
    };

    return next();
}

function ModifyUserValidator(req, _res, next) {
    req.validationErrors = [];

    const payload = {};

    const rawUsername = pickField(req.body, ['username', 'UserName']);
    if (rawUsername != null) {
        const username = String(rawUsername).trim();
        if (!username) {
            pushError(req, 'username khong duoc de trong.');
        } else {
            payload.username = username;
        }
    }

    const rawEmail = pickField(req.body, ['email', 'Email']);
    if (rawEmail != null) {
        const email = String(rawEmail).trim().toLowerCase();
        if (!email || !isValidEmail(email)) {
            pushError(req, 'email khong dung dinh dang.');
        } else {
            payload.email = email;
        }
    }

    const rawPassword = pickField(req.body, ['password', 'Password']);
    if (rawPassword != null) {
        const password = String(rawPassword).trim();
        if (!password) {
            pushError(req, 'password khong duoc de trong.');
        } else {
            payload.password = password;
        }
    }

    const rawStatus = pickField(req.body, ['status', 'Status']);
    if (rawStatus != null) {
        const status = String(rawStatus).trim();
        if (!status) {
            pushError(req, 'status khong duoc de trong.');
        } else {
            payload.status = status;
        }
    }

    const rawRole = pickField(req.body, ['role', 'RoleName']);
    if (rawRole != null) {
        const roleName = String(rawRole).trim();
        if (!roleName) {
            pushError(req, 'role khong duoc de trong.');
        } else {
            payload.roleName = roleName;
        }
    }

    if (!Object.keys(payload).length) {
        pushError(req, 'Khong co du lieu de cap nhat.');
    }

    req.validated = req.validated || {};
    req.validated.body = payload;

    return next();
}

module.exports = {
    validatedResult,
    CreateUserValidator,
    ModifyUserValidator,
    validateUserIdParam,
    validatePositiveIntParam,
};
