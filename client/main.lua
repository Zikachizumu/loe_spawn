--[[
    client/main.lua
    ---------------
    Drives the LOE spawn selector.

    Flow (kicked off by qbx_core after the character is loaded):
        qb-spawn:client:setupSpawns
            -> collect spawn options (config + last location)
            -> park the ped, hide radar/HUD, start the cinematic camera
            -> open the NUI with a cursor
            -> on click: fade, fire the framework's loaded events, teleport

    The load/teleport sequence deliberately mirrors stock qbx_spawn so nothing
    downstream (jobs, HUD, loe_stranger's ready handshake) notices a
    difference.
]]

-- Load marker. If this line never shows up in F8 then the client script is not
-- running at all — bad manifest, missing dependency, or config.lua failed.
print('[loe_spawn] client script loading...')

---------------------------------------------------------------------------
-- DIAGNOSTICS (registered FIRST, so a fault further down can't hide them)
---------------------------------------------------------------------------

--- /bx_spawnstate — dump the local player's render/network state and that of
--- every nearby player. Run it in F8 after spawning.
RegisterCommand('bx_spawnstate', function()
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    print('===== loe_spawn state =====')
    print(('self visible      : %s'):format(tostring(IsEntityVisible(ped))))
    print(('tutorial session  : %s'):format(tostring(NetworkIsInTutorialSession())))
    print(('coords            : %.2f %.2f %.2f'):format(coords.x, coords.y, coords.z))
    print(('model             : %s'):format(tostring(GetEntityModel(ped))))
    print(('collision loaded  : %s'):format(tostring(HasCollisionLoadedAroundEntity(ped))))

    local players = GetActivePlayers()
    print(('nearby players    : %d'):format(#players - 1))
    for i = 1, #players do
        local other = GetPlayerPed(players[i])
        if other ~= ped and DoesEntityExist(other) then
            print(('  serverId=%s ped=%s visible=%s dist=%.1f'):format(
                GetPlayerServerId(players[i]), other,
                tostring(IsEntityVisible(other)),
                #(coords - GetEntityCoords(other))))
        end
    end
    print('===============================')
end, false)

--- /bx_fixvis — apply the repair by hand. If this makes everyone visible the
--- fix is right and only its timing is wrong; if not, the cause is elsewhere.
RegisterCommand('bx_fixvis', function()
    local ped = PlayerPedId()
    SetEntityVisible(ped, true, false)
    if NetworkIsInTutorialSession() then NetworkEndTutorialSession() end
    ClearFocus()
    FreezeEntityPosition(ped, false)
    print('[loe_spawn] forced visible + left tutorial session + cleared focus')
end, false)

---------------------------------------------------------------------------

local Cfg = LoeSpawn and LoeSpawn.Config
if not Cfg then
    print('[loe_spawn] FATAL: config did not load (LoeSpawn is nil)')
    return
end

local spawns = {}
local previewCam
local isOpen = false

local function log(...)
    if Cfg.debug then print('[loe_spawn]', ...) end
end

---------------------------------------------------------------------------
-- CAMERA
---------------------------------------------------------------------------

local function startCamera()
    local c = Cfg.camera
    local pitch = c.pitch or 0.0

    -- Placed at the captured position and turned to the captured heading, so
    -- the shot matches exactly what you framed in-game. Rotation order 2 is
    -- the standard ZXY order the game uses for headings.
    previewCam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA',
        c.coords.x, c.coords.y, c.coords.z,
        pitch, 0.0, c.coords.w, c.fov, false, 2)
    SetCamActive(previewCam, true)
    RenderScriptCams(true, false, 0, true, true)

    -- Slow yaw sway so the shot breathes instead of sitting dead still.
    if (c.driftSpeed or 0) > 0 then
        CreateThread(function()
            local t = 0.0
            while DoesCamExist(previewCam) and isOpen do
                t = t + 0.016
                local yaw = c.coords.w + math.sin(t * c.driftSpeed) * (c.driftAmount or 2.0)
                SetCamRot(previewCam, pitch, 0.0, yaw, 2)
                Wait(16)
            end
        end)
    end
end

local function stopCamera()
    if not previewCam then return end
    SetCamActive(previewCam, false)
    DestroyCam(previewCam, true)
    RenderScriptCams(false, false, 0, true, true)
    previewCam = nil
end

---------------------------------------------------------------------------
-- ARAC KAMERASI HATIRLAMA
--
-- NetworkStartSoloTutorialSession/NetworkEndTutorialSession (karakter secim
-- ekraninin izolasyonu icin qbx_core tarafindan kullaniliyor) oyuncunun V ile
-- sectigi arac kamera modunu motor varsayilanina sifirliyor. Radar/HUD icin
-- ayni sifirlama zaten asagida elle geri yukleniyor (DisplayRadar/setHudVisible);
-- arac kamerasi icin de aynisini yapip son secilen modu KVP'de tutuyoruz.
---------------------------------------------------------------------------

local VEHCAM_KVP = 'loe_spawn:vehcam'
local vehCamMonitorStarted = false

local function restoreVehCamMode()
    local saved = GetResourceKvpString(VEHCAM_KVP)
    if saved then SetFollowVehicleCamViewMode(tonumber(saved)) end
end

local function startVehCamMonitor()
    if vehCamMonitorStarted then return end
    vehCamMonitorStarted = true
    CreateThread(function()
        local lastMode = GetFollowVehicleCamViewMode()
        while true do
            Wait(2000)
            local mode = GetFollowVehicleCamViewMode()
            if mode ~= lastMode then
                lastMode = mode
                SetResourceKvp(VEHCAM_KVP, tostring(mode))
            end
        end
    end)
end

---------------------------------------------------------------------------
-- HUD
---------------------------------------------------------------------------

local function setHudVisible(visible)
    if not Cfg.hideHud then return end
    TriggerEvent(Cfg.hudEvent, visible)
end

---------------------------------------------------------------------------
-- UI
---------------------------------------------------------------------------

local function openUI()
    isOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'open',
        title = Cfg.title,
        brand = Cfg.brand,
        options = spawns,
    })
end

local function closeUI()
    isOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

---------------------------------------------------------------------------
-- SPAWNING
---------------------------------------------------------------------------

local function doSpawn(index)
    local spawnData = spawns[index]
    if not spawnData then return end

    closeUI()
    DoScreenFadeOut(Cfg.fadeOut)
    while not IsScreenFadedOut() do Wait(0) end

    -- Same order stock qbx_spawn uses — the framework expects these first.
    TriggerServerEvent('QBCore:Server:OnPlayerLoaded')
    TriggerEvent('QBCore:Client:OnPlayerLoaded')

    -- Hand streaming back to the player before we move them.
    ClearFocus()

    -- qbx_core puts the player in a solo tutorial session for the character
    -- screen, which network-isolates them: other players' peds stop rendering
    -- even though they still show up in GetActivePlayers (hence the floating
    -- names and G prompt with no body). Leaving it is what makes players
    -- visible to each other again.
    if NetworkIsInTutorialSession() then
        NetworkEndTutorialSession()
    end

    FreezeEntityPosition(cache.ped, false)
    DisplayRadar(true)
    setHudVisible(true)
    restoreVehCamMode()
    startVehCamMonitor()

    if spawnData.propertyId then
        TriggerServerEvent('qbx_properties:server:enterProperty',
            { id = spawnData.propertyId, isSpawn = true })
    else
        SetEntityCoords(cache.ped, spawnData.x, spawnData.y, spawnData.z, false, false, false, false)
        SetEntityHeading(cache.ped, spawnData.w or 0.0)

        -- Wait for ground collision so the player can't fall through the map.
        local deadline = GetGameTimer() + 5000
        RequestCollisionAtCoord(spawnData.x, spawnData.y, spawnData.z)
        while not HasCollisionLoadedAroundEntity(cache.ped) and GetGameTimer() < deadline do
            RequestCollisionAtCoord(spawnData.x, spawnData.y, spawnData.z)
            Wait(0)
        end
    end

    -- The ped was hidden for the selection shot — make it visible again.
    -- Missing this leaves every player invisible to everyone, including
    -- themselves, since each client hides its own networked ped.
    SetEntityVisible(cache.ped, true, false)

    stopCamera()
    Wait(200)
    DoScreenFadeIn(Cfg.fadeIn)
    log('spawned at', spawnData.label)
end

RegisterNUICallback('loe_spawn:select', function(data, cb)
    cb('ok')
    if not isOpen then return end
    doSpawn(tonumber(data and data.index) or 1)
end)

---------------------------------------------------------------------------
-- ENTRY POINT
---------------------------------------------------------------------------

-- loe_ui passes (citizenid, hotelOnly). hotelOnly is true for a brand-new
-- character and for one whose saved position is still the character
-- creator interior: its "last location" would drop the player inside the
-- creator building, so only the configured spawns are offered.
RegisterNetEvent('qb-spawn:client:setupSpawns', function(_, hotelOnly)
    spawns = {}

    -- 1. Configured spawn points, in config order.
    for i = 1, #Cfg.spawns do
        local s = Cfg.spawns[i]
        spawns[#spawns + 1] = {
            label = s.label,
            icon = s.icon,
            x = s.coords.x, y = s.coords.y, z = s.coords.z, w = s.coords.w,
        }
    end

    -- 2. The player's last location, via qbx_spawn's existing server callback.
    if Cfg.lastLocation.enabled and hotelOnly ~= true then
        local lastCoords, lastPropertyId = lib.callback.await('qbx_spawn:server:getLastLocation')
        if lastCoords then
            spawns[#spawns + 1] = {
                label = Cfg.lastLocation.label,
                icon = Cfg.lastLocation.icon,
                x = lastCoords.x, y = lastCoords.y, z = lastCoords.z, w = lastCoords.w,
                propertyId = lastPropertyId,
            }
        end
    end

    -- The engine streams the world around the PED. Moving the streaming focus
    -- alone was not enough, so park the (hidden) ped at the shot as well —
    -- leaving it behind is why the scenery rendered flat and untextured.
    local cam = Cfg.camera
    SetEntityCoords(cache.ped, cam.coords.x, cam.coords.y, cam.coords.z, false, false, false, false)
    FreezeEntityPosition(cache.ped, true)
    SetEntityVisible(cache.ped, false, false)
    DisplayRadar(false)
    setHudVisible(false)

    startCamera()
    SetFocusPosAndVel(cam.coords.x, cam.coords.y, cam.coords.z, 0.0, 0.0, 0.0)
    Wait(cam.streamWait or 1500)

    ShutdownLoadingScreen()
    ShutdownLoadingScreenNui()
    DoScreenFadeIn(Cfg.fadeIn)

    openUI()
    log('selector opened with', #spawns, 'options')
end)

-- qbx_core fires this alongside setupSpawns; stock qbx_spawn ignores it too.
RegisterNetEvent('qb-spawn:client:openUI', function() end)

-- Safety: never leave the player stuck with a locked cursor.
AddEventHandler('onResourceStop', function(res)
    if res ~= GetCurrentResourceName() then return end
    if isOpen then
        SetNuiFocus(false, false)
        ClearFocus()
        stopCamera()
        FreezeEntityPosition(cache.ped, false)
        SetEntityVisible(cache.ped, true, false)
        DisplayRadar(true)
    end
end)
