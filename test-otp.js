const http = require('http');

async function test() {
  const email = 'otptest@example.com';
  const password = 'Password123!';

  // 1. Send OTP
  console.log("Sending OTP for Registration...");
  const sendRes = await fetch('http://localhost:3000/api/v1/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, intent: 'register' })
  });
  const sendData = await sendRes.json();
  console.log(sendData);
}

test();
