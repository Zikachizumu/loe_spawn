fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'loe_spawn'
author 'LOE Framework'
description 'Premium spawn location selector for Qbox'
version '0.1.0'

--[[
    LOE Spawn
    -------------
    Replaces the stock qbx_spawn heist-map screen with a premium, mouse-driven
    NUI selector matching the LOE visual language.

    qbx_spawn must stay STARTED — qbx_core checks its resource state before
    firing the spawn event, and we reuse its server callback for the player's
    last location. Only its client-side scaleform UI is disabled.

    Dependencies (never modified by this resource):
        - qbx_core
        - qbx_spawn  (server callback only)
        - ox_lib
]]

dependencies {
    'qbx_core',
    'ox_lib',
}

shared_scripts {
    '@ox_lib/init.lua',
    'config/config.lua',
}

client_scripts {
    'client/main.lua',
}

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/css/style.css',
    'web/js/app.js',
}
