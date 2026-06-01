<?php
declare(strict_types=1);

const WCL_TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const WCL_GRAPHQL_URL = 'https://www.warcraftlogs.com/api/v2/client';

mb_internal_encoding('UTF-8');

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    jsonError(500, 'missing_config', 'config.php 파일이 필요합니다. config.example.php를 복사해서 설정해 주세요.');
}

$config = require $configPath;
startAppSession();

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'health':
            handleHealth($config);
            break;
        case 'session':
            handleSession($config);
            break;
        case 'register':
            requireMethod('POST');
            handleRegister($config);
            break;
        case 'login':
            requireMethod('POST');
            handleLogin($config);
            break;
        case 'logout':
            requireMethod('POST');
            handleLogout();
            break;
        case 'schedules':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                handleScheduleList($config);
                break;
            }
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                handleScheduleCreate($config);
                break;
            }
            jsonError(405, 'method_not_allowed', '지원하지 않는 요청입니다.');
            break;
        case 'schedule':
            if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                handleScheduleUpdate($config);
                break;
            }
            if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                handleScheduleDelete($config);
                break;
            }
            jsonError(405, 'method_not_allowed', '지원하지 않는 요청입니다.');
            break;
        case 'schedule-update':
            requireMethod('POST');
            handleScheduleUpdate($config);
            break;
        case 'schedule-delete':
            requireMethod('POST');
            handleScheduleDelete($config);
            break;
        case 'wcl-character':
            handleWclCharacter($config);
            break;
        default:
            jsonError(404, 'not_found', '알 수 없는 API 요청입니다.');
    }
} catch (Throwable $error) {
    jsonError(500, 'server_error', $error->getMessage());
}

function handleHealth(array $config): void
{
    db($config);
    jsonResponse(200, [
        'ok' => true,
        'configured' => hasWclCredentials($config),
    ]);
}

function handleSession(array $config): void
{
    $user = currentUser($config, false);
    if (!$user) {
        jsonResponse(200, [
            'ok' => true,
            'authenticated' => false,
        ]);
    }

    jsonResponse(200, [
        'ok' => true,
        'authenticated' => true,
        'user' => publicUser($user),
    ]);
}

function handleRegister(array $config): void
{
    $body = readJsonBody();
    $username = normalizeUsername($body['username'] ?? '');
    $password = (string)($body['password'] ?? '');

    if (!isValidUsername($username)) {
        jsonError(400, 'invalid_username', '아이디는 2~24자로 입력해 주세요.');
    }
    if (mb_strlen($password) < 4) {
        jsonError(400, 'weak_password', '비밀번호는 4자 이상으로 입력해 주세요.');
    }

    $pdo = db($config);
    $stmt = $pdo->prepare('SELECT id FROM wrd_users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        jsonError(409, 'username_exists', '이미 있는 아이디입니다.');
    }

    $stmt = $pdo->prepare('INSERT INTO wrd_users (username, password_hash) VALUES (?, ?)');
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    $_SESSION['user_id'] = (int)$pdo->lastInsertId();

    $user = currentUser($config, true);
    jsonResponse(201, [
        'ok' => true,
        'user' => publicUser($user),
    ]);
}

function handleLogin(array $config): void
{
    $body = readJsonBody();
    $username = normalizeUsername($body['username'] ?? '');
    $password = (string)($body['password'] ?? '');

    $pdo = db($config);
    $stmt = $pdo->prepare('SELECT id, username, password_hash, created_at FROM wrd_users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonError(401, 'bad_login', '아이디나 비밀번호가 맞지 않습니다.');
    }

    $_SESSION['user_id'] = (int)$user['id'];
    jsonResponse(200, [
        'ok' => true,
        'user' => publicUser($user),
    ]);
}

function handleLogout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool)$params['secure'], (bool)$params['httponly']);
    }
    session_destroy();
    jsonResponse(200, ['ok' => true]);
}

function handleScheduleList(array $config): void
{
    $user = currentUser($config, true);
    $pdo = db($config);
    $stmt = $pdo->prepare('SELECT id, name, roster_json, created_at, updated_at FROM wrd_schedules WHERE user_id = ? ORDER BY updated_at DESC');
    $stmt->execute([(int)$user['id']]);

    $schedules = [];
    while ($row = $stmt->fetch()) {
        $schedules[] = publicSchedule($row);
    }

    jsonResponse(200, [
        'ok' => true,
        'schedules' => $schedules,
    ]);
}

function handleScheduleCreate(array $config): void
{
    $user = currentUser($config, true);
    $body = readJsonBody();
    $schedule = [
        'id' => uuidV4(),
        'name' => normalizeScheduleName($body['name'] ?? ''),
        'roster' => normalizeRoster($body['roster'] ?? []),
    ];

    $pdo = db($config);
    $stmt = $pdo->prepare('INSERT INTO wrd_schedules (id, user_id, name, roster_json, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())');
    $stmt->execute([
        $schedule['id'],
        (int)$user['id'],
        $schedule['name'],
        json_encode($schedule['roster'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);

    $row = findSchedule($config, $schedule['id'], (int)$user['id']);
    jsonResponse(201, [
        'ok' => true,
        'schedule' => publicSchedule($row),
    ]);
}

function handleScheduleUpdate(array $config): void
{
    $user = currentUser($config, true);
    $id = (string)($_GET['id'] ?? '');
    $existing = findSchedule($config, $id, (int)$user['id']);
    if (!$existing) {
        jsonError(404, 'schedule_not_found', '일정을 찾지 못했습니다.');
    }

    $body = readJsonBody();
    $name = array_key_exists('name', $body) ? normalizeScheduleName($body['name']) : $existing['name'];
    $roster = array_key_exists('roster', $body)
        ? normalizeRoster($body['roster'])
        : decodeRoster($existing['roster_json']);

    $pdo = db($config);
    $stmt = $pdo->prepare('UPDATE wrd_schedules SET name = ?, roster_json = ?, updated_at = NOW() WHERE id = ? AND user_id = ?');
    $stmt->execute([
        $name,
        json_encode($roster, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        $id,
        (int)$user['id'],
    ]);

    $row = findSchedule($config, $id, (int)$user['id']);
    jsonResponse(200, [
        'ok' => true,
        'schedule' => publicSchedule($row),
    ]);
}

function handleScheduleDelete(array $config): void
{
    $user = currentUser($config, true);
    $id = (string)($_GET['id'] ?? '');

    $pdo = db($config);
    $stmt = $pdo->prepare('DELETE FROM wrd_schedules WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, (int)$user['id']]);

    if ($stmt->rowCount() < 1) {
        jsonError(404, 'schedule_not_found', '일정을 찾지 못했습니다.');
    }

    jsonResponse(200, ['ok' => true]);
}

function handleWclCharacter(array $config): void
{
    $name = trim((string)($_GET['name'] ?? ''));
    $realm = trim((string)($_GET['realm'] ?? '아즈샤라'));

    if ($name === '') {
        jsonError(400, 'missing_name', '닉네임을 입력해야 합니다.');
    }
    if (!hasWclCredentials($config)) {
        jsonError(503, 'missing_credentials', 'WCL API 키가 아직 설정되지 않았습니다.');
    }

    $attempts = unique([$realm, slugifyRealm($realm)]);
    foreach ($attempts as $serverSlug) {
        $character = queryWclCharacter($config, $name, $realm, $serverSlug, 'kr');
        if ($character) {
            jsonResponse(200, [
                'ok' => true,
                'character' => $character,
            ]);
        }
    }

    jsonError(404, 'not_found', "{$name}-{$realm} 캐릭터를 WCL에서 찾지 못했습니다.");
}

function queryWclCharacter(array $config, string $name, string $realm, string $serverSlug, string $serverRegion): ?array
{
    $query = <<<'GRAPHQL'
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
GRAPHQL;

    $data = wclGraphql($config, $query, [
        'name' => $name,
        'serverSlug' => $serverSlug,
        'serverRegion' => $serverRegion,
    ]);
    $character = $data['characterData']['character'] ?? null;
    if (!$character) {
        return null;
    }

    $wowClass = classIdToName((int)($character['classID'] ?? 0));
    $spec = getSpecFromGameData($character['gameData'] ?? null);

    return [
        'id' => $character['id'] ?? null,
        'name' => $character['name'] ?? $name,
        'realm' => $realm,
        'realmSlug' => $serverSlug,
        'wowClass' => $wowClass,
        'spec' => $spec,
        'role' => $spec ? inferRole($spec) : null,
        'level' => $character['level'] ?? null,
        'wclUrl' => buildWclUrl($character['name'] ?? $name, $realm),
    ];
}

function wclGraphql(array $config, string $query, array $variables): array
{
    $token = getWclToken($config);
    [$status, $raw] = httpPost(WCL_GRAPHQL_URL, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ], json_encode([
        'query' => $query,
        'variables' => $variables,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    $payload = json_decode($raw, true);
    if ($status < 200 || $status >= 300 || !is_array($payload) || !empty($payload['errors'])) {
        $messages = [];
        foreach (($payload['errors'] ?? []) as $error) {
            $messages[] = $error['message'] ?? 'WCL GraphQL 오류';
        }
        throw new RuntimeException($messages ? implode(' / ', $messages) : "WCL GraphQL 요청 실패 ({$status})");
    }

    return $payload['data'] ?? [];
}

function getWclToken(array $config): string
{
    $cached = $_SESSION['wcl_token'] ?? null;
    if (is_array($cached) && ($cached['expires_at'] ?? 0) > time() + 60) {
        return (string)$cached['access_token'];
    }

    $clientId = (string)($config['wcl']['client_id'] ?? '');
    $clientSecret = (string)($config['wcl']['client_secret'] ?? '');
    [$status, $raw] = httpPost(WCL_TOKEN_URL, [
        'Authorization: Basic ' . base64_encode($clientId . ':' . $clientSecret),
        'Content-Type: application/x-www-form-urlencoded',
    ], 'grant_type=client_credentials');

    $payload = json_decode($raw, true);
    if ($status < 200 || $status >= 300 || !is_array($payload) || empty($payload['access_token'])) {
        throw new RuntimeException($payload['message'] ?? "WCL 토큰 발급 실패 ({$status})");
    }

    $_SESSION['wcl_token'] = [
        'access_token' => $payload['access_token'],
        'expires_at' => time() + (int)($payload['expires_in'] ?? 3600),
    ];

    return (string)$payload['access_token'];
}

function httpPost(string $url, array $headers, string $body): array
{
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($curl);
        if ($raw === false) {
            $message = curl_error($curl);
            curl_close($curl);
            throw new RuntimeException($message ?: '외부 API 요청에 실패했습니다.');
        }
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        return [$status, (string)$raw];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $body,
            'ignore_errors' => true,
            'timeout' => 20,
        ],
    ]);
    $raw = file_get_contents($url, false, $context);
    if ($raw === false) {
        throw new RuntimeException('외부 API 요청에 실패했습니다.');
    }

    $status = 0;
    foreach (($http_response_header ?? []) as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $match)) {
            $status = (int)$match[1];
            break;
        }
    }

    return [$status, (string)$raw];
}

function db(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $db = $config['db'] ?? [];
    $host = (string)($db['host'] ?? 'localhost');
    $port = (int)($db['port'] ?? 3306);
    $name = (string)($db['name'] ?? '');
    $user = (string)($db['user'] ?? '');
    $password = (string)($db['password'] ?? '');

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function currentUser(array $config, bool $required): ?array
{
    $id = (int)($_SESSION['user_id'] ?? 0);
    if ($id < 1) {
        if ($required) {
            jsonError(401, 'login_required', '로그인이 필요합니다.');
        }
        return null;
    }

    $pdo = db($config);
    $stmt = $pdo->prepare('SELECT id, username, created_at FROM wrd_users WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();

    if (!$user && $required) {
        jsonError(401, 'login_required', '로그인이 필요합니다.');
    }

    return $user ?: null;
}

function findSchedule(array $config, string $id, int $userId): ?array
{
    if ($id === '') {
        return null;
    }

    $pdo = db($config);
    $stmt = $pdo->prepare('SELECT id, name, roster_json, created_at, updated_at FROM wrd_schedules WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function publicUser(array $user): array
{
    return [
        'username' => $user['username'],
        'createdAt' => $user['created_at'] ?? null,
    ];
}

function publicSchedule(array $schedule): array
{
    return [
        'id' => $schedule['id'],
        'name' => $schedule['name'],
        'roster' => decodeRoster($schedule['roster_json'] ?? '[]'),
        'createdAt' => $schedule['created_at'] ?? null,
        'updatedAt' => $schedule['updated_at'] ?? null,
    ];
}

function decodeRoster(string $json): array
{
    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function normalizeRoster($roster): array
{
    if (!is_array($roster)) {
        return [];
    }

    $normalized = [];
    foreach (array_slice($roster, 0, 40) as $index => $character) {
        if (!is_array($character)) {
            continue;
        }
        $name = trim((string)($character['name'] ?? ''));
        if ($name === '') {
            continue;
        }

        $normalized[] = [
            'id' => trim((string)($character['id'] ?? '')) ?: uuidV4(),
            'name' => mb_substr($name, 0, 40),
            'realm' => mb_substr(trim((string)($character['realm'] ?? '아즈샤라')) ?: '아즈샤라', 0, 40),
            'wowClass' => mb_substr(trim((string)($character['wowClass'] ?? 'WCL 연동 대기')) ?: 'WCL 연동 대기', 0, 40),
            'spec' => mb_substr(trim((string)($character['spec'] ?? '')), 0, 40),
            'role' => mb_substr(trim((string)($character['role'] ?? '딜러')) ?: '딜러', 0, 20),
            'order' => is_numeric($character['order'] ?? null) ? (int)$character['order'] : $index,
        ];
    }

    return $normalized;
}

function normalizeUsername($username): string
{
    return trim((string)$username);
}

function isValidUsername(string $username): bool
{
    return mb_strlen($username) >= 2 && mb_strlen($username) <= 24 && !preg_match('/\s/u', $username);
}

function normalizeScheduleName($name): string
{
    $name = trim((string)$name);
    return mb_substr($name === '' ? '새 일정' : $name, 0, 40);
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        jsonError(400, 'invalid_json', '요청 형식이 올바르지 않습니다.');
    }
    return $decoded;
}

function requireMethod(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        jsonError(405, 'method_not_allowed', '지원하지 않는 요청입니다.');
    }
}

function startAppSession(): void
{
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 30,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function jsonResponse(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonError(int $status, string $code, string $message): void
{
    jsonResponse($status, [
        'ok' => false,
        'code' => $code,
        'message' => $message,
    ]);
}

function uuidV4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function hasWclCredentials(array $config): bool
{
    return !empty($config['wcl']['client_id']) && !empty($config['wcl']['client_secret']);
}

function classIdToName(int $classId): string
{
    $classes = [
        1 => '죽음의 기사',
        2 => '드루이드',
        3 => '사냥꾼',
        4 => '마법사',
        5 => '수도사',
        6 => '성기사',
        7 => '사제',
        8 => '도적',
        9 => '주술사',
        10 => '흑마법사',
        11 => '전사',
        12 => '악마사냥꾼',
        13 => '기원사',
    ];
    return $classes[$classId] ?? 'WCL 연동 대기';
}

function getSpecFromGameData($gameData): string
{
    if (!is_array($gameData)) {
        return '';
    }

    $candidates = [
        $gameData['spec'] ?? null,
        $gameData['specName'] ?? null,
        $gameData['activeSpec'] ?? null,
        $gameData['activeSpecName'] ?? null,
        $gameData['character']['spec'] ?? null,
        $gameData['character']['specName'] ?? null,
    ];

    foreach ($candidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') {
            return normalizeSpecName(trim($candidate));
        }
        if (is_array($candidate) && isset($candidate['name']) && is_string($candidate['name'])) {
            return normalizeSpecName(trim($candidate['name']));
        }
    }

    return '';
}

function normalizeSpecName(string $spec): string
{
    $specs = [
        'Blood' => '혈기',
        'Frost' => '냉기',
        'Unholy' => '부정',
        'Havoc' => '파멸',
        'Vengeance' => '복수',
        'Balance' => '조화',
        'Feral' => '야성',
        'Guardian' => '수호',
        'Restoration' => '회복',
        'Devastation' => '황폐',
        'Preservation' => '보존',
        'Augmentation' => '증강',
        'Beast Mastery' => '야수',
        'Marksmanship' => '사격',
        'Survival' => '생존',
        'Arcane' => '비전',
        'Fire' => '화염',
        'Brewmaster' => '양조',
        'Mistweaver' => '운무',
        'Windwalker' => '풍운',
        'Holy' => '신성',
        'Protection' => '보호',
        'Retribution' => '징벌',
        'Discipline' => '수양',
        'Shadow' => '암흑',
        'Assassination' => '암살',
        'Outlaw' => '무법',
        'Subtlety' => '잠행',
        'Elemental' => '정기',
        'Enhancement' => '고양',
        'Affliction' => '고통',
        'Demonology' => '악마',
        'Destruction' => '파괴',
        'Arms' => '무기',
        'Fury' => '분노',
    ];
    return $specs[$spec] ?? $spec;
}

function inferRole(string $spec): string
{
    $tankSpecs = ['혈기', '복수', '수호', '양조', '보호', '방어'];
    $healerSpecs = ['회복', '보존', '운무', '신성', '수양', '복원'];
    if (in_array($spec, $tankSpecs, true)) {
        return '탱커';
    }
    if (in_array($spec, $healerSpecs, true)) {
        return '힐러';
    }
    return '딜러';
}

function slugifyRealm(string $realm): string
{
    $map = [
        '아즈샤라' => 'azshara',
        '하이잘' => 'hyjal',
        '헬스크림' => 'hellscream',
        '윈드러너' => 'windrunner',
        '불타는군단' => 'burning-legion',
        '데스윙' => 'deathwing',
        '듀로탄' => 'durotan',
        '세나리우스' => 'cenarius',
    ];
    if (isset($map[$realm])) {
        return $map[$realm];
    }

    $lower = function_exists('mb_strtolower') ? mb_strtolower($realm, 'UTF-8') : strtolower($realm);
    return preg_replace('/\s+/u', '-', $lower);
}

function buildWclUrl(string $name, string $realm): string
{
    return 'https://www.warcraftlogs.com/character/kr/' . rawurlencode(slugifyRealm($realm)) . '/' . rawurlencode($name);
}

function unique(array $values): array
{
    $seen = [];
    foreach ($values as $value) {
        if ($value === '' || isset($seen[$value])) {
            continue;
        }
        $seen[$value] = true;
    }
    return array_keys($seen);
}
