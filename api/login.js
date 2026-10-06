import { createClient } from '@supabase/supabase-js';

let authClient;

function getAuthClient() {
  const url = process.env.SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error('SERVER_CONFIGURATION_ERROR');
  }

  if (!authClient) {
    authClient = createClient(
      url,
      publishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return authClient;
}

function readJsonBody(req) {
  if (
    req.body
    && typeof req.body === 'object'
    && !Array.isArray(req.body)
  ) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
    });
  }

  const body = readJsonBody(req);

  if (!body) {
    return res.status(400).json({
      error: 'INVALID_JSON',
    });
  }

  const email =
    typeof body.email === 'string'
      ? body.email.trim()
      : '';

  const password =
    typeof body.password === 'string'
      ? body.password
      : '';

  if (!email || !password) {
    return res.status(400).json({
      error: 'EMAIL_AND_PASSWORD_REQUIRED',
    });
  }

  let supabase;

  try {
    supabase = getAuthClient();
  } catch {
    return res.status(500).json({
      error: 'SERVER_CONFIGURATION_ERROR',
    });
  }

  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (
    error
    || !data.session?.access_token
    || !data.user
  ) {
    return res.status(401).json({
      error: 'LOGIN_FAILED',
    });
  }

  return res.status(200).json({
    accessToken: data.session.access_token,
    user: {
      email: data.user.email ?? null,
    },
  });
}