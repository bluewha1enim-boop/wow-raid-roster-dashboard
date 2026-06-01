const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "app-data.json");
const WCL_TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const WCL_GRAPHQL_URL = "https://www.warcraftlogs.com/api/v2/client";
const SESSION_COOKIE = "rrd_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

loadEnvFile();

const storage = createStorage();

const classIdToName = {
  1: "죽음의 기사",
  2: "드루이드",
  3: "사냥꾼",
  4: "마법사",
  5: "수도사",
  6: "성기사",
  7: "사제",
  8: "도적",
  9: "주술사",
  10: "흑마법사",
  11: "전사",
  12: "악마사냥꾼",
  13: "기원사",
};

const specNameMap = {
  Blood: "혈기",
  Frost: "냉기",
  Unholy: "부정",
  Havoc: "파멸",
  Vengeance: "복수",
  Balance: "조화",
  Feral: "야성",
  Guardian: "수호",
  Restoration: "회복",
  Devastation: "황폐",
  Preservation: "보존",
  Augmentation: "증강",
  "Beast Mastery": "야수",
  Marksmanship: "사격",
  Survival: "생존",
  Arcane: "비전",
  Fire: "화염",
  Brewmaster: "양조",
  Mistweaver: "운무",
  Windwalker: "풍운",
  Holy: "신성",
  Protection: "보호",
  Retribution: "징벌",
  Discipline: "수양",
  Shadow: "암흑",
  Assassination: "암살",
  Outlaw: "무법",
  Subtlety: "잠행",
  Elemental: "정기",
  Enhancement: "고양",
  Affliction: "고통",
  Demonology: "악마",
  Destruction: "파괴",
  Arms: "무기",
  Fury: "분노",
};

const tankSpecs = new Set(["혈기", "복수", "수호", "양조", "보호", "방어"]);
const healerSpecs = new Set(["회복", "보존", "운무", "신성", "수양", "복원"]);
const realmSlugMap = {
  "아즈샤라": "azshara",
  "하이잘": "hyjal",
  "헬스크림": "hellscream",
  "윈드러너": "windrunner",
  "불타는군단": "burning-legion",
  "데스윙": "deathwing",
  "듀로탄": "durotan",
  "세나리우스": "cenarius",
};

let tokenCache = null;

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/health") {
      return sendJson(response, 200, {
        ok: true,
        configured: hasWclCredentials(),
        storage: storage.kind,
      });
    }

    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      return await handleRegister(request, response);
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      return await handleLogin(request, response);
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return handleLogout(response);
    }

    if (url.pathname === "/api/session") {
      return await handleSession(request, response);
    }

    if (url.pathname === "/api/schedules") {
      if (request.method === "GET") {
        return await handleScheduleList(request, response);
      }
      if (request.method === "POST") {
        return await handleScheduleCreate(request, response);
      }
    }

    const scheduleMatch = url.pathname.match(/^\/api\/schedules\/([^/]+)$/);
    if (scheduleMatch) {
      if (request.method === "PUT") {
        return await handleScheduleUpdate(request, response, scheduleMatch[1]);
      }
      if (request.method === "DELETE") {
        return await handleScheduleDelete(request, response, scheduleMatch[1]);
      }
    }

    if (url.pathname === "/api/wcl-character") {
      return await handleWclCharacter(url, response);
    }

    return serveStatic(url, response);
  } catch (error) {
    return sendJson(response, 500, {
      ok: false,
      code: "server_error",
      message: error.message || "서버 오류가 발생했습니다.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Raid dashboard running at http://localhost:${PORT}`);
});

async function handleRegister(request, response) {
  const body = await readJsonBody(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");

  if (!isValidUsername(username)) {
    return sendJson(response, 400, {
      ok: false,
      code: "invalid_username",
      message: "아이디는 2~24자로 입력해 주세요.",
    });
  }

  if (password.length < 4) {
    return sendJson(response, 400, {
      ok: false,
      code: "weak_password",
      message: "비밀번호는 4자 이상으로 입력해 주세요.",
    });
  }

  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) {
    return sendJson(response, 409, {
      ok: false,
      code: "username_exists",
      message: "이미 있는 아이디입니다.",
    });
  }

  const passwordHash = hashPassword(password);
  const user = await storage.createUser({
    username,
    passwordHash,
  });
  if (!user) {
    return sendJson(response, 409, {
      ok: false,
      code: "username_exists",
      message: "이미 있는 아이디입니다.",
    });
  }
  const token = createSessionToken(username);
  setSessionCookie(response, token);

  return sendJson(response, 201, {
    ok: true,
    user: publicUser(user),
  });
}

async function handleLogin(request, response) {
  const body = await readJsonBody(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const user = await storage.getUserByUsername(username);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return sendJson(response, 401, {
      ok: false,
      code: "bad_login",
      message: "아이디나 비밀번호가 맞지 않습니다.",
    });
  }

  const token = createSessionToken(username);
  setSessionCookie(response, token);

  return sendJson(response, 200, {
    ok: true,
    user: publicUser(user),
  });
}

function handleLogout(response) {
  clearSessionCookie(response);
  return sendJson(response, 200, { ok: true });
}

async function handleSession(request, response) {
  const user = await requireUser(request, response, { optional: true });
  if (!user) {
    return sendJson(response, 200, { ok: true, authenticated: false });
  }

  return sendJson(response, 200, {
    ok: true,
    authenticated: true,
    user: publicUser(user),
  });
}

async function handleScheduleList(request, response) {
  const user = await requireUser(request, response);
  if (!user) {
    return;
  }

  const schedules = (await storage.listSchedules(user.username)).map(publicSchedule);

  return sendJson(response, 200, {
    ok: true,
    schedules,
  });
}

async function handleScheduleCreate(request, response) {
  const user = await requireUser(request, response);
  if (!user) {
    return;
  }

  const body = await readJsonBody(request);
  const now = new Date().toISOString();
  const schedule = await storage.createSchedule(user.username, {
    id: crypto.randomUUID(),
    name: normalizeScheduleName(body.name),
    roster: normalizeRoster(body.roster),
    createdAt: now,
    updatedAt: now,
  });

  return sendJson(response, 201, {
    ok: true,
    schedule: publicSchedule(schedule),
  });
}

async function handleScheduleUpdate(request, response, id) {
  const user = await requireUser(request, response);
  if (!user) {
    return;
  }

  const existingSchedule = await storage.getSchedule(user.username, id);
  if (!existingSchedule) {
    return sendJson(response, 404, {
      ok: false,
      code: "schedule_not_found",
      message: "일정을 찾지 못했습니다.",
    });
  }

  const body = await readJsonBody(request);
  const patch = {};
  if (body.name !== undefined) {
    patch.name = normalizeScheduleName(body.name);
  }
  if (body.roster !== undefined) {
    patch.roster = normalizeRoster(body.roster);
  }
  const schedule = await storage.updateSchedule(user.username, id, patch);

  return sendJson(response, 200, {
    ok: true,
    schedule: publicSchedule(schedule),
  });
}

async function handleScheduleDelete(request, response, id) {
  const user = await requireUser(request, response);
  if (!user) {
    return;
  }

  const deleted = await storage.deleteSchedule(user.username, id);
  if (!deleted) {
    return sendJson(response, 404, {
      ok: false,
      code: "schedule_not_found",
      message: "일정을 찾지 못했습니다.",
    });
  }

  return sendJson(response, 200, { ok: true });
}

async function handleWclCharacter(url, response) {
  const name = (url.searchParams.get("name") || "").trim();
  const realm = (url.searchParams.get("realm") || "아즈샤라").trim();

  if (!name) {
    return sendJson(response, 400, {
      ok: false,
      code: "missing_name",
      message: "닉네임을 입력해야 합니다.",
    });
  }

  if (!hasWclCredentials()) {
    return sendJson(response, 503, {
      ok: false,
      code: "missing_credentials",
      message: "WCL API 키가 아직 설정되지 않았습니다.",
    });
  }

  const attempts = unique([realm, slugifyRealm(realm)]);
  for (const serverSlug of attempts) {
    const character = await queryWclCharacter({
      name,
      realm,
      serverSlug,
      serverRegion: "kr",
    });

    if (character) {
      return sendJson(response, 200, {
        ok: true,
        character,
      });
    }
  }

  return sendJson(response, 404, {
    ok: false,
    code: "not_found",
    message: `${name}-${realm} 캐릭터를 WCL에서 찾지 못했습니다.`,
  });
}

async function queryWclCharacter({ name, realm, serverSlug, serverRegion }) {
  const query = `
    query CharacterLookup($name: String!, $serverSlug: String!, $serverRegion: String!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          id
          name
          classID
          level
          gameData
        }
      }
    }
  `;

  const data = await wclGraphql(query, {
    name,
    serverSlug,
    serverRegion,
  });

  const character = data?.characterData?.character;
  if (!character) {
    return null;
  }

  const wowClass = classIdToName[character.classID] || "WCL 연동 대기";
  const spec = getSpecFromGameData(character.gameData);

  return {
    id: character.id,
    name: character.name || name,
    realm,
    realmSlug: serverSlug,
    wowClass,
    spec,
    role: spec ? inferRole(spec) : undefined,
    level: character.level,
    wclUrl: buildWclUrl({ name: character.name || name, realm }),
  };
}

async function wclGraphql(query, variables) {
  const token = await getWclToken();
  const response = await fetch(WCL_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message =
      payload.errors?.map((error) => error.message).join(" / ") ||
      `WCL GraphQL 요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return payload.data;
}

async function getWclToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.WCL_CLIENT_ID;
  const clientSecret = process.env.WCL_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(WCL_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || `WCL 토큰 발급 실패 (${response.status})`);
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
  return tokenCache.accessToken;
}

function normalizeSpecName(specName) {
  if (!specName) {
    return "";
  }
  return specNameMap[specName] || specName;
}

function getSpecFromGameData(gameData) {
  if (!gameData || typeof gameData !== "object") {
    return "";
  }

  const candidates = [
    gameData.spec,
    gameData.specName,
    gameData.activeSpec,
    gameData.activeSpecName,
    gameData.character?.spec,
    gameData.character?.specName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeSpecName(candidate.trim());
    }
    if (candidate && typeof candidate.name === "string") {
      return normalizeSpecName(candidate.name);
    }
  }

  return "";
}

function inferRole(spec) {
  if (tankSpecs.has(spec)) {
    return "탱커";
  }
  if (healerSpecs.has(spec)) {
    return "힐러";
  }
  return "딜러";
}

function hasWclCredentials() {
  return Boolean(process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET);
}

function slugifyRealm(realm) {
  return realmSlugMap[realm] || realm.toLowerCase().replace(/\s+/g, "-");
}

function buildWclUrl(character) {
  return `https://www.warcraftlogs.com/character/kr/${encodeURIComponent(
    slugifyRealm(character.realm)
  )}/${encodeURIComponent(character.name)}`;
}

function createStorage() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseStorage();
  }
  return createFileStorage();
}

function createFileStorage() {
  return {
    kind: "file",
    async getUserByUsername(username) {
      return loadStore().users[username] || null;
    },
    async createUser(user) {
      const store = loadStore();
      const createdUser = {
        username: user.username,
        passwordHash: user.passwordHash,
        createdAt: new Date().toISOString(),
      };
      store.users[user.username] = createdUser;
      saveStore(store);
      return createdUser;
    },
    async listSchedules(username) {
      const store = loadStore();
      return Object.values(store.schedules)
        .filter((schedule) => schedule.owner === username)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getSchedule(username, id) {
      const schedule = loadStore().schedules[id];
      return schedule && schedule.owner === username ? schedule : null;
    },
    async createSchedule(username, schedule) {
      const store = loadStore();
      const createdSchedule = {
        ...schedule,
        owner: username,
        createdAt: schedule.createdAt || new Date().toISOString(),
        updatedAt: schedule.updatedAt || new Date().toISOString(),
      };
      store.schedules[createdSchedule.id] = createdSchedule;
      saveStore(store);
      return createdSchedule;
    },
    async updateSchedule(username, id, patch) {
      const store = loadStore();
      const schedule = store.schedules[id];
      if (!schedule || schedule.owner !== username) {
        return null;
      }
      if (patch.name !== undefined) {
        schedule.name = patch.name;
      }
      if (patch.roster !== undefined) {
        schedule.roster = patch.roster;
      }
      schedule.updatedAt = new Date().toISOString();
      saveStore(store);
      return schedule;
    },
    async deleteSchedule(username, id) {
      const store = loadStore();
      const schedule = store.schedules[id];
      if (!schedule || schedule.owner !== username) {
        return false;
      }
      delete store.schedules[id];
      saveStore(store);
      return true;
    },
  };
}

function createSupabaseStorage() {
  const baseUrl = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  async function request(pathname, options = {}) {
    const response = await fetch(`${baseUrl}/rest/v1/${pathname}`, {
      method: options.method || "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(options.prefer ? { Prefer: options.prefer } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = payload?.message || payload?.hint || `Supabase 요청 실패 (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  return {
    kind: "supabase",
    async getUserByUsername(username) {
      const rows = await request(
        `wrd_users?username=eq.${encodeURIComponent(username)}&select=username,password_hash,created_at&limit=1`
      );
      return rows?.[0] ? userFromRow(rows[0]) : null;
    },
    async createUser(user) {
      try {
        const rows = await request("wrd_users?select=username,password_hash,created_at", {
          method: "POST",
          prefer: "return=representation",
          body: {
            username: user.username,
            password_hash: user.passwordHash,
          },
        });
        return userFromRow(rows[0]);
      } catch (error) {
        if (error.status === 409) {
          return null;
        }
        throw error;
      }
    },
    async listSchedules(username) {
      const rows = await request(
        `wrd_schedules?owner_username=eq.${encodeURIComponent(
          username
        )}&select=id,owner_username,name,roster,created_at,updated_at&order=updated_at.desc`
      );
      return rows.map(scheduleFromRow);
    },
    async getSchedule(username, id) {
      const rows = await request(
        `wrd_schedules?id=eq.${encodeURIComponent(id)}&owner_username=eq.${encodeURIComponent(
          username
        )}&select=id,owner_username,name,roster,created_at,updated_at&limit=1`
      );
      return rows?.[0] ? scheduleFromRow(rows[0]) : null;
    },
    async createSchedule(username, schedule) {
      const rows = await request("wrd_schedules?select=id,owner_username,name,roster,created_at,updated_at", {
        method: "POST",
        prefer: "return=representation",
        body: {
          id: schedule.id,
          owner_username: username,
          name: schedule.name,
          roster: schedule.roster,
        },
      });
      return scheduleFromRow(rows[0]);
    },
    async updateSchedule(username, id, patch) {
      const body = {
        updated_at: new Date().toISOString(),
      };
      if (patch.name !== undefined) {
        body.name = patch.name;
      }
      if (patch.roster !== undefined) {
        body.roster = patch.roster;
      }

      const rows = await request(
        `wrd_schedules?id=eq.${encodeURIComponent(id)}&owner_username=eq.${encodeURIComponent(
          username
        )}&select=id,owner_username,name,roster,created_at,updated_at`,
        {
          method: "PATCH",
          prefer: "return=representation",
          body,
        }
      );
      return rows?.[0] ? scheduleFromRow(rows[0]) : null;
    },
    async deleteSchedule(username, id) {
      const rows = await request(
        `wrd_schedules?id=eq.${encodeURIComponent(id)}&owner_username=eq.${encodeURIComponent(
          username
        )}&select=id`,
        {
          method: "DELETE",
          prefer: "return=representation",
        }
      );
      return Array.isArray(rows) && rows.length > 0;
    },
  };
}

function userFromRow(row) {
  return {
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function scheduleFromRow(row) {
  return {
    id: row.id,
    owner: row.owner_username,
    name: row.name,
    roster: Array.isArray(row.roster) ? row.roster : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loadStore() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    users: parsed.users || {},
    schedules: parsed.schedules || {},
  };
}

function saveStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    saveStore({ users: {}, schedules: {} });
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy();
        reject(new Error("요청이 너무 큽니다."));
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON 형식이 올바르지 않습니다."));
      }
    });
    request.on("error", reject);
  });
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

function isValidUsername(username) {
  return username.length >= 2 && username.length <= 24 && !/\s/.test(username);
}

function normalizeScheduleName(name) {
  const normalized = String(name || "").trim();
  return normalized.slice(0, 40) || "새 일정";
}

function normalizeRoster(roster) {
  if (!Array.isArray(roster)) {
    return [];
  }

  return roster.slice(0, 40).map((character, index) => ({
    id: String(character.id || crypto.randomUUID()),
    name: String(character.name || "").trim().slice(0, 40),
    realm: String(character.realm || "아즈샤라").trim().slice(0, 40),
    wowClass: String(character.wowClass || "WCL 연동 대기").trim().slice(0, 40),
    spec: String(character.spec || "").trim().slice(0, 40),
    role: String(character.role || "딜러").trim().slice(0, 20),
    order: Number.isFinite(character.order) ? character.order : index,
  })).filter((character) => character.name);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [method, salt, hash] = String(storedHash || "").split(":");
  if (method !== "scrypt" || !salt || !hash) {
    return false;
  }
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}

function createSessionToken(username) {
  const payload = {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signSessionPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token) {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload);
  if (!timingSafeStringEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.username || payload.expiresAt <= Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

async function requireUser(request, response, options = {}) {
  const token = getSessionToken(request);
  const session = verifySessionToken(token);
  const user = session ? await storage.getUserByUsername(session.username) : null;

  if (user) {
    return user;
  }

  if (options.optional) {
    return null;
  }

  sendJson(response, 401, {
    ok: false,
    code: "login_required",
    message: "로그인이 필요합니다.",
  });
  return null;
}

function signSessionPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.WCL_CLIENT_SECRET ||
    "local-development-session-secret"
  );
}

function timingSafeStringEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionToken(request) {
  return parseCookies(request.headers.cookie || "")[SESSION_COOKIE];
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((cookies, item) => {
    const [rawKey, ...valueParts] = item.trim().split("=");
    if (!rawKey) {
      return cookies;
    }
    cookies[rawKey] = decodeURIComponent(valueParts.join("="));
    return cookies;
  }, {});
}

function setSessionCookie(response, token) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_TTL_MS / 1000
    )}`
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function publicUser(user) {
  return {
    username: user.username,
    createdAt: user.createdAt,
  };
}

function publicSchedule(schedule) {
  return {
    id: schedule.id,
    name: schedule.name,
    roster: schedule.roster || [],
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
}

function serveStatic(url, response) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(ROOT, `.${decodeURIComponent(requestedPath)}`);

  if (!filePath.startsWith(ROOT)) {
    return sendText(response, 403, "Forbidden");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendText(response, 404, "Not found");
  }

  const ext = path.extname(filePath);
  const type =
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
    }[ext] || "application/octet-stream";

  response.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(response);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, status, text) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envText = fs.readFileSync(envPath, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split("=");
    if (!key || process.env[key]) {
      continue;
    }
    process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
