const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const fn = (_e, data) => cb(data);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('nova', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch),
    setSecret: (key, value) => ipcRenderer.invoke('settings:setSecret', key, value),
    onChange: on('settings:changed'),
    onSection: on('settings:section')
  },
  dock: {
    setIgnoreMouse: (v) => ipcRenderer.invoke('dock:setIgnoreMouse', v),
    onLayout: on('dock:layout')
  },
  quit: () => ipcRenderer.invoke('app:quit'),
  audio: {
    get: () => ipcRenderer.invoke('audio:get'),
    set: (pct) => ipcRenderer.invoke('audio:set', pct),
    mute: (m) => ipcRenderer.invoke('audio:mute', m)
  },
  net: { status: (force) => ipcRenderer.invoke('net:status', force) },
  shortcut: (name) => ipcRenderer.invoke('sys:shortcut', name),
  openMs: (uri) => ipcRenderer.invoke('open:ms', uri),
  power: (action) => ipcRenderer.invoke('power:action', action),
  openSettings: (section) => ipcRenderer.invoke('open:settings', section),
  openUrl: (url) => ipcRenderer.invoke('open:url', url),
  spotify: {
    now: () => ipcRenderer.invoke('spotify:now'),
    control: (a) => ipcRenderer.invoke('spotify:control', a),
    connect: () => ipcRenderer.invoke('spotify:connect'),
    disconnect: () => ipcRenderer.invoke('spotify:disconnect'),
    redirectUri: () => ipcRenderer.invoke('spotify:redirectUri')
  },
  ai: { usage: (force) => ipcRenderer.invoke('ai:usage', force) },
  system: { stats: () => ipcRenderer.invoke('system:stats') },
  apps: {
    list: () => ipcRenderer.invoke('apps:list'),
    launch: (p) => ipcRenderer.invoke('apps:launch', p),
    add: () => ipcRenderer.invoke('apps:add'),
    importTaskbar: () => ipcRenderer.invoke('apps:importTaskbar'),
    set: (list) => ipcRenderer.invoke('apps:set', list)
  },
  windows: {
    list: () => ipcRenderer.invoke('windows:list'),
    activate: (hwnd, toggle = true) => ipcRenderer.invoke('windows:activate', hwnd, toggle),
    close: (hwnd) => ipcRenderer.invoke('windows:close', hwnd),
    thumbs: (hwnds) => ipcRenderer.invoke('windows:thumbs', hwnds)
  },
  pet: {
    config: () => ipcRenderer.invoke('pet:config'),
    onConfig: on('pet:config'),
    setIgnore: (v) => ipcRenderer.invoke('pet:setIgnore', v),
    move: (x, y) => ipcRenderer.invoke('pet:move', x, y),
    save: () => ipcRenderer.invoke('pet:save')
  },
  notify: (title, body) => ipcRenderer.invoke('notify', title, body)
});
