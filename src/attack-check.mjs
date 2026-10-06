// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.

function getApp(config) {
  let app;

  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error(
      'aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.',
    );
  }

  if (
    app.protocol !== 'https:'
    || app.username
    || app.password
    || app.search
    || app.hash
    || app.pathname !== '/'
    || app.hostname.endsWith('.example')
  ) {
    throw new Error(
      'aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.',
    );
  }

  return app;
}

async function checkStep1(config) {
  const app = getApp(config);

  const response = await fetch(
    new URL('/data.json', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let visible = false;

  if (response.ok) {
    try {
      const data = await response.json();

      visible =
        data?.sampleMarker === config.sampleMarker
        && Array.isArray(data.notes)
        && data.notes.length > 0;
    } catch {
      // Non-JSON response is a failed check.
    }
  }

  return [
    {
      attackId: 'anonymous_note_read',
      expected: '비로그인 화면에서 가상 메모를 확인',
      observed: visible
        ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임'
        : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})`,
    },
  ];
}

async function checkStep2(config) {
  const app = getApp(config);

  const staticResponse = await fetch(
    new URL('/data.json', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let staticCleared = false;

  if (staticResponse.ok) {
    try {
      const data = await staticResponse.json();

      staticCleared =
        Array.isArray(data?.notes)
        && data.notes.length === 0;
    } catch {
      // Non-JSON response is not the expected static result.
    }
  }

  const apiResponse = await fetch(
    new URL('/api/notes', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let anonymousApiVisible = false;
  let count = 0;

  if (apiResponse.ok) {
    try {
      const data = await apiResponse.json();

      if (Array.isArray(data?.notes)) {
        count = data.notes.length;
        anonymousApiVisible = count > 0;
      }
    } catch {
      // Non-JSON response is a failed API check.
    }
  }

  return [
    {
      attackId: 'static_note_removed',
      expected: '현재 정적 data.json에는 가상 메모가 없어야 함',
      observed: staticCleared
        ? '현재 정적 data.json의 notes가 비어 있음'
        : `현재 정적 data.json이 비어 있지 않거나 확인할 수 없음 (HTTP ${staticResponse.status})`,
    },
    {
      attackId: 'anonymous_server_api_read',
      expected: '2단계에서는 공개 서버 API 약점이 아직 남아 있음',
      observed: anonymousApiVisible
        ? `비로그인 서버 API 요청에서 가상 자료 ${count}건이 반환됨`
        : `비로그인 서버 API에서 자료를 확인하지 못함 (HTTP ${apiResponse.status})`,
    },
  ];
}

async function checkStep3(config) {
  const app = getApp(config);

  const staticResponse = await fetch(
    new URL('/data.json', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let staticCleared = false;

  if (staticResponse.ok) {
    try {
      const data = await staticResponse.json();

      staticCleared =
        Array.isArray(data?.notes)
        && data.notes.length === 0;
    } catch {
      // Non-JSON response is not the expected static result.
    }
  }

  const anonymousResponse = await fetch(
    new URL('/api/notes', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let anonymousDenied = false;

  try {
    const data = await anonymousResponse.json();

    anonymousDenied =
      anonymousResponse.status === 401
      && data?.error === 'AUTH_REQUIRED';
  } catch {
    // Expected API response must be JSON.
  }

  return [
    {
      attackId: 'static_note_still_removed',
      expected: '정적 data.json에는 가상 메모가 계속 없어야 함',
      observed: staticCleared
        ? '현재 정적 data.json의 notes가 비어 있음'
        : `현재 정적 data.json을 안전한 빈 자료로 확인하지 못함 (HTTP ${staticResponse.status})`,
    },
    {
      attackId: 'anonymous_api_denied',
      expected: '비로그인 자료 API 요청은 자료 없이 401로 거부되어야 함',
      observed: anonymousDenied
        ? '비로그인 자료 API 요청이 AUTH_REQUIRED와 HTTP 401로 거부됨'
        : `비로그인 자료 API 요청이 예상대로 거부되지 않음 (HTTP ${anonymousResponse.status})`,
    },
    {
      attackId: 'authenticated_crud',
      expected: '정상 로그인 사용자는 가상 메모 추가·수정·삭제가 가능해야 함',
      observed:
        '미실행: 제출 묶음 자기 점검에는 로그인 비밀번호나 토큰을 넣지 않으며, 배포 화면에서 별도로 확인함',
    },
  ];
}

async function checkStep4(config) {
  const app = getApp(config);

  const anonymousResponse = await fetch(
    new URL('/api/notes', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let anonymousJsonDenied = false;

  try {
    const data = await anonymousResponse.json();

    anonymousJsonDenied =
      (
        anonymousResponse.status === 401
        || anonymousResponse.status === 403
      )
      && typeof data?.error === 'string'
      && data.error.length > 0;
  } catch {
    // 4단계에서는 JSON 오류 응답이어야 한다.
  }

  const identityResponse = await fetch(
    new URL('/aleph.json', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let identityAvailable = false;

  if (identityResponse.ok) {
    try {
      const data = await identityResponse.json();

      identityAvailable =
        data?.schema === 'aleph.defense.deployment.v1'
        && data?.step === 4
        && typeof data?.commit === 'string'
        && data.commit.length === 40;
    } catch {
      // JSON이 아니면 실패.
    }
  }

  const homeResponse = await fetch(
    app,
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  const nosniff =
    homeResponse.headers
      .get('x-content-type-options')
      ?.toLowerCase() === 'nosniff';

  return [
    {
      attackId: 'anonymous_api_json_denied',
      expected:
        '로그인 없는 메모 목록 요청은 JSON 오류와 401 또는 403으로 거부되어야 함',
      observed: anonymousJsonDenied
        ? `비로그인 자료 API가 JSON 오류와 HTTP ${anonymousResponse.status}로 거부됨`
        : `비로그인 자료 API 거부 형식이 예상과 다름 (HTTP ${anonymousResponse.status})`,
    },
    {
      attackId: 'aleph_identity_available',
      expected:
        '배포 주소의 /aleph.json에서 4단계 배포 식별 정보를 읽을 수 있어야 함',
      observed: identityAvailable
        ? '/aleph.json에서 4단계 배포 식별 정보를 확인함'
        : `/aleph.json을 예상 형식으로 확인하지 못함 (HTTP ${identityResponse.status})`,
    },
    {
      attackId: 'security_header_present',
      expected:
        '첫 화면 응답에 X-Content-Type-Options: nosniff가 있어야 함',
      observed: nosniff
        ? '첫 화면 응답에서 X-Content-Type-Options: nosniff를 확인함'
        : '첫 화면 응답에서 nosniff 헤더를 확인하지 못함',
    },
    {
      attackId: 'owner_isolation',
      expected:
        'A와 B는 자기 메모만 접근하고 상대 메모 UUID 접근은 거부되어야 함',
      observed:
        '로그인 자격 증명을 제출 묶음에 넣지 않으며, 배포 화면에서 B→A UUID 404와 B→B UUID 200을 별도로 확인함',
    },
  ];
}

async function checkStep5(config) {
  const app = getApp(config);

  const anonymousResponse = await fetch(
    new URL('/api/notes', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let anonymousDenied = false;

  try {
    const data = await anonymousResponse.json();

    anonymousDenied =
      (
        anonymousResponse.status === 401
        || anonymousResponse.status === 403
      )
      && typeof data?.error === 'string'
      && data.error.length > 0;
  } catch {
    // 자료 API 거부 응답은 JSON이어야 한다.
  }

  const identityResponse = await fetch(
    new URL('/aleph.json', app),
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  let allowedRoutesAvailable = false;

  if (identityResponse.ok) {
    try {
      const data = await identityResponse.json();

      allowedRoutesAvailable =
        data?.schema === 'aleph.defense.deployment.v1'
        && data?.step === 5
        && Array.isArray(data?.allowedRoutes)
        && data.allowedRoutes.length > 0;
    } catch {
      // JSON이 아니면 실패.
    }
  }

  const homeResponse = await fetch(
    app,
    {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    },
  );

  const nosniff =
    homeResponse.headers
      .get('x-content-type-options')
      ?.toLowerCase() === 'nosniff';

  let publicKeyAbsent = false;

  if (homeResponse.ok) {
    const html = await homeResponse.text();

    publicKeyAbsent =
      !html.includes('sb_publishable_')
      && !html.includes('SUPABASE_PUBLISHABLE_KEY')
      && !html.includes('@supabase/supabase-js');
  }

  let originalApiDenied = false;
  let originalStatus = null;

  try {
    const originalResponse = await fetch(
      config.originalApiUrl,
      {
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      },
    );

    originalStatus = originalResponse.status;

    originalApiDenied =
      originalResponse.status === 401
      || originalResponse.status === 403;
  } catch {
    // 네트워크 오류도 직접 자료 조회 성공으로 취급하지 않는다.
  }

  return [
    {
      attackId: 'anonymous_api_denied',
      expected:
        '비로그인 메모 API 요청은 자료 없이 JSON 오류와 401 또는 403으로 거부되어야 함',
      observed: anonymousDenied
        ? `비로그인 자료 API가 HTTP ${anonymousResponse.status}로 거부됨`
        : `비로그인 자료 API 거부 형식이 예상과 다름 (HTTP ${anonymousResponse.status})`,
    },
    {
      attackId: 'original_api_direct_denied',
      expected:
        '원본 Supabase 자료 API를 자격 증명 없이 직접 읽을 수 없어야 함',
      observed: originalApiDenied
        ? `원본 자료 API 직접 요청이 HTTP ${originalStatus}로 거부됨`
        : originalStatus === null
          ? '원본 자료 API 직접 요청에서 자료를 확인하지 못함'
          : `원본 자료 API 직접 요청이 예상 상태로 거부되지 않음 (HTTP ${originalStatus})`,
    },
    {
      attackId: 'aleph_allowed_routes',
      expected:
        '/aleph.json의 allowedRoutes에 허용된 자료 API 경로가 하나 이상 있어야 함',
      observed: allowedRoutesAvailable
        ? '/aleph.json에서 5단계 allowedRoutes를 확인함'
        : `/aleph.json의 allowedRoutes를 확인하지 못함 (HTTP ${identityResponse.status})`,
    },
    {
      attackId: 'security_header_present',
      expected:
        '첫 화면 응답에 X-Content-Type-Options: nosniff가 있어야 함',
      observed: nosniff
        ? '첫 화면 응답에서 X-Content-Type-Options: nosniff를 확인함'
        : '첫 화면 응답에서 nosniff 헤더를 확인하지 못함',
    },
    {
      attackId: 'browser_public_key_absent',
      expected:
        '첫 화면 코드에 Supabase publishable 키 또는 브라우저 SDK가 없어야 함',
      observed: publicKeyAbsent
        ? '첫 화면 코드에서 Supabase 공개 키와 브라우저 SDK 참조가 보이지 않음'
        : '첫 화면 코드에서 Supabase 공개 키 또는 브라우저 SDK 참조를 확인함',
    },
    {
      attackId: 'owner_isolation_preserved',
      expected:
        '서버 함수의 로그인·소유자 검사가 유지되어 다른 사용자 메모 접근이 거부되어야 함',
      observed:
        '로그인 자격 증명을 제출 묶음에 넣지 않으며, 4단계에서 B→A UUID 404와 B→B UUID 200을 별도로 확인함',
    },
  ];
}

export async function runAttackChecks(config) {
  if (config.step === 1) {
    return checkStep1(config);
  }

  if (config.step === 2) {
    return checkStep2(config);
  }

  if (config.step === 3) {
    return checkStep3(config);
  }

  if (config.step === 4) {
    return checkStep4(config);
  }

  if (config.step === 5) {
    return checkStep5(config);
  }

  throw new Error(
    '이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.',
  );
}