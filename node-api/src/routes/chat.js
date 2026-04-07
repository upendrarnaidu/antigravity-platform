const Redis = require('ioredis');

const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function chatRoutes(fastify, options) {
  // 1. Get History
  fastify.get('/api/v1/chat/sessions', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await fastify.db.query(
        'SELECT id, title, created_at FROM chat_sessions WHERE user_id = $1 AND archived = false ORDER BY created_at DESC', 
        [request.user.user_id]
      );
      return result.rows;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  fastify.get('/api/v1/chat/sessions/:id/messages', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await fastify.db.query(
        'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
        [request.params.id]
      );
      return result.rows;
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // 2. Server-Sent Events Chat Stream (Scale ready)
  fastify.post('/api/v1/chat/message', { 
    preValidation: [fastify.authenticate],
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    const { message, sessionId: incomingSessionId } = request.body;
    if (!message || message.length > 4000) {
      return reply.status(400).send({ error: 'Payload exceeds max sequence length for chat.' });
    }
    
    let sessionId = incomingSessionId;
    const userId = request.user.user_id;

    // Validate tokens immediately
    const userRes = await fastify.db.query('SELECT token_balance FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0 || userRes.rows[0].token_balance <= 0) {
      return reply.status(402).send({ error: 'Insufficient tokens. Please recharge your account.' });
    }

    if (!sessionId) {
      const newSession = await fastify.db.query(
        'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id',
        [userId, message.substring(0, 50) + "..."]
      );
      sessionId = newSession.rows[0].id;
    }

    await fastify.db.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)', [sessionId, 'user', message]);

    const historyRes = await fastify.db.query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    // Queue Event completely asynchronously via Kafka
    try {
      await fastify.kafkaProducer.send({
        topic: 'chat_requests',
        messages: [{
          key: userId.toString(),
          value: JSON.stringify({
            session_id: sessionId,
            user_id: userId,
            message: message,
            history: historyRes.rows.slice(0, -1)
          })
        }]
      });
    } catch (err) {
      fastify.log.error('Kafka Error', err);
      return reply.status(500).send({ error: 'Failed to queue message' });
    }

    // Configure HTTP Stream
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    reply.raw.write(`data: ${JSON.stringify({ type: 'session_id', sessionId })}\n\n`);

    const channel = `chat_updates:${sessionId}`;
    const tempSub = subClient.duplicate();
    tempSub.subscribe(channel);

    let fullOutput = "";

    tempSub.on('message', async (chan, msg) => {
      if (chan === channel) {
        const payload = JSON.parse(msg);
        
        if (payload.type === 'chunk') {
          if (payload.content) fullOutput += payload.content;
          reply.raw.write(`data: ${msg}\n\n`);
        } else if (payload.type === 'done') {
          reply.raw.write(`data: ${msg}\n\n`);
          
          tempSub.unsubscribe(channel);
          tempSub.quit();
          reply.raw.end();
          
          const totalTokens = payload.total_tokens || 0;
          try {
            // Save Output and Log metrics asynchronously
            await fastify.db.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)', [sessionId, 'assistant', fullOutput]);
            await fastify.db.query('UPDATE users SET token_balance = token_balance - $1 WHERE id = $2', [totalTokens, userId]);
            await fastify.db.query('INSERT INTO token_usage_history (user_id, session_id, model, tokens_used) VALUES ($1, $2, $3, $4)', [userId, sessionId, 'chat-manager-team', totalTokens]);
          } catch (dbErr) {
             fastify.log.error('Save Error', dbErr);
          }
        }
      }
    });

    request.raw.on('close', () => {
      tempSub.unsubscribe(channel);
      tempSub.quit();
    });

    return reply;
  });
}

module.exports = chatRoutes;
