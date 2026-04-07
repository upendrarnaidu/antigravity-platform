const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// Pricing mapping (Source of Truth)
const PRICING = {
  pro: {
    INR: 199900, // in paise
    USD: 2900,   // in cents
    GBP: 2500,   // in pence
    EUR: 2700,
  },
  enterprise: {
    INR: 499900,
    USD: 9900,
    GBP: 8500,
    EUR: 8900,
  },
  topup: {
    INR: 120000,
    USD: 1900,
    GBP: 1500,
    EUR: 1700,
  }
};

async function razorpayRoutes(fastify, options) {
  // Create Order
  fastify.post('/api/v1/razorpay/create-order', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { tier, currency = 'USD' } = request.body;
    
    if (!tier || !PRICING[tier]) {
      return reply.status(400).send({ error: 'Invalid tier specified' });
    }

    const amount = PRICING[tier][currency] || PRICING[tier]['USD'];
    const options = {
      amount: amount,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: request.user.user_id,
        tier: tier
      }
    };

    try {
      const order = await razorpay.orders.create(options);
      return { 
        orderId: order.id, 
        amount: order.amount, 
        currency: order.currency 
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to create Razorpay order' });
    }
  });

  // Verify Payment
  fastify.post('/api/v1/razorpay/verify-payment', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      tier
    } = request.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return reply.status(400).send({ error: 'Invalid signature. Payment verification failed.' });
    }

    // signature is valid, update the user in DB
    const userId = request.user.user_id;
    
    try {
        if (tier === 'topup') {
          await fastify.db.query(
            `UPDATE users SET token_balance = token_balance + 250000 WHERE id = $1`, 
            [userId]
          );
          fastify.log.info(`User ${userId} topped up tokens.`);
        } else {
          await fastify.db.query(
            `UPDATE users 
             SET tier = $1, 
                 subscription_status = 'active',
                 token_balance = token_balance + 100000
             WHERE id = $2`,
            [tier, userId]
          );
          fastify.log.info(`Updated user ${userId} to tier ${tier}`);
        }
        
        return { success: true, message: 'Payment verified and account updated' };
    } catch (dbErr) {
      fastify.log.error('Database error on payment verification:', dbErr);
      return reply.status(500).send({ error: 'Payment verified but failed to update internal record' });
    }
  });
}

module.exports = razorpayRoutes;
