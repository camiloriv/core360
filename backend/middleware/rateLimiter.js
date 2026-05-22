const failedAttempts = new Map(); // ip -> Array of timestamps (ms)

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const now = Date.now();
  const limitTime = 15 * 60 * 1000; // 15 minutes in ms
  const maxAttempts = 7;

  // Clean old attempts for this IP
  if (failedAttempts.has(ip)) {
    const attempts = failedAttempts.get(ip).filter(ts => now - ts < limitTime);
    failedAttempts.set(ip, attempts);

    if (attempts.length >= maxAttempts) {
      const oldestAttempt = attempts[0];
      const timeRemainingMs = limitTime - (now - oldestAttempt);
      const minutesRemaining = Math.ceil(timeRemainingMs / 60000);
      
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Su IP ha sido bloqueada temporalmente. Por favor, intente nuevamente en ${minutesRemaining} minuto(s).`
      });
    }
  }

  // Intercept the response JSON method to track if the login attempt fails
  const originalJson = res.json;
  res.json = function (data) {
    if (res.statusCode === 401) {
      if (!failedAttempts.has(ip)) {
        failedAttempts.set(ip, []);
      }
      failedAttempts.get(ip).push(Date.now());
    } else if (res.statusCode === 200 || res.statusCode === 201) {
      // If login succeeds, reset failed attempts for this IP
      failedAttempts.delete(ip);
    }
    return originalJson.apply(this, arguments);
  };

  next();
};

module.exports = rateLimiter;
