const MAILERLITE_API_URL = 'https://connect.mailerlite.com/api/subscribers';
const NEWSLETTER_GROUP_ID = process.env.NEWSLETTER_GROUP_ID || '192957224553809655';

const json = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
};

const getRequestIp = (request) => {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.socket?.remoteAddress;
};

const formatMailerLiteDate = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

const getBody = (request) => {
  if (!request.body) return {};
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body);
    } catch (error) {
      return {};
    }
  }

  return request.body;
};

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { ok: false, message: 'Method not allowed.' });
  }

  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!apiKey || !NEWSLETTER_GROUP_ID) {
    return json(response, 500, {
      ok: false,
      message: 'Newsletter signup is not configured yet.'
    });
  }

  const { name, email } = getBody(request);
  const firstName = typeof name === 'string' ? name.trim() : '';
  const emailAddress = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!firstName || !emailAddress) {
    return json(response, 400, {
      ok: false,
      message: 'Please enter your first name and email address.'
    });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailAddress)) {
    return json(response, 400, {
      ok: false,
      message: 'Please enter a valid email address.'
    });
  }

  const requestIp = getRequestIp(request);
  const payload = {
    email: emailAddress,
    fields: {
      name: firstName
    },
    groups: [NEWSLETTER_GROUP_ID],
    opted_in_at: formatMailerLiteDate(new Date())
  };

  if (requestIp) {
    payload.optin_ip = requestIp;
  }

  try {
    const mailerLiteResponse = await fetch(MAILERLITE_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!mailerLiteResponse.ok) {
      return json(response, 502, {
        ok: false,
        message: 'MailerLite could not accept the signup right now.'
      });
    }

    return json(response, 200, { ok: true });
  } catch (error) {
    return json(response, 502, {
      ok: false,
      message: 'MailerLite could not be reached right now.'
    });
  }
};
