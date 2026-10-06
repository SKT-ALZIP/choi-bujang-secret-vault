import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

let verifyLogin;
let supabase;

function getServerClients() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('SERVER_CONFIGURATION_ERROR');
  }

  if (!verifyLogin) {
    verifyLogin = createLoginVerifier({
      config,
      supabaseSecretKey: secretKey,
    });
  }

  if (!supabase) {
    supabase = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return {
    verifyLogin,
    supabase,
  };
}

async function readJsonBody(req) {
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

  let clients;

  try {
    clients = getServerClients();
  } catch {
    return res.status(500).json({
      error: 'SERVER_CONFIGURATION_ERROR',
    });
  }

  const login =
    await clients.verifyLogin(req.headers.authorization);

  if (!login) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
    });
  }

  if (req.method === 'GET') {
    const { data, error } = await clients.supabase
      .from('vault_notes')
      .select('api_id, title, content')
      .eq('owner_id', login.userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('vault_notes list failed');

      return res.status(500).json({
        error: 'DATA_READ_FAILED',
      });
    }

    return res.status(200).json({
      notes: data.map((note) => ({
        id: note.api_id,
        title: note.title,
        body: note.content,
      })),
    });
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req);

    if (!body) {
      return res.status(400).json({
        error: 'INVALID_JSON',
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(body, 'owner_id')
      || Object.prototype.hasOwnProperty.call(body, 'userId')
      || Object.prototype.hasOwnProperty.call(body, 'role')
    ) {
      return res.status(400).json({
        error: 'OWNER_FIELD_NOT_ALLOWED',
      });
    }

    const title =
      typeof body.title === 'string'
        ? body.title.trim()
        : '';

    const noteBody =
      typeof body.body === 'string'
        ? body.body.trim()
        : '';

    if (!title || !noteBody) {
      return res.status(400).json({
        error: 'TITLE_AND_BODY_REQUIRED',
      });
    }

    let id;

    if (body.id === undefined || body.id === null || body.id === '') {
      id = randomUUID();
    } else if (typeof body.id === 'string' && UUID.test(body.id)) {
      id = body.id;
    } else {
      return res.status(400).json({
        error: 'INVALID_ID',
      });
    }

    const { error } = await clients.supabase
      .from('vault_notes')
      .insert({
        api_id: id,
        owner_id: login.userId,
        title,
        content: noteBody,
      });

    if (error) {
      console.error('vault_notes insert failed');

      if (error.code === '23505') {
        return res.status(409).json({
          error: 'ID_ALREADY_EXISTS',
        });
      }

      return res.status(500).json({
        error: 'DATA_WRITE_FAILED',
      });
    }

    return res.status(201).json({
      id,
    });
  }

  res.setHeader('Allow', 'GET, POST');

  return res.status(405).json({
    error: 'METHOD_NOT_ALLOWED',
  });
}