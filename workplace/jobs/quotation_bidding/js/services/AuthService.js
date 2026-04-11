function checkRegistrationAvailability(payload) {
    const input = sanitizeObject_(payload);
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const normalizedUsername = normalizeUsername_(input.username);
    const normalizedEmail = String(input.email || '').trim().toLowerCase();

    const usernameExists = normalizedUsername
        ? usersTable.rows.some(function (row) { return normalizeUsername_(row.username) === normalizedUsername; })
        : false;
    const emailExists = normalizedEmail
        ? usersTable.rows.some(function (row) { return String(row.email || '').trim().toLowerCase() === normalizedEmail; })
        : false;

    return {
        ok: true,
        usernameAvailable: normalizedUsername ? !usernameExists : true,
        emailAvailable: normalizedEmail ? !emailExists : true,
        usernameMessage: normalizedUsername
            ? (usernameExists ? 'This username is already in use.' : 'This username is available.')
            : '',
        emailMessage: normalizedEmail
            ? (emailExists ? 'This email is already in use.' : 'This email is available.')
            : ''
    };
}

function registerVendor(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['username', 'password', 'displayName', 'vendorName', 'email']);

    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const normalizedUsername = normalizeUsername_(input.username);
    const normalizedEmail = String(input.email || '').trim().toLowerCase();

    if (usersTable.rows.some(function (row) { return normalizeUsername_(row.username) === normalizedUsername; })) {
        throw new Error('Username already exists.');
    }
    if (usersTable.rows.some(function (row) { return String(row.email || '').trim().toLowerCase() === normalizedEmail; })) {
        throw new Error('Email already exists.');
    }

    const now = nowIso_();
    const row = {
        userId: generateId_('USR'),
        role: 'vendor',
        username: normalizedUsername,
        passwordHash: hashPassword_(input.password),
        displayName: String(input.displayName || '').trim(),
        vendorName: String(input.vendorName || '').trim(),
        vendorCode: createVendorCode_(input.vendorName),
        email: normalizedEmail,
        vendorSheetUrl: '',
        isActive: 'FALSE',
        mustChangePassword: 'FALSE',
        lastLoginAt: '',
        createdAt: now,
        updatedAt: now
    };

    appendRows_(APP_CONFIG.sheets.users.name, [row]);
    appendActivity_({
        actorUserId: row.userId,
        actorRole: 'vendor',
        action: 'REGISTER',
        entityType: 'USER',
        entityId: row.userId,
        detailJson: JSON.stringify({ username: row.username, email: row.email })
    });

    try {
        sendAdminRegistrationNotification_(row);
    } catch (error) {
        Logger.log('Registration notification failed: ' + error);
    }

    return {
        ok: true,
        message: 'Registration submitted. Please wait for admin approval before login.'
    };
}

function loginUser(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['username', 'password']);
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const username = normalizeUsername_(input.username);
    const rowInfo = findRowByField_(usersTable, 'username', username);
    if (!rowInfo) {
        throw new Error('Invalid username or password.');
    }

    const user = rowInfo.row;
    if (String(user.isActive).toUpperCase() !== 'TRUE') {
        throw new Error('This account is not active yet. Please contact admin.');
    }
    if (!verifyPassword_(input.password, user.passwordHash)) {
        throw new Error('Invalid username or password.');
    }

    const sessionToken = createSessionToken_(user);

    return {
        ok: true,
        token: sessionToken,
        role: user.role,
        user: sanitizeUser_(user)
    };
}

function finalizeLoginSession(token) {
    const session = requireSession_(token);
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const rowInfo = findRowByField_(usersTable, 'userId', session.userId);
    if (!rowInfo) {
        throw new Error('User not found.');
    }

    const now = nowIso_();
    updateRowByIndex_(APP_CONFIG.sheets.users.name, rowInfo.rowIndex, {
        lastLoginAt: now,
        updatedAt: now
    });

    appendActivity_({
        actorUserId: session.userId,
        actorRole: session.role,
        action: 'LOGIN',
        entityType: 'SESSION',
        entityId: session.userId,
        detailJson: JSON.stringify({ username: session.username })
    });

    return {
        ok: true,
        user: sanitizeUser_(Object.assign({}, rowInfo.row, {
            lastLoginAt: now,
            updatedAt: now
        }))
    };
}

function requestPasswordReset(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['email']);
    const email = String(input.email || '').trim().toLowerCase();
    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const rowInfo = usersTable.rows
        .map(function (row, index) { return { row: row, rowIndex: index + 2 }; })
        .find(function (entry) {
            return String(entry.row.email || '').trim().toLowerCase() === email;
        });

    if (!rowInfo) {
        throw new Error('This email address was not found in the system.');
    }

    const user = rowInfo.row;
    const otp = generateOtp_();
    const now = nowIso_();
    const expiresAt = new Date(Date.now() + APP_CONFIG.otpMinutes * 60 * 1000).toISOString();

    appendRows_(APP_CONFIG.sheets.passwordResets.name, [{
        resetId: generateId_('RST'),
        userId: user.userId,
        username: user.username,
        email: user.email,
        otpHash: hashPassword_(otp),
        expiresAt: expiresAt,
        usedAt: '',
        createdAt: now
    }]);

    MailApp.sendEmail({
        to: user.email,
        subject: APP_CONFIG.appName + ' password reset OTP',
        htmlBody: [
            '<div style="font-family:Arial,sans-serif;line-height:1.6">',
            '<h2 style="color:#20B2AA">Password Reset OTP</h2>',
            '<p>Your one-time password is:</p>',
            '<p style="font-size:24px;font-weight:bold;letter-spacing:4px">' + otp + '</p>',
            '<p>This code expires in ' + APP_CONFIG.otpMinutes + ' minutes.</p>',
            '</div>'
        ].join('')
    });

    appendActivity_({
        actorUserId: user.userId,
        actorRole: user.role,
        action: 'REQUEST_PASSWORD_RESET',
        entityType: 'USER',
        entityId: user.userId,
        detailJson: JSON.stringify({ email: user.email })
    });

    return {
        ok: true,
        message: 'OTP has been sent to your registered email address.'
    };
}

function verifyPasswordResetOtp(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['email', 'otp']);

    const candidate = findLatestPasswordResetRequest_(String(input.email || '').trim().toLowerCase());
    validatePasswordResetOtp_(candidate, input.otp);

    return {
        ok: true,
        message: 'OTP verified successfully.'
    };
}

function resetPasswordWithOtp(payload) {
    const input = sanitizeObject_(payload);
    validateRequired_(input, ['email', 'otp', 'newPassword']);

    const candidate = findLatestPasswordResetRequest_(String(input.email || '').trim().toLowerCase());
    validatePasswordResetOtp_(candidate, input.otp);

    const usersTable = getTable_(APP_CONFIG.sheets.users.name);
    const userRow = findRowByField_(usersTable, 'userId', candidate.row.userId);
    if (!userRow) {
        throw new Error('User not found.');
    }

    const now = nowIso_();
    updateRowByIndex_(APP_CONFIG.sheets.users.name, userRow.rowIndex, {
        passwordHash: hashPassword_(input.newPassword),
        mustChangePassword: 'FALSE',
        updatedAt: now
    });
    updateRowByIndex_(APP_CONFIG.sheets.passwordResets.name, candidate.rowIndex, {
        usedAt: now
    });

    appendActivity_({
        actorUserId: userRow.row.userId,
        actorRole: userRow.row.role,
        action: 'RESET_PASSWORD',
        entityType: 'USER',
        entityId: userRow.row.userId,
        detailJson: JSON.stringify({ username: userRow.row.username })
    });

    return { ok: true };
}

function findLatestPasswordResetRequest_(email) {
    const resetTable = getTable_(APP_CONFIG.sheets.passwordResets.name);
    const candidate = resetTable.rows
        .map(function (row, index) { return { row: row, rowIndex: index + 2 }; })
        .filter(function (entry) {
            return String(entry.row.email || '').trim().toLowerCase() === email && !entry.row.usedAt;
        })
        .sort(function (left, right) { return String(right.row.createdAt).localeCompare(String(left.row.createdAt)); })[0];

    if (!candidate) {
        throw new Error('OTP not found or already used.');
    }

    return candidate;
}

function validatePasswordResetOtp_(candidate, otp) {
    if (new Date(candidate.row.expiresAt).getTime() < Date.now()) {
        throw new Error('OTP has expired.');
    }
    if (!verifyPassword_(otp, candidate.row.otpHash)) {
        throw new Error('OTP is incorrect.');
    }
}
