const pendingClass = "WCL 연동 대기";
const storageKey = "wow-raid-roster-v4";
const themeKey = "raid-dashboard-theme";
const localScheduleNameKey = "wow-raid-roster-local-schedule-name";

const classes = [
  { name: "죽음의 기사", color: "#c41e3a", icon: "deathknight.jpg" },
  { name: "악마사냥꾼", color: "#a330c9", icon: "demonhunter.jpg" },
  { name: "드루이드", color: "#ff7c0a", icon: "druid.jpg" },
  { name: "기원사", color: "#33937f", icon: "evoker.jpg" },
  { name: "사냥꾼", color: "#aad372", icon: "hunter.jpg" },
  { name: "마법사", color: "#3fc7eb", icon: "mage.jpg" },
  { name: "수도사", color: "#00ff98", icon: "monk.jpg" },
  { name: "성기사", color: "#f48cba", icon: "paladin.jpg" },
  { name: "사제", color: "#f4f4f4", icon: "priest.jpg" },
  { name: "도적", color: "#fff468", icon: "rogue.jpg" },
  { name: "주술사", color: "#0070dd", icon: "shaman.jpg" },
  { name: "흑마법사", color: "#8788ee", icon: "warlock.jpg" },
  { name: "전사", color: "#c69b6d", icon: "warrior.jpg" },
];

const specsByClass = {
  "죽음의 기사": [
    { name: "혈기", icon: "deathknight-blood.jpg" },
    { name: "냉기", icon: "deathknight-frost.jpg" },
    { name: "부정", icon: "deathknight-unholy.jpg" },
  ],
  "악마사냥꾼": [
    { name: "파멸", icon: "demonhunter-havoc.jpg" },
    { name: "복수", icon: "demonhunter-vengeance.jpg" },
    { name: "포식", icon: "https://wow.zamimg.com/images/wow/icons/large/classicon_demonhunter_void_256.jpg" },
  ],
  "드루이드": [
    { name: "조화", icon: "druid-balance.jpg" },
    { name: "야성", icon: "druid-feral.jpg" },
    { name: "수호", icon: "druid-guardian.jpg" },
    { name: "회복", icon: "druid-restoration.jpg" },
  ],
  "기원사": [
    { name: "황폐", icon: "evoker-devastation.jpg" },
    { name: "보존", icon: "evoker-preservation.jpg" },
    { name: "증강", icon: "evoker-augmentation.jpg" },
  ],
  "사냥꾼": [
    { name: "야수", icon: "hunter-beastmastery.jpg" },
    { name: "사격", icon: "hunter-marksmanship.jpg" },
    { name: "생존", icon: "hunter-survival.jpg" },
  ],
  "마법사": [
    { name: "비전", icon: "mage-arcane.jpg" },
    { name: "화염", icon: "mage-fire.jpg" },
    { name: "냉기", icon: "mage-frost.jpg" },
  ],
  "수도사": [
    { name: "양조", icon: "monk-brewmaster.jpg" },
    { name: "운무", icon: "monk-mistweaver.jpg" },
    { name: "풍운", icon: "monk-windwalker.jpg" },
  ],
  "성기사": [
    { name: "신성", icon: "paladin-holy.jpg" },
    { name: "보호", icon: "paladin-protection.jpg" },
    { name: "징벌", icon: "paladin-retribution.jpg" },
  ],
  "사제": [
    { name: "수양", icon: "priest-discipline.jpg" },
    { name: "신성", icon: "priest-holy.jpg" },
    { name: "암흑", icon: "priest-shadow.jpg" },
  ],
  "도적": [
    { name: "암살", icon: "rogue-assassination.jpg" },
    { name: "무법", icon: "rogue-outlaw.jpg" },
    { name: "잠행", icon: "rogue-subtlety.jpg" },
  ],
  "주술사": [
    { name: "정기", icon: "shaman-elemental.jpg" },
    { name: "고양", icon: "shaman-enhancement.jpg" },
    { name: "복원", icon: "shaman-restoration.jpg" },
  ],
  "흑마법사": [
    { name: "고통", icon: "warlock-affliction.jpg" },
    { name: "악마", icon: "warlock-demonology.jpg" },
    { name: "파괴", icon: "warlock-destruction.jpg" },
  ],
  "전사": [
    { name: "무기", icon: "warrior-arms.jpg" },
    { name: "분노", icon: "warrior-fury.jpg" },
    { name: "방어", icon: "warrior-protection.jpg" },
  ],
};

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

const tankSpecs = new Set(["혈기", "복수", "수호", "양조", "보호", "방어"]);
const healerSpecs = new Set(["회복", "보존", "운무", "신성", "수양", "복원"]);

const sampleRoster = [
  ["샘플죽음의기사캐릭터", "아즈샤라", "죽음의 기사", "혈기", "탱커"],
  ["샘플성기사캐릭터", "아즈샤라", "성기사", "보호", "탱커"],
  ["샘플드루이드캐릭터", "아즈샤라", "드루이드", "회복", "힐러"],
  ["샘플수도사캐릭터", "아즈샤라", "수도사", "운무", "힐러"],
  ["샘플사제캐릭터", "아즈샤라", "사제", "신성", "힐러"],
  ["샘플주술사캐릭터", "아즈샤라", "주술사", "복원", "힐러"],
  ["샘플악마사냥꾼캐릭터", "아즈샤라", "악마사냥꾼", "포식", "딜러"],
  ["샘플기원사캐릭터", "아즈샤라", "기원사", "증강", "딜러"],
  ["샘플사냥꾼캐릭터", "아즈샤라", "사냥꾼", "야수", "딜러"],
  ["샘플마법사캐릭터", "아즈샤라", "마법사", "비전", "딜러"],
  ["샘플도적캐릭터", "아즈샤라", "도적", "암살", "딜러"],
  ["샘플흑마법사캐릭터", "아즈샤라", "흑마법사", "고통", "딜러"],
  ["샘플전사캐릭터", "아즈샤라", "전사", "무기", "딜러"],
].map(([name, realm, wowClass, spec, role], index) => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}`,
  name,
  realm,
  wowClass,
  spec,
  role,
  healerDpsSwap: false,
  order: index,
}));

const rosterBody = document.querySelector("#rosterBody");
const rowTemplate = document.querySelector("#rowTemplate");
const roleFilter = document.querySelector("#roleFilter");
const addForm = document.querySelector("#addForm");
const importButton = document.querySelector("#importButton");
const exportButton = document.querySelector("#exportButton");
const resetButton = document.querySelector("#resetButton");
const themeToggle = document.querySelector("#themeToggle");
const lookupStatus = document.querySelector("#lookupStatus");
const sortMenuButton = document.querySelector("#sortMenuButton");
const sortMenu = document.querySelector("#sortMenu");
const sortLabel = document.querySelector("#sortLabel");
const authPanel = document.querySelector("#authPanel");
const authForm = document.querySelector("#authForm");
const authUsername = document.querySelector("#authUsername");
const authPassword = document.querySelector("#authPassword");
const registerButton = document.querySelector("#registerButton");
const sessionPanel = document.querySelector("#sessionPanel");
const userLabel = document.querySelector("#userLabel");
const logoutButton = document.querySelector("#logoutButton");
const authStatus = document.querySelector("#authStatus");
const schedulePanel = document.querySelector("#schedulePanel");
const scheduleSelect = document.querySelector("#scheduleSelect");
const scheduleNameInput = document.querySelector("#scheduleNameInput");
const saveScheduleNameButton = document.querySelector("#saveScheduleNameButton");
const newScheduleButton = document.querySelector("#newScheduleButton");
const deleteScheduleButton = document.querySelector("#deleteScheduleButton");
const saveStatus = document.querySelector("#saveStatus");

let roster = loadRoster();
let currentUser = null;
let schedules = [];
let activeScheduleId = "";
let saveTimer = null;
let dragState = null;

initializeTheme();
roster = normalizeRosterOrder(roster);
render();
initializeApp();

function loadRoster() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return cloneRoster(sampleRoster);
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    return cloneRoster(sampleRoster);
  }
}

function saveRoster() {
  roster = normalizeRosterOrder(roster);
  if (!currentUser || !activeScheduleId) {
    localStorage.setItem(storageKey, JSON.stringify(roster));
    setSaveStatus("로컬 저장됨", "good");
    return;
  }

  const activeSchedule = getActiveSchedule();
  if (!activeSchedule) {
    return;
  }

  activeSchedule.roster = cloneRoster(roster);
  activeSchedule.updatedAt = new Date().toISOString();
  queueScheduleSave();
}

function cloneRoster(entries) {
  return JSON.parse(JSON.stringify(entries || []));
}

function normalizeRosterOrder(entries) {
  return cloneRoster(entries)
    .map((character, index) => ({
      ...character,
      order: Number.isFinite(character.order) ? character.order : index,
      healerDpsSwap: Boolean(character.healerDpsSwap),
    }))
    .sort(compareManualOrder)
    .map((character, index) => ({ ...character, order: index }));
}

function compareManualOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

async function initializeApp() {
  try {
    const session = await apiRequest("/api/session");
    if (session.authenticated) {
      currentUser = session.user;
      await loadSchedules({ migrateLocal: false });
      setAuthStatus("로그인 상태입니다.", "good");
      return;
    }
  } catch (error) {
    currentUser = null;
    schedules = [];
    activeScheduleId = "";
    setAuthStatus("서버 저장소를 확인하지 못했습니다. 로컬 저장으로 사용할 수 있습니다.", "warn");
  }

  updateAuthUi();
  updateScheduleUi();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "요청을 처리하지 못했습니다.");
    error.code = payload.code;
    throw error;
  }

  return payload;
}

async function submitAuth(mode) {
  const username = authUsername.value.trim();
  const password = authPassword.value;
  if (!username || !password) {
    setAuthStatus("아이디와 비밀번호를 입력해 주세요.", "bad");
    return;
  }

  setAuthBusy(true);
  setAuthStatus(mode === "register" ? "계정을 만드는 중입니다..." : "로그인 중입니다...");

  try {
    const payload = await apiRequest(`/api/auth/${mode}`, {
      method: "POST",
      body: { username, password },
    });
    currentUser = payload.user;
    authPassword.value = "";
    await loadSchedules({ migrateLocal: true });
    setAuthStatus(`${currentUser.username} 계정으로 저장합니다.`, "good");
  } catch (error) {
    currentUser = null;
    schedules = [];
    activeScheduleId = "";
    updateAuthUi();
    updateScheduleUi();
    setAuthStatus(error.message, "bad");
  } finally {
    setAuthBusy(false);
  }
}

async function logout() {
  await flushScheduleSave();
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    // The local UI can still return to guest mode even if the session was already gone.
  }

  currentUser = null;
  schedules = [];
  activeScheduleId = "";
  roster = loadRoster();
  updateAuthUi();
  updateScheduleUi();
  setAuthStatus("로그아웃했습니다. 지금 명단은 이 브라우저에만 저장됩니다.", "neutral");
  render();
}

async function loadSchedules({ migrateLocal }) {
  const payload = await apiRequest("/api/schedules");
  schedules = payload.schedules || [];

  if (!schedules.length) {
    const initialRoster = migrateLocal ? normalizeRosterOrder(roster) : [];
    const created = await apiRequest("/api/schedules", {
      method: "POST",
      body: {
        name: localStorage.getItem(localScheduleNameKey) || "첫 일정",
        roster: initialRoster,
      },
    });
    schedules = [created.schedule];
  }

  activeScheduleId = schedules[0].id;
  roster = normalizeRosterOrder(schedules[0].roster);
  updateAuthUi();
  updateScheduleUi();
  render();
}

function updateAuthUi() {
  const loggedIn = Boolean(currentUser);
  authForm.hidden = loggedIn;
  sessionPanel.hidden = !loggedIn;
  if (loggedIn) {
    userLabel.textContent = currentUser.username;
  }
}

function updateScheduleUi() {
  const loggedIn = Boolean(currentUser);
  schedulePanel.hidden = !loggedIn;

  if (!loggedIn) {
    setSaveStatus("로컬 저장", "neutral");
    return;
  }

  const activeSchedule = getActiveSchedule();
  scheduleSelect.innerHTML = "";
  schedules.forEach((schedule) => {
    const option = document.createElement("option");
    option.value = schedule.id;
    option.textContent = `${schedule.name} · ${schedule.roster.length}명`;
    option.selected = schedule.id === activeScheduleId;
    scheduleSelect.append(option);
  });
  scheduleNameInput.value = activeSchedule ? activeSchedule.name : "";
  deleteScheduleButton.disabled = schedules.length <= 1;
  setSaveStatus("저장됨", "good");
}

function getActiveSchedule() {
  return schedules.find((schedule) => schedule.id === activeScheduleId);
}

function setAuthStatus(message, tone = "neutral") {
  authStatus.textContent = message;
  authStatus.dataset.tone = tone;
}

function setSaveStatus(message, tone = "neutral") {
  saveStatus.textContent = message;
  saveStatus.dataset.tone = tone;
}

function setAuthBusy(isBusy) {
  authForm.querySelectorAll("input, button").forEach((control) => {
    control.disabled = isBusy;
  });
}

function queueScheduleSave() {
  setSaveStatus("저장 중...", "neutral");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveActiveSchedule().catch((error) => {
      setSaveStatus(error.message, "bad");
    });
  }, 350);
}

async function flushScheduleSave() {
  if (!saveTimer) {
    return;
  }

  clearTimeout(saveTimer);
  saveTimer = null;
  await saveActiveSchedule();
}

async function saveActiveSchedule() {
  const activeSchedule = getActiveSchedule();
  if (!currentUser || !activeSchedule) {
    return;
  }

  saveTimer = null;
  const payload = await apiRequest(`/api/schedules/${activeSchedule.id}`, {
    method: "PUT",
    body: {
      name: activeSchedule.name,
      roster: roster,
    },
  });
  schedules = schedules.map((schedule) =>
    schedule.id === payload.schedule.id ? payload.schedule : schedule
  );
  setSaveStatus("저장됨", "good");
  updateScheduleUi();
}

async function switchSchedule(scheduleId) {
  if (scheduleId === activeScheduleId) {
    return;
  }

  await flushScheduleSave();
  const nextSchedule = schedules.find((schedule) => schedule.id === scheduleId);
  if (!nextSchedule) {
    return;
  }

  activeScheduleId = scheduleId;
  roster = normalizeRosterOrder(nextSchedule.roster);
  updateScheduleUi();
  render();
}

async function createSchedule() {
  await flushScheduleSave();
  const nextNumber = schedules.length + 1;
  const name = `새 일정 ${nextNumber}`;
  setSaveStatus("새 일정을 만드는 중...", "neutral");
  try {
    const payload = await apiRequest("/api/schedules", {
      method: "POST",
      body: { name, roster: [] },
    });
    schedules = [payload.schedule, ...schedules];
    activeScheduleId = payload.schedule.id;
    roster = [];
    updateScheduleUi();
    render();
    scheduleNameInput.focus();
    scheduleNameInput.select();
    setSaveStatus("새 일정 저장됨", "good");
  } catch (error) {
    setSaveStatus(error.message, "bad");
  }
}

async function renameActiveSchedule() {
  const activeSchedule = getActiveSchedule();
  if (!activeSchedule) {
    return;
  }

  activeSchedule.name = scheduleNameInput.value.trim() || "새 일정";
  setSaveStatus("이름 저장 중...", "neutral");
  try {
    await saveActiveSchedule();
  } catch (error) {
    setSaveStatus(error.message, "bad");
  }
}

async function deleteActiveSchedule() {
  const activeSchedule = getActiveSchedule();
  if (!activeSchedule || schedules.length <= 1) {
    return;
  }

  const ok = window.confirm(`${activeSchedule.name} 일정을 삭제할까요?`);
  if (!ok) {
    return;
  }

  await flushScheduleSave();
  setSaveStatus("삭제 중...", "neutral");
  try {
    await apiRequest(`/api/schedules/${activeSchedule.id}`, { method: "DELETE" });
    schedules = schedules.filter((schedule) => schedule.id !== activeSchedule.id);
    activeScheduleId = schedules[0]?.id || "";
    roster = normalizeRosterOrder(schedules[0]?.roster || []);
    updateScheduleUi();
    render();
    setSaveStatus("삭제됨", "good");
  } catch (error) {
    setSaveStatus(error.message, "bad");
  }
}

function parseCharacterInput(value) {
  const trimmed = value.trim();
  const separator = trimmed.lastIndexOf("-");
  if (separator > 0 && separator < trimmed.length - 1) {
    return {
      name: trimmed.slice(0, separator).trim(),
      realm: trimmed.slice(separator + 1).trim(),
    };
  }
  return { name: trimmed, realm: "아즈샤라" };
}

function getClassMeta(className) {
  return classes.find((wowClass) => wowClass.name === className);
}

function slugifyRealm(realm) {
  const cleaned = realm.trim();
  return realmSlugMap[cleaned] || cleaned.toLowerCase().replace(/\s+/g, "-");
}

function buildWclUrl(character) {
  return `https://www.warcraftlogs.com/character/kr/${encodeURIComponent(
    slugifyRealm(character.realm)
  )}/${encodeURIComponent(character.name.trim())}`;
}

function openWcl(character) {
  window.open(buildWclUrl(character), "_blank", "noopener,noreferrer");
}

function getInviteName(character) {
  if (!character.realm || character.realm === "아즈샤라") {
    return character.name;
  }
  return `${character.name}-${character.realm}`;
}

function setLookupStatus(message, tone = "neutral") {
  lookupStatus.textContent = message;
  lookupStatus.dataset.tone = tone;
}

async function fetchWclCharacter(character) {
  const params = new URLSearchParams({
    name: character.name,
    realm: character.realm,
  });
  const response = await fetch(`/api/wcl-character?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "WCL 정보를 가져오지 못했습니다.");
    error.code = payload.code;
    throw error;
  }

  return payload.character;
}

function getFilteredRoster() {
  return [...roster]
    .sort(compareManualOrder)
    .filter((character) => {
      const matchesRole = roleFilter.value === "all" || character.role === roleFilter.value;
      return matchesRole;
    });
}

function renderSpecIcons(container, character) {
  const specs = specsByClass[character.wowClass] || [];
  container.innerHTML = "";
  container.classList.toggle("selected", Boolean(character.spec));
  container.classList.toggle("missing", !character.spec);

  if (!specs.length) {
    const pending = document.createElement("span");
    pending.className = "spec-pending";
    pending.textContent = "WCL 연동 후 선택";
    container.append(pending);
    return;
  }

  specs.forEach((spec) => {
    const button = document.createElement("button");
    button.className = "spec-button";
    button.type = "button";
    button.title = spec.name;
    button.setAttribute("aria-label", spec.name);
    button.setAttribute("aria-pressed", String(character.spec === spec.name));
    button.classList.toggle("active", character.spec === spec.name);
    button.innerHTML = `<img src="${resolveIconSrc(spec.icon, "icons")}" alt="">`;
    button.addEventListener("click", () => {
      updateCharacter(character.id, {
        spec: spec.name,
        role: inferRoleFromSpec(spec.name),
      });
    });
    container.append(button);
  });
}

function renderRoleMenu(row, character) {
  const roleButton = row.querySelector(".role-icon-button");
  const popover = row.querySelector(".role-popover");
  roleButton.innerHTML = roleIconSvg(character.role);
  roleButton.dataset.role = character.role;
  roleButton.title = `${character.role} 선택`;

  roleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeRolePopovers(popover);
    const isOpen = !popover.hidden;
    popover.hidden = isOpen;
    roleButton.setAttribute("aria-expanded", String(!isOpen));
  });

  popover.querySelectorAll("[data-role]").forEach((button) => {
    const role = button.dataset.role;
    button.innerHTML = `${roleIconSvg(role)}<span>${role}</span>`;
    button.classList.toggle("active", role === character.role);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      updateCharacter(character.id, { role });
    });
  });
}

function closeRolePopovers(except) {
  document.querySelectorAll(".role-popover").forEach((popover) => {
    if (popover === except) {
      return;
    }
    popover.hidden = true;
    const button = popover.parentElement?.querySelector(".role-icon-button");
    button?.setAttribute("aria-expanded", "false");
  });
}

function renderProgress(row, character) {
  const progressPill = row.querySelector(".progress-pill");
  const progress = character.progress || "";
  progressPill.textContent = progress || "미확인";
  progressPill.classList.toggle("empty", !progress);
  progressPill.classList.toggle("mythic", /M$/.test(progress));
  progressPill.classList.toggle("heroic", /H$/.test(progress));
}

function resolveIconSrc(icon, folder) {
  if (/^https?:\/\//.test(icon)) {
    return icon;
  }
  return `assets/${folder}/${icon}`;
}

function renderRoster() {
  rosterBody.innerHTML = "";
  const filteredRoster = getFilteredRoster();
  document.querySelector("#visibleCount").textContent = `${filteredRoster.length}명 표시`;

  filteredRoster.forEach((character) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = character.id;
    const dragHandle = row.querySelector(".drag-handle");
    dragHandle.addEventListener("pointerdown", (event) => {
      beginRowDrag(event, row, character);
    });

    const classMeta = getClassMeta(character.wowClass);
    const classBadge = row.querySelector(".class-badge");
    const specIcons = row.querySelector(".spec-icons");
    const specCell = row.querySelector(".spec-cell");
    const hasSpec = Boolean(character.spec);

    row.querySelector(".char-name").textContent = character.name;
    row.querySelector(".realm").textContent = character.realm;
    renderRoleMenu(row, character);
    renderProgress(row, character);
    classBadge.textContent = character.wowClass || pendingClass;
    classBadge.style.color = classMeta ? classMeta.color : "var(--muted)";
    classBadge.classList.toggle("pending", !classMeta);
    specCell.classList.toggle("selected", hasSpec);
    specCell.classList.toggle("missing", !hasSpec);
    specCell.title = hasSpec ? `${character.spec} 전문화 선택됨` : "전문화 선택 필요";
    renderSpecIcons(specIcons, character);

    const swapToggle = row.querySelector(".swap-icon");
    const showSwapToggle = canShowHealerDpsSwap(character);
    swapToggle.hidden = !showSwapToggle;
    swapToggle.classList.toggle("active", Boolean(character.healerDpsSwap));
    swapToggle.setAttribute("aria-pressed", String(Boolean(character.healerDpsSwap)));
    swapToggle.innerHTML = swapSvg();
    swapToggle.addEventListener("click", () => {
      updateCharacter(character.id, { healerDpsSwap: !character.healerDpsSwap });
    });

    row.querySelector(".wcl-row-button").addEventListener("click", () => {
      openWcl(character);
    });
    row.querySelector(".refresh-row-button").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = "...";
      try {
        const wclCharacter = await fetchWclCharacter(character);
        updateCharacter(character.id, {
          name: wclCharacter.name || character.name,
          realm: wclCharacter.realm || character.realm,
          wowClass: wclCharacter.wowClass || character.wowClass,
          spec: wclCharacter.spec || character.spec,
          role: wclCharacter.role || inferRoleFromSpec(wclCharacter.spec) || character.role,
          progress: wclCharacter.progress || character.progress,
        });
        setLookupStatus(`${character.name} 정보를 갱신했습니다.`, "good");
      } catch (error) {
        setLookupStatus(error.message, "bad");
        render();
      }
    });
    row.querySelector(".remove-button").addEventListener("click", () => {
      roster = roster.filter((entry) => entry.id !== character.id);
      saveRoster();
      render();
    });

    rosterBody.append(row);
  });
}

function updateCharacter(id, patch) {
  roster = roster.map((character) =>
    character.id === id ? normalizeCharacterState({ ...character, ...patch }) : character
  );
  saveRoster();
  render();
}

function normalizeCharacterState(character) {
  if (!canShowHealerDpsSwap(character)) {
    return { ...character, healerDpsSwap: false };
  }
  return character;
}

function moveCharacterInVisibleOrder(draggedId, targetId, placeAfter) {
  const visibleIds = getFilteredRoster().map((character) => character.id);
  const fromIndex = visibleIds.indexOf(draggedId);
  const targetIndex = visibleIds.indexOf(targetId);
  if (fromIndex === -1 || targetIndex === -1) {
    return;
  }

  visibleIds.splice(fromIndex, 1);
  const adjustedTargetIndex = visibleIds.indexOf(targetId);
  visibleIds.splice(adjustedTargetIndex + (placeAfter ? 1 : 0), 0, draggedId);
  applyVisibleOrder(visibleIds);
}

function beginRowDrag(event, row, character) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  closeRolePopovers();
  const rect = row.getBoundingClientRect();
  const ghost = makeDragGhost(row, rect);
  dragState = {
    id: character.id,
    row,
    ghost,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    moved: false,
  };
  row.classList.add("dragging-source");
  document.body.classList.add("is-row-dragging");
  updateDragGhost(event);

  document.addEventListener("pointermove", handleRowDragMove);
  document.addEventListener("pointerup", finishRowDrag);
  document.addEventListener("pointercancel", cancelRowDrag);
}

function makeDragGhost(row, rect) {
  const ghost = document.createElement("table");
  ghost.className = "drag-ghost-table";
  ghost.style.width = `${rect.width}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  const body = document.createElement("tbody");
  const clone = row.cloneNode(true);
  clone.classList.remove("dragging-source");
  body.append(clone);
  ghost.append(body);
  document.body.append(ghost);
  return ghost;
}

function handleRowDragMove(event) {
  if (!dragState) {
    return;
  }

  dragState.moved = true;
  updateDragGhost(event);
  const targetRow = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest("#rosterBody tr");

  if (!targetRow || targetRow === dragState.row) {
    return;
  }

  const rect = targetRow.getBoundingClientRect();
  const placeAfter = event.clientY > rect.top + rect.height / 2;
  animateRosterRows(() => {
    if (placeAfter) {
      targetRow.after(dragState.row);
    } else {
      targetRow.before(dragState.row);
    }
  });
}

function updateDragGhost(event) {
  if (!dragState) {
    return;
  }
  dragState.ghost.style.left = `${event.clientX - dragState.offsetX}px`;
  dragState.ghost.style.top = `${event.clientY - dragState.offsetY}px`;
}

function animateRosterRows(mutator) {
  const rows = [...rosterBody.querySelectorAll("tr")];
  const firstRects = new Map(rows.map((row) => [row, row.getBoundingClientRect()]));
  mutator();
  [...rosterBody.querySelectorAll("tr")].forEach((row) => {
    const first = firstRects.get(row);
    if (!first) {
      return;
    }
    const last = row.getBoundingClientRect();
    const deltaY = first.top - last.top;
    if (!deltaY) {
      return;
    }
    row.style.transition = "none";
    row.style.transform = `translateY(${deltaY}px)`;
    requestAnimationFrame(() => {
      row.style.transition = "transform 150ms ease";
      row.style.transform = "";
    });
  });
}

function finishRowDrag() {
  if (!dragState) {
    return;
  }

  const visibleIds = [...rosterBody.querySelectorAll("tr")].map((row) => row.dataset.id);
  cleanupRowDrag();
  if (visibleIds.length) {
    applyVisibleOrder(visibleIds);
  }
}

function cancelRowDrag() {
  cleanupRowDrag();
  render();
}

function cleanupRowDrag() {
  if (!dragState) {
    return;
  }

  dragState.row.classList.remove("dragging-source");
  dragState.ghost.remove();
  dragState = null;
  document.body.classList.remove("is-row-dragging");
  document.removeEventListener("pointermove", handleRowDragMove);
  document.removeEventListener("pointerup", finishRowDrag);
  document.removeEventListener("pointercancel", cancelRowDrag);
}

function applyVisibleOrder(visibleIds) {
  const visibleSet = new Set(visibleIds);
  const charactersById = new Map(roster.map((character) => [character.id, character]));
  const orderedVisible = [...visibleIds];
  roster = [...roster]
    .sort(compareManualOrder)
    .map((character) => {
      if (!visibleSet.has(character.id)) {
        return character;
      }
      const nextId = orderedVisible.shift();
      return charactersById.get(nextId);
    })
    .map((character, index) => ({ ...character, order: index }));
  sortLabel.textContent = "수동 정렬";
  saveRoster();
  render();
}

function getNextOrder() {
  return roster.reduce((max, character) => Math.max(max, character.order ?? -1), -1) + 1;
}

const sortOptions = {
  "tank-healer-dps": {
    label: "탱 → 힐 → 딜",
    compare: makeRoleComparator(["탱커", "힐러", "딜러"]),
  },
  class: {
    label: "직업",
    compare: (a, b) =>
      classSortValue(a) - classSortValue(b) ||
      compareRole(["탱커", "힐러", "딜러"], a, b) ||
      compareName(a, b),
  },
  "name-asc": { label: "A-Z", compare: compareName },
  "name-desc": { label: "Z-A", compare: (a, b) => compareName(b, a) },
};

function makeRoleComparator(order) {
  return (a, b) => compareRole(order, a, b) || classSortValue(a) - classSortValue(b) || compareName(a, b);
}

function compareRole(order, a, b) {
  return roleSortValue(order, a.role) - roleSortValue(order, b.role);
}

function roleSortValue(order, role) {
  const index = order.indexOf(role);
  return index === -1 ? order.length : index;
}

function classSortValue(character) {
  const index = classes.findIndex((wowClass) => wowClass.name === character.wowClass);
  return index === -1 ? classes.length : index;
}

function compareName(a, b) {
  return a.name.localeCompare(b.name, "ko-KR", { numeric: true, sensitivity: "base" });
}

function applySort(sortKey) {
  const option = sortOptions[sortKey] || sortOptions["tank-healer-dps"];
  roster = [...roster]
    .sort(option.compare)
    .map((character, index) => ({ ...character, order: index }));
  sortLabel.textContent = option.label;
  closeSortMenu();
  saveRoster();
  render();
}

function toggleSortMenu() {
  const isOpen = !sortMenu.hidden;
  sortMenu.hidden = isOpen;
  sortMenuButton.setAttribute("aria-expanded", String(!isOpen));
}

function closeSortMenu() {
  sortMenu.hidden = true;
  sortMenuButton.setAttribute("aria-expanded", "false");
}

function renderSummary() {
  const countByRole = roleName =>
    roster.filter((character) => character.role === roleName).length;
  const representedClasses = countRepresentedClasses();

  document.querySelector("#totalCount").textContent = roster.length;
  document.querySelector("#tankCount").textContent = countByRole("탱커");
  document.querySelector("#healerCount").textContent = countByRole("힐러");
  document.querySelector("#dpsCount").textContent = countByRole("딜러");
  document.querySelector("#synergyCount").textContent =
    `${representedClasses}/${classes.length}`;
}

function makeCheck(label, level, value) {
  const item = document.createElement("div");
  item.className = `check ${level}`;
  item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
  return item;
}

function renderChecks() {
  const checks = document.querySelector("#balanceChecks");
  checks.innerHTML = "";
  const tanks = roster.filter((character) => character.role === "탱커").length;
  const healers = roster.filter((character) => character.role === "힐러").length;
  const dps = roster.filter((character) => character.role === "딜러").length;
  const classCounts = countBy("wowClass");
  const overStacked = Object.entries(classCounts).filter(
    ([className, count]) => className !== pendingClass && count >= 4
  );

  checks.append(
    makeCheck("탱커", tanks === 2 ? "good" : "bad", `${tanks}/2`),
    makeCheck("힐러", healers >= 4 && healers <= 5 ? "good" : "warn", `${healers}/4~5`),
    makeCheck("딜러", dps >= 13 && dps <= 14 ? "good" : "warn", `${dps}/13~14`),
    makeCheck(
      "직업 쏠림",
      overStacked.length ? "warn" : "good",
      overStacked.length ? overStacked.map(([name]) => name).join(", ") : "양호"
    )
  );
}

function countRepresentedClasses() {
  const classCounts = countBy("wowClass");
  return classes.filter((wowClass) => classCounts[wowClass.name]).length;
}

function countBy(field) {
  return roster.reduce((counts, character) => {
    counts[character[field]] = (counts[character[field]] || 0) + 1;
    return counts;
  }, {});
}

function renderClassBars() {
  const classBars = document.querySelector("#classBars");
  const classCounts = countBy("wowClass");
  delete classCounts[pendingClass];
  classBars.innerHTML = "";

  classes
    .forEach((wowClass) => {
      const count = classCounts[wowClass.name];
      classBars.append(makeClassTile({
        classMeta: wowClass,
        count: count || 0,
        label: wowClass.name,
        missingIsBad: true,
      }));
    });
}

function makeClassTile({ classMeta, count, label, missingIsBad, dimWhenEmpty }) {
  const tile = document.createElement("div");
  const isMissing = count === 0;
  tile.className = "class-tile";
  tile.classList.toggle("missing", missingIsBad && isMissing);
  tile.classList.toggle("covered", !isMissing);
  tile.classList.toggle("empty", dimWhenEmpty && isMissing);
  tile.style.setProperty("--class-color", classMeta.color);
  tile.title = `${classMeta.name} ${count}명`;
  tile.innerHTML = `
    <img src="assets/classes/${classMeta.icon}" alt="">
    <span>${label}</span>
    <strong>${count}</strong>
  `;
  return tile;
}

function render() {
  renderSummary();
  renderRoster();
  renderChecks();
  renderClassBars();
}

function buildAddonImportString() {
  const names = [];
  const seen = new Set();

  roster.forEach((character) => {
    const inviteName = getInviteName(character).trim();
    if (!inviteName || seen.has(inviteName)) {
      return;
    }
    seen.add(inviteName);
    names.push(inviteName);
  });

  return `WRD1|${names.join(";")}`;
}

function parseAddonImportString(text) {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^WRD1\s*\|/i, "")
    .split(/[;,\n\r\t ]+/)
    .map((name) => name.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

async function buildCharacterFromInviteName(inviteName) {
  const parsed = parseCharacterInput(inviteName);
  let character = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: parsed.name,
    realm: parsed.realm,
    wowClass: pendingClass,
    spec: "",
    role: "딜러",
    healerDpsSwap: false,
    order: getNextOrder(),
  };

  try {
    const wclCharacter = await fetchWclCharacter(parsed);
    character = {
      ...character,
      name: wclCharacter.name || parsed.name,
      realm: wclCharacter.realm || parsed.realm,
      wowClass: wclCharacter.wowClass || pendingClass,
      spec: wclCharacter.spec || "",
      role: wclCharacter.role || inferRoleFromSpec(wclCharacter.spec) || "딜러",
      progress: wclCharacter.progress || "",
    };
  } catch (error) {
    // Keep the pending row; the user can refresh it later.
  }

  return character;
}

async function importAddonString() {
  const text = window.prompt("인게임 애드온에서 내보낸 문자열을 붙여넣어 주세요.");
  if (!text) {
    return;
  }

  const names = parseAddonImportString(text);
  if (!names.length) {
    setLookupStatus("가져올 닉네임을 찾지 못했습니다.", "bad");
    return;
  }

  importButton.disabled = true;
  setLookupStatus(`${names.length}명 문자열을 가져오는 중입니다...`);

  const existing = new Set(roster.map(getInviteName));
  const newNames = names.filter((name) => !existing.has(name));
  const imported = [];

  for (const [index, name] of newNames.entries()) {
    imported.push({
      ...(await buildCharacterFromInviteName(name)),
      order: getNextOrder() + index,
    });
  }

  roster = normalizeRosterOrder([...roster, ...imported]);
  saveRoster();
  render();
  importButton.disabled = false;
  setLookupStatus(`${imported.length}명을 대시보드에 가져왔습니다.`, "good");
}

async function copyAddonImportString() {
  const text = buildAddonImportString();
  try {
    await navigator.clipboard.writeText(text);
    setLookupStatus(`${roster.length}명 애드온 문자열을 복사했습니다.`, "good");
  } catch (error) {
    const box = document.createElement("textarea");
    box.value = text;
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.append(box);
    box.select();
    document.execCommand("copy");
    box.remove();
    setLookupStatus(`${roster.length}명 애드온 문자열을 복사했습니다.`, "good");
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(themeKey) || "dark";
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
  themeToggle.innerHTML = theme === "dark" ? sunSvg() : moonSvg();
  themeToggle.title = theme === "dark" ? "라이트 모드" : "다크 모드";
}

function roleIconSvg(role) {
  if (role === "탱커") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6l7-3z"/><path d="M12 7v10M8.5 10.5h7"/></svg>`;
  }
  if (role === "힐러") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4l5.5 5.5-2.4 2.4-1.1-1.1-7.7 7.7H5.5v-3.3l7.7-7.7-1.1-1.1L14.5 4z"/><path d="M9.5 4L4 9.5l2.4 2.4 1.1-1.1 7.7 7.7h3.3v-3.3l-7.7-7.7 1.1-1.1L9.5 4z"/></svg>`;
}

function swapSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10l-3-3M17 17H7l3 3"/></svg>`;
}

function sunSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.9 4.9L7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>`;
}

function moonSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4z"/></svg>`;
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth("login");
});

registerButton.addEventListener("click", () => {
  submitAuth("register");
});

logoutButton.addEventListener("click", logout);

scheduleSelect.addEventListener("change", (event) => {
  switchSchedule(event.target.value);
});

saveScheduleNameButton.addEventListener("click", renameActiveSchedule);
newScheduleButton.addEventListener("click", createSchedule);
deleteScheduleButton.addEventListener("click", deleteActiveSchedule);

scheduleNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    renameActiveSchedule();
  }
});

exportButton.addEventListener("click", copyAddonImportString);
importButton.addEventListener("click", importAddonString);
roleFilter.addEventListener("change", renderRoster);

sortMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleSortMenu();
});

sortMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sort]");
  if (!button) {
    return;
  }
  applySort(button.dataset.sort);
});

document.addEventListener("click", (event) => {
  if (!sortMenu.hidden && !event.target.closest(".sort-menu")) {
    closeSortMenu();
  }
  if (!event.target.closest(".role-menu")) {
    closeRolePopovers();
  }
});

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const parsed = parseCharacterInput(document.querySelector("#nameInput").value);
  const submitButton = addForm.querySelector("button[type='submit']");
  let character = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    name: parsed.name,
    realm: parsed.realm,
    wowClass: pendingClass,
    spec: "",
    role: "딜러",
    healerDpsSwap: false,
    order: getNextOrder(),
  };

  submitButton.disabled = true;
  setLookupStatus(`${parsed.name} WCL 정보를 확인하는 중입니다...`);

  try {
    const wclCharacter = await fetchWclCharacter(parsed);
    character = {
      ...character,
      name: wclCharacter.name || parsed.name,
      realm: wclCharacter.realm || parsed.realm,
      wowClass: wclCharacter.wowClass || pendingClass,
      spec: wclCharacter.spec || "",
      role: wclCharacter.role || inferRoleFromSpec(wclCharacter.spec) || "딜러",
      progress: wclCharacter.progress || "",
    };
    setLookupStatus(`${character.name} 정보를 WCL에서 불러와 추가했습니다.`, "good");
  } catch (error) {
    setLookupStatus(`${error.message} 명단에는 연동 대기 상태로 추가했습니다.`, "warn");
  }

  roster = normalizeRosterOrder([...roster, character]);
  addForm.reset();
  saveRoster();
  render();
  submitButton.disabled = false;
});

resetButton.addEventListener("click", () => {
  roster = cloneRoster(sampleRoster);
  if (!currentUser) {
    localStorage.removeItem(storageKey);
  }
  saveRoster();
  render();
});

function inferRoleFromSpec(spec) {
  if (tankSpecs.has(spec)) {
    return "탱커";
  }
  if (healerSpecs.has(spec)) {
    return "힐러";
  }
  return spec ? "딜러" : "";
}

function canShowHealerDpsSwap(character) {
  if (!["힐러", "딜러"].includes(character.role)) {
    return false;
  }

  const specs = specsByClass[character.wowClass] || [];
  const hasHealerSpec = specs.some((spec) => healerSpecs.has(spec.name));
  const hasDpsSpec = specs.some(
    (spec) => !tankSpecs.has(spec.name) && !healerSpecs.has(spec.name)
  );
  return hasHealerSpec && hasDpsSpec;
}
