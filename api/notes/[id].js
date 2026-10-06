import { createClient } from '@supabase/supabase-js';
import config from '../../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../../src/verify-login.mjs';

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

function getNoteId(req) {
  const value = req.query?.id;

  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return typeof value === 'string'
    ? value
    : '';
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

async function findOwnedNote(
  supabaseClient,
  id,
  userId,
) {
  const { data, error } = await supabaseClient
    .from('vault_notes')
    .select('api_id, owner_id, title, content')
    .eq('api_id', id)
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
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

  const id = getNoteId(req);

  if (!UUID.test(id)) {
    return res.status(400).json({
      error: 'INVALID_ID',
    });
  }

  if (req.method === 'GET') {
    let note;

    try {
      note = await findOwnedNote(
        clients.supabase,
        id,
        login.userId,
      );
    } catch {
      console.error('vault_notes item read failed');

      return res.status(500).json({
        error: 'DATA_READ_FAILED',
      });
    }

    if (!note) {
      return res.status(404).json({
        error: 'NOTE_NOT_FOUND',
      });
    }

    return res.status(200).json({
      id: note.api_id,
      title: note.title,
      body: note.content,
    });
  }

  if (req.method === 'PUT') {
    const body = readJsonBody(req);

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
        error: 'OWNER_CHANGE_NOT_ALLOWED',
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

    let existing;

    try {
      existing = await findOwnedNote(
        clients.supabase,
        id,
        login.userId,
      );
    } catch {
      console.error('vault_notes ownership read failed');

      return res.status(500).json({
        error: 'DATA_READ_FAILED',
      });
    }

    if (!existing) {
      return res.status(404).json({
        error: 'NOTE_NOT_FOUND',
      });
    }

    const { data, error } = await clients.supabase
      .from('vault_notes')
      .update({
        title,
        content: noteBody,
        owner_id: login.userId,
      })
      .eq('api_id', id)
      .eq('owner_id', login.userId)
      .select('api_id, owner_id')
      .maybeSingle();

    if (error) {
      console.error('vault_notes update failed');

      return res.status(500).json({
        error: 'DATA_WRITE_FAILED',
      });
    }

    if (
      !data
      || data.owner_id !== login.userId
    ) {
      return res.status(404).json({
        error: 'NOTE_NOT_FOUND',
      });
    }

    return res.status(200).json({
      id: data.api_id,
    });
  }

  if (req.method === 'DELETE') {
    const { data, error } = await clients.supabase
      .from('vault_notes')
      .delete()
      .eq('api_id', id)
      .eq('owner_id', login.userId)
      .select('api_id')
      .maybeSingle();

    if (error) {
      console.error('vault_notes delete failed');

      return res.status(500).json({
        error: 'DATA_WRITE_FAILED',
      });
    }

    if (!data) {
      return res.status(404).json({
        error: 'NOTE_NOT_FOUND',
      });
    }

    return res.status(204).end();
  }

  res.setHeader(
    'Allow',
    'GET, PUT, DELETE',
  );

  return res.status(405).json({
    error: 'METHOD_NOT_ALLOWED',
  });
}