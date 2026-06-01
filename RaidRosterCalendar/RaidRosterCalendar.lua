local RRC = {}
local frame = CreateFrame("Frame")

local panel
local inputBox
local statusText

local inviteQueue
local retryQueue = {}
local retryRound = 0
local pendingInvite
local pendingVerifyAfter = 0
local inviteScheduled = false
local invitedCount = 0
local failedInvites = {}
local debugLog = {}

local BUSY_RETRY_DELAY = 0.25
local VERIFY_DELAY = 1.8
local FALLBACK_DELAY = 2.4
local ALREADY_INVITED_RECHECK_DELAY = 2.2
local RETRY_ROUND_DELAY = 2.5
local MAX_RETRY_ROUNDS = 2

local InviteNext

local function Debug(message)
  local timestamp = date and date("%H:%M:%S") or tostring(GetTime())
  table.insert(debugLog, string.format("[%s] %s", timestamp, tostring(message)))
  if #debugLog > 300 then
    table.remove(debugLog, 1)
  end
end

local function Print(message)
  DEFAULT_CHAT_FRAME:AddMessage("|cff10a37fRaidRosterCalendar|r " .. tostring(message))
end

local function Trim(value)
  return (value or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function NormalizeName(value)
  value = Trim(value)
  value = value:gsub("\239\187\191", "")
  value = value:gsub("|c%x%x%x%x%x%x%x%x", "")
  value = value:gsub("|r", "")
  value = value:gsub("[\"']", "")
  value = value:gsub("^WRD1|", "")
  value = value:gsub("^|+", "")
  return Trim(value)
end

local function NameKey(value)
  return NormalizeName(value):lower()
end

local function BaseName(value)
  return NameKey(value):match("^([^-]+)") or NameKey(value)
end

local function SamePlayerName(left, right)
  local leftKey = NameKey(left)
  local rightKey = NameKey(right)

  if leftKey == rightKey then
    return true
  end

  local leftHasRealm = leftKey:find("-", 1, true) ~= nil
  local rightHasRealm = rightKey:find("-", 1, true) ~= nil
  return (not leftHasRealm or not rightHasRealm) and BaseName(leftKey) == BaseName(rightKey)
end

local function ParseImportString(text)
  text = Trim(text)
  text = text:gsub("\239\187\191", "")
  text = text:gsub("WRD1%s*|", "")
  text = text:gsub("[%c]+", ";")

  local names = {}
  local seen = {}

  for rawName in text:gmatch("[^;,%s]+") do
    local name = NormalizeName(rawName)
    if name ~= "" and not seen[name] then
      seen[name] = true
      table.insert(names, name)
    end
  end

  return names
end

local function BuildImportString(names)
  return "WRD1|" .. table.concat(names, ";")
end

local function SetStatus(message)
  if statusText then
    statusText:SetText(message)
  end
end

local function CanInviteNow()
  if not C_Calendar or not C_Calendar.EventInvite then
    return false, "calendar-api-missing"
  end

  if C_Calendar.CanSendInvite and not C_Calendar.CanSendInvite() then
    return false, "calendar-not-ready"
  end

  return true
end

local function HasCalendarInvite(name)
  if not C_Calendar or not C_Calendar.GetNumInvites or not C_Calendar.EventGetInvite then
    return false
  end

  local inviteCount = C_Calendar.GetNumInvites() or 0
  for index = 1, inviteCount do
    local info = C_Calendar.EventGetInvite(index)
    if info and info.name and SamePlayerName(info.name, name) then
      return true
    end
  end

  return false
end

local function SnapshotInviteNames(limit)
  if not C_Calendar or not C_Calendar.GetNumInvites or not C_Calendar.EventGetInvite then
    return "invite-api-missing"
  end

  local names = {}
  local inviteCount = C_Calendar.GetNumInvites() or 0
  local maxCount = math.min(inviteCount, limit or 40)

  for index = 1, maxCount do
    local info = C_Calendar.EventGetInvite(index)
    table.insert(names, (info and info.name) or "?")
  end

  if inviteCount > maxCount then
    table.insert(names, string.format("...+%d", inviteCount - maxCount))
  end

  return string.format("count=%d [%s]", inviteCount, table.concat(names, ", "))
end

local function ScheduleInvite(delay)
  if inviteScheduled then
    return
  end

  inviteScheduled = true
  C_Timer.After(delay, function()
    inviteScheduled = false
    InviteNext()
  end)
end

local function MarkDone(reason)
  if not pendingInvite then
    return
  end

  Debug(string.format("DONE reason=%s name=%s queueBefore=%d snapshot=%s", reason or "ok", pendingInvite, inviteQueue and #inviteQueue or -1, SnapshotInviteNames(40)))
  table.remove(inviteQueue, 1)
  invitedCount = invitedCount + 1
  SetStatus(string.format("%s: %s (%d left)", reason or "ok", pendingInvite, #inviteQueue))
  pendingInvite = nil
  pendingVerifyAfter = 0
  ScheduleInvite(0.05)
end

local function DeferPending(reason)
  if not pendingInvite then
    return
  end

  Debug(string.format("DEFER reason=%s name=%s queueBefore=%d retryRound=%d snapshot=%s", reason or "unknown", pendingInvite, inviteQueue and #inviteQueue or -1, retryRound, SnapshotInviteNames(40)))
  table.insert(retryQueue, pendingInvite)
  table.remove(inviteQueue, 1)
  SetStatus(string.format("deferred: %s (%d left)", pendingInvite, #inviteQueue))
  pendingInvite = nil
  pendingVerifyAfter = 0
  ScheduleInvite(0.15)
end

local function IsAlreadyInvitedMessage(...)
  for index = 1, select("#", ...) do
    local message = tostring(select(index, ...) or "")
    local lower = message:lower()
    if message:find("이미") and message:find("초대") then
      return true
    end
    if lower:find("already") and lower:find("invit") then
      return true
    end
  end

  return false
end

local function HandleAlreadyInvitedMessage()
  if not pendingInvite then
    return
  end

  Debug(string.format("ALREADY_MESSAGE name=%s snapshot=%s", pendingInvite, SnapshotInviteNames(40)))

  if HasCalendarInvite(pendingInvite) then
    MarkDone("already-in-list")
  else
    pendingVerifyAfter = math.max(pendingVerifyAfter or 0, GetTime() + ALREADY_INVITED_RECHECK_DELAY)
    SetStatus(string.format("server recheck: %s", pendingInvite))
    ScheduleInvite(ALREADY_INVITED_RECHECK_DELAY)
  end
end

local function IsBlizzardCalendarLoaded()
  if C_AddOns and C_AddOns.IsAddOnLoaded then
    return C_AddOns.IsAddOnLoaded("Blizzard_Calendar")
  end
  return IsAddOnLoaded and IsAddOnLoaded("Blizzard_Calendar")
end

local function LoadBlizzardCalendar()
  if C_AddOns and C_AddOns.LoadAddOn then
    pcall(C_AddOns.LoadAddOn, "Blizzard_Calendar")
  elseif UIParentLoadAddOn then
    pcall(UIParentLoadAddOn, "Blizzard_Calendar")
  end
end

local function FinishImport()
  if #retryQueue > 0 then
    local stillFailed = {}
    for _, name in ipairs(retryQueue) do
      if HasCalendarInvite(name) then
        invitedCount = invitedCount + 1
        Debug(string.format("LATE_CONFIRMED name=%s snapshot=%s", name, SnapshotInviteNames(80)))
      else
        table.insert(stillFailed, name)
      end
    end

    for _, name in ipairs(stillFailed) do
      table.insert(failedInvites, name)
    end
    retryQueue = {}
  end

  local failedText = #failedInvites > 0 and string.format(" / failed %d", #failedInvites) or ""
  SetStatus(string.format("done: %d confirmed%s", invitedCount, failedText))
  Print(string.format("%d calendar invites confirmed.%s", invitedCount, failedText))
  Debug(string.format("FINISH confirmed=%d failed=%s snapshot=%s", invitedCount, table.concat(failedInvites, ";"), SnapshotInviteNames(80)))

  inviteQueue = nil
  pendingInvite = nil
  pendingVerifyAfter = 0
  retryRound = 0
end

local function StartRetryRound()
  retryRound = retryRound + 1
  local stillMissing = {}
  for _, name in ipairs(retryQueue) do
    if HasCalendarInvite(name) then
      invitedCount = invitedCount + 1
      Debug(string.format("LATE_CONFIRMED_BEFORE_RETRY name=%s snapshot=%s", name, SnapshotInviteNames(80)))
    else
      table.insert(stillMissing, name)
    end
  end

  inviteQueue = stillMissing
  retryQueue = {}
  pendingInvite = nil
  pendingVerifyAfter = 0
  Debug(string.format("RETRY_ROUND round=%d total=%d snapshot=%s", retryRound, #inviteQueue, SnapshotInviteNames(80)))
  SetStatus(string.format("retry round %d: %d", retryRound, #inviteQueue))
  ScheduleInvite(RETRY_ROUND_DELAY)
end

InviteNext = function()
  if not inviteQueue then
    Debug("InviteNext skipped: no queue")
    return
  end

  if pendingInvite then
    if HasCalendarInvite(pendingInvite) then
      MarkDone("confirmed")
      return
    end

    local now = GetTime()
    if pendingVerifyAfter and now < pendingVerifyAfter then
      ScheduleInvite(math.max(0.05, pendingVerifyAfter - now))
      return
    end

    local canInvite, reason = CanInviteNow()
    if not canInvite then
      Debug(string.format("WAIT_PENDING name=%s reason=%s", pendingInvite, reason))
      SetStatus(reason)
      ScheduleInvite(BUSY_RETRY_DELAY)
      return
    end

    DeferPending("not-confirmed")
    return
  end

  if #inviteQueue == 0 then
    if #retryQueue > 0 and retryRound < MAX_RETRY_ROUNDS then
      StartRetryRound()
    else
      FinishImport()
    end
    return
  end

  local nextInvite = inviteQueue[1]

  if HasCalendarInvite(nextInvite) then
    pendingInvite = nextInvite
    MarkDone("already-in-list")
    return
  end

  local canInvite, reason = CanInviteNow()
  if not canInvite then
    Debug(string.format("BUSY name=%s reason=%s", nextInvite, reason))
    SetStatus(reason)
    ScheduleInvite(BUSY_RETRY_DELAY)
    return
  end

  pendingInvite = nextInvite
  pendingVerifyAfter = GetTime() + VERIFY_DELAY
  Debug(string.format("REQUEST name=%s round=%d queue=%d snapshotBefore=%s", pendingInvite, retryRound, #inviteQueue, SnapshotInviteNames(40)))
  C_Calendar.EventInvite(pendingInvite)
  SetStatus(string.format("requested: %s (%d left)", pendingInvite, #inviteQueue - 1))

  ScheduleInvite(VERIFY_DELAY)
  C_Timer.After(FALLBACK_DELAY, function()
    if inviteQueue then
      ScheduleInvite(0.05)
    end
  end)
end

local function StartInviteImport()
  local names = ParseImportString(inputBox:GetText())
  if #names == 0 then
    SetStatus("no names found")
    return
  end

  local canInvite, reason = CanInviteNow()
  if not canInvite then
    SetStatus(reason)
    Print(reason)
    return
  end

  inviteQueue = names
  retryQueue = {}
  retryRound = 0
  pendingInvite = nil
  pendingVerifyAfter = 0
  inviteScheduled = false
  invitedCount = 0
  failedInvites = {}
  debugLog = {}

  Debug(string.format("START total=%d names=%s", #inviteQueue, table.concat(inviteQueue, ";")))
  Debug(string.format("INITIAL_SNAPSHOT %s", SnapshotInviteNames(80)))
  SetStatus(string.format("start: %d invites", #inviteQueue))
  InviteNext()
end

local function ExportCurrentEvent()
  if not C_Calendar or not C_Calendar.GetNumInvites or not C_Calendar.EventGetInvite then
    SetStatus("cannot read calendar invites")
    return
  end

  local names = {}
  local seen = {}
  local inviteCount = C_Calendar.GetNumInvites() or 0

  for index = 1, inviteCount do
    local info = C_Calendar.EventGetInvite(index)
    local name = info and NormalizeName(info.name)
    if name and name ~= "" and not seen[name] then
      seen[name] = true
      table.insert(names, name)
    end
  end

  if #names == 0 then
    SetStatus("no invitees found")
    return
  end

  inputBox:SetText(BuildImportString(names))
  inputBox:SetFocus()
  inputBox:HighlightText()
  SetStatus(string.format("exported %d names", #names))
end

local function ExportDebugLog()
  local lines = {
    "RRC_DEBUG_V2",
    "time=" .. tostring(date and date("%Y-%m-%d %H:%M:%S") or GetTime()),
    "pending=" .. tostring(pendingInvite or ""),
    "queueCount=" .. tostring(inviteQueue and #inviteQueue or 0),
    "retryRound=" .. tostring(retryRound),
    "retryQueue=" .. table.concat(retryQueue, ";"),
    "invitedCount=" .. tostring(invitedCount),
    "failed=" .. table.concat(failedInvites, ";"),
    "snapshot=" .. SnapshotInviteNames(100),
    "---",
  }

  for _, line in ipairs(debugLog) do
    table.insert(lines, line)
  end

  inputBox:SetText(table.concat(lines, "\n"))
  inputBox:SetFocus()
  inputBox:HighlightText()
  SetStatus("debug log ready; press Ctrl+C")
end

local function CreateImportPanel(parent)
  if panel then
    panel:SetParent(parent or UIParent)
    panel:ClearAllPoints()
  else
    panel = CreateFrame("Frame", "RaidRosterCalendarImportFrame", parent or UIParent, "BackdropTemplate")
    panel:SetSize(430, 226)
    panel:SetFrameStrata("DIALOG")
    panel:SetClampedToScreen(true)
    panel:SetBackdrop({
      bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
      edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
      tile = true,
      tileSize = 16,
      edgeSize = 12,
      insets = { left = 3, right = 3, top = 3, bottom = 3 },
    })
    panel:SetBackdropColor(0.06, 0.07, 0.09, 0.94)
    panel:SetBackdropBorderColor(0.2, 0.75, 0.62, 0.75)

    local title = panel:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    title:SetPoint("TOPLEFT", 12, -9)
    title:SetText("Dashboard invite string")

    local inputBackdrop = CreateFrame("Frame", nil, panel, "BackdropTemplate")
    inputBackdrop:SetSize(392, 122)
    inputBackdrop:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -8)
    inputBackdrop:SetBackdrop({
      bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
      edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
      tile = true,
      tileSize = 16,
      edgeSize = 10,
      insets = { left = 3, right = 3, top = 3, bottom = 3 },
    })
    inputBackdrop:SetBackdropColor(0.02, 0.025, 0.03, 0.95)
    inputBackdrop:SetBackdropBorderColor(0.22, 0.28, 0.34, 0.95)

    inputBox = CreateFrame("EditBox", nil, inputBackdrop)
    inputBox:SetPoint("TOPLEFT", 8, -7)
    inputBox:SetPoint("BOTTOMRIGHT", -8, 7)
    inputBox:SetFontObject(ChatFontNormal)
    inputBox:SetMultiLine(true)
    inputBox:EnableMouse(true)
    inputBox:SetHitRectInsets(0, 0, 0, 0)
    inputBox:SetMaxLetters(4096)
    inputBox:SetAutoFocus(false)
    inputBox:SetScript("OnEscapePressed", inputBox.ClearFocus)

    inputBackdrop:EnableMouse(true)
    inputBackdrop:SetScript("OnMouseDown", function()
      inputBox:SetFocus()
    end)

    local inviteButton = CreateFrame("Button", nil, panel, "UIPanelButtonTemplate")
    inviteButton:SetSize(86, 26)
    inviteButton:SetPoint("TOPRIGHT", inputBackdrop, "BOTTOMRIGHT", 0, -10)
    inviteButton:SetText("Invite")
    inviteButton:SetScript("OnClick", StartInviteImport)

    local exportButton = CreateFrame("Button", nil, panel, "UIPanelButtonTemplate")
    exportButton:SetSize(86, 26)
    exportButton:SetPoint("RIGHT", inviteButton, "LEFT", -8, 0)
    exportButton:SetText("Export")
    exportButton:SetScript("OnClick", ExportCurrentEvent)

    local debugButton = CreateFrame("Button", nil, panel, "UIPanelButtonTemplate")
    debugButton:SetSize(86, 26)
    debugButton:SetPoint("RIGHT", exportButton, "LEFT", -8, 0)
    debugButton:SetText("Log")
    debugButton:SetScript("OnClick", ExportDebugLog)

    statusText = panel:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
    statusText:SetPoint("TOPLEFT", inputBackdrop, "BOTTOMLEFT", 0, -15)
    statusText:SetPoint("RIGHT", debugButton, "LEFT", -10, 0)
    statusText:SetJustifyH("LEFT")
  end

  if parent and parent ~= UIParent then
    panel:SetFrameLevel((parent:GetFrameLevel() or 1) + 20)
    panel:SetPoint("TOPLEFT", parent, "TOPRIGHT", 10, -8)
  else
    panel:SetPoint("CENTER", UIParent, "CENTER", 0, 120)
  end

  panel:Show()
end

local function GetCalendarParent()
  local candidates = {
    _G.CalendarCreateEventFrame,
    _G.CalendarEventFrame,
    _G.CalendarViewEventFrame,
    _G.CalendarFrame,
  }

  for _, candidate in ipairs(candidates) do
    if candidate and candidate:IsShown() then
      return candidate
    end
  end

  return _G.CalendarCreateEventFrame
    or _G.CalendarEventFrame
    or _G.CalendarViewEventFrame
    or _G.CalendarFrame
    or UIParent
end

function RRC.AttachToCalendar()
  CreateImportPanel(GetCalendarParent())
end

local function TogglePanel()
  if panel and panel:IsShown() then
    panel:Hide()
    return
  end

  if not IsBlizzardCalendarLoaded() then
    LoadBlizzardCalendar()
  end
  RRC.AttachToCalendar()
end

frame:RegisterEvent("PLAYER_LOGIN")
frame:RegisterEvent("ADDON_LOADED")
frame:RegisterEvent("CALENDAR_OPEN_EVENT")
frame:RegisterEvent("CALENDAR_NEW_EVENT")
frame:RegisterEvent("CALENDAR_ACTION_PENDING")
frame:RegisterEvent("CALENDAR_UPDATE_INVITE_LIST")
frame:RegisterEvent("CALENDAR_UPDATE_ERROR")
frame:RegisterEvent("UI_ERROR_MESSAGE")

frame:SetScript("OnEvent", function(_, event, ...)
  local arg1 = ...

  if event == "CALENDAR_ACTION_PENDING" then
    Debug(string.format("EVENT CALENDAR_ACTION_PENDING arg=%s pending=%s queue=%s retry=%s", tostring(arg1), tostring(pendingInvite), tostring(inviteQueue and #inviteQueue or 0), tostring(#retryQueue)))
  elseif event == "CALENDAR_UPDATE_INVITE_LIST" then
    Debug(string.format("EVENT CALENDAR_UPDATE_INVITE_LIST pending=%s snapshot=%s", tostring(pendingInvite), SnapshotInviteNames(50)))
  elseif event == "CALENDAR_UPDATE_ERROR" or event == "UI_ERROR_MESSAGE" then
    Debug(string.format("EVENT %s args=%s / %s pending=%s snapshot=%s", event, tostring(select(1, ...)), tostring(select(2, ...)), tostring(pendingInvite), SnapshotInviteNames(50)))
  end

  if event == "PLAYER_LOGIN" then
    Print("Loaded. Use /rrc or /wrd near the calendar.")
  elseif event == "ADDON_LOADED" and arg1 == "Blizzard_Calendar" then
    C_Timer.After(0.1, RRC.AttachToCalendar)
  elseif event == "CALENDAR_OPEN_EVENT" or event == "CALENDAR_NEW_EVENT" then
    C_Timer.After(0.1, RRC.AttachToCalendar)
  elseif event == "CALENDAR_ACTION_PENDING" and arg1 == false and inviteQueue and not pendingInvite then
    ScheduleInvite(0.05)
  elseif event == "CALENDAR_UPDATE_INVITE_LIST" and inviteQueue and pendingInvite then
    ScheduleInvite(0.05)
  elseif (event == "CALENDAR_UPDATE_ERROR" or event == "UI_ERROR_MESSAGE") and inviteQueue and pendingInvite then
    if IsAlreadyInvitedMessage(...) then
      HandleAlreadyInvitedMessage()
    end
  end
end)

SLASH_RAIDROSTERCALENDAR1 = "/rrc"
SLASH_RAIDROSTERCALENDAR2 = "/wrd"
SlashCmdList.RAIDROSTERCALENDAR = function()
  TogglePanel()
end
