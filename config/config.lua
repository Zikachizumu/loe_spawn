--[[
    config/config.lua
    -----------------
    Everything about the spawn screen is configured here. Pure data, no logic.
]]

LoeSpawn = {}

LoeSpawn.Config = {
    debug = false,

    -- Heading shown above the cards. Keep it short.
    title = 'Spawn Location',
    brand = 'Legends of Empire',

    ---------------------------------------------------------------------------
    -- SPAWN POINTS
    -- Listed first, in this order. The player's last location is appended
    -- automatically as the final option (see `lastLocation` below).
    ---------------------------------------------------------------------------
    spawns = {
        {
            id = 'hotel',
            label = 'Hotel',
            icon = 'hotel',                                  -- see web/js/app.js ICONS
            coords = vec4(-1279.62, 305.4, 63.98, 150.59),
        },
    },

    -- The "Last Location" entry. Set enabled = false to drop it entirely.
    lastLocation = {
        enabled = true,
        label = 'Last Location',
        icon = 'pin',
    },

    ---------------------------------------------------------------------------
    -- CINEMATIC CAMERA
    -- A slow drifting shot while the player chooses. Tune `coords` to
    -- frame whatever view you want behind the cards.
    ---------------------------------------------------------------------------
    camera = {
        -- Position + heading, exactly as captured in-game (x, y, z, heading).
        -- The shot reproduces what you saw standing at this spot facing that
        -- heading, so you can re-frame it just by pasting new coords here.
        coords = vec4(-1377.1, 212.45, 82.69, 338.47),

        pitch = 0.0,            -- tilt in degrees; negative looks downward
        fov = 45.0,

        -- Gentle yaw sway so the shot breathes. 0 disables the drift.
        driftSpeed = 0.35,      -- sway speed
        driftAmount = 2.5,      -- degrees of sway either side of the heading

        -- The engine streams the world around the PLAYER, not the camera, so
        -- we park the hidden ped at the shot and move the streaming focus
        -- there. Raise this if the scenery still looks flat on slow disks.
        streamWait = 1500,      -- ms
    },

    ---------------------------------------------------------------------------
    -- SKY DROP
    -- After a spawn is chosen the camera flies down from the sky onto the
    -- player. Set enabled = false to cut straight to the player instead.
    -- Not used for property spawns (the player ends up inside an interior).
    ---------------------------------------------------------------------------
    skyDrop = {
        enabled = true,
        height = 450.0,         -- metres above the spawn point
        fov = 60.0,
        duration = 3500,        -- ms, sky -> behind the player
        landing = 800,          -- ms, hand-over to the gameplay camera
    },

    ---------------------------------------------------------------------------
    -- INTEGRATION
    ---------------------------------------------------------------------------
    -- Hide loe_hud while the selector is open (ID / cash / bank / clock,
    -- the health-armour-food-water bars and the street-name pin).
    hideHud = true,
    hudEvent = 'loe_hud:client:setVisible',

    -- Fade timings (ms).
    fadeOut = 600,
    fadeIn = 800,
}
