const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key';

async function authRoutes(fastify, options) {
  
  // 1. Send OTP (For both Registration and OTP-Login)
  fastify.post('/api/v1/auth/otp/send', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
  }, async (request, reply) => {
    const { email, intent } = request.body; // intent: 'register' | 'login'
    if (!email || email.length > 100) {
      return reply.status(400).send({ error: 'Invalid email' });
    }

    try {
      const existingUser = await fastify.db.query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (intent === 'register' && existingUser.rows.length > 0) {
        return reply.status(409).send({ error: 'Email already registered' });
      }
      if (intent === 'login' && existingUser.rows.length === 0) {
        return reply.status(404).send({ error: 'Email not found' });
      }

      // Generate 6-digit PIN
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in DB
      await fastify.db.query(
        'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')',
        [email, code]
      );

      // Simulate sending via Email/SMS
      fastify.log.info(`\n\n================================\n🔐 SIMULATED OTP EMAIL FOR: ${email}\n📍 CODE: ${code}\n================================\n`);

      return { message: 'OTP sent successfully' };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to generate OTP' });
    }
  });

  // 2. Register (With Mandatory OTP)
  fastify.post('/api/v1/auth/register', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
  }, async (request, reply) => {
    const { email, password, code } = request.body;
    if (!email || !password || !code || password.length < 8) {
      return reply.status(400).send({ error: 'Missing required fields or invalid password bounds' });
    }

    try {
      // Validate OTP
      const otpResult = await fastify.db.query(
        'SELECT id FROM otp_codes WHERE email = $1 AND code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [email, code]
      );
      if (otpResult.rows.length === 0) {
        return reply.status(401).send({ error: 'Invalid or expired OTP code' });
      }

      // Delete OTP records for this email
      await fastify.db.query('DELETE FROM otp_codes WHERE email = $1', [email]);

      // Check user again just in case
      const existingUser = await fastify.db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return reply.status(409).send({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert User
      const userResult = await fastify.db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, tier',
        [email, passwordHash]
      );
      const user = userResult.rows[0];

      // Create workspace
      const workspaceName = `${email.split('@')[0]}'s Workspace`;
      const workspaceResult = await fastify.db.query(
        'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id',
        [workspaceName, user.id]
      );
      const workspace = workspaceResult.rows[0];

      // JWT
      const token = jwt.sign(
        { user_id: user.id, email, workspace_id: workspace.id, tier: user.tier }, 
        JWT_SECRET, { expiresIn: '7d' }
      );

      return { token, user_id: user.id, workspace_id: workspace.id, message: 'Registration successful' };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error during registration' });
    }
  });

  // 3. Login (Classic Password)
  fastify.post('/api/v1/auth/login', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
  }, async (request, reply) => {
    const { email, password } = request.body;
    if (!email || !password) return reply.status(400).send({ error: 'Missing credentials' });

    try {
      const userResult = await fastify.db.query('SELECT id, password_hash, tier FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) return reply.status(401).send({ error: 'Invalid email or password' });
      
      const user = userResult.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return reply.status(401).send({ error: 'Invalid email or password' });

      const workspaceResult = await fastify.db.query('SELECT id FROM workspaces WHERE owner_id = $1 LIMIT 1', [user.id]);
      const workspace_id = workspaceResult.rows.length > 0 ? workspaceResult.rows[0].id : null;

      const token = jwt.sign(
        { user_id: user.id, email, workspace_id, tier: user.tier }, 
        JWT_SECRET, { expiresIn: '7d' }
      );
      return { token, user_id: user.id, workspace_id, message: 'Login successful' };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal Server Error during login' });
    }
  });

  // 4. Login (Via OTP Verify)
  fastify.post('/api/v1/auth/login-with-otp', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
  }, async (request, reply) => {
    const { email, code } = request.body;
    if (!email || !code) return reply.status(400).send({ error: 'Missing credentials' });

    try {
      const otpResult = await fastify.db.query(
        'SELECT id FROM otp_codes WHERE email = $1 AND code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [email, code]
      );
      if (otpResult.rows.length === 0) return reply.status(401).send({ error: 'Invalid or expired OTP code' });

      await fastify.db.query('DELETE FROM otp_codes WHERE email = $1', [email]);

      const userResult = await fastify.db.query('SELECT id, tier FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) return reply.status(404).send({ error: 'User mapping not found' });
      const user = userResult.rows[0];

      const workspaceResult = await fastify.db.query('SELECT id FROM workspaces WHERE owner_id = $1 LIMIT 1', [user.id]);
      const workspace_id = workspaceResult.rows.length > 0 ? workspaceResult.rows[0].id : null;

      const token = jwt.sign(
        { user_id: user.id, email, workspace_id, tier: user.tier }, 
        JWT_SECRET, { expiresIn: '7d' }
      );
      return { token, user_id: user.id, workspace_id, message: 'OTP Login successful' };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Internal server error during OTP login' });
    }
  });

}

module.exports = authRoutes;
