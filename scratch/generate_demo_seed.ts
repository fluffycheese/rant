import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const TS = Date.now()

const uuid = () => crypto.randomUUID()

const exportPayload: any = {
  version: 1,
  exportedAt: new Date().toISOString(),
  profiles: [],
  sites: [],
  racks: [],
  deviceTemplates: [],
  devices: [],
  ports: [],
  cableLinks: []
}

const pId = uuid()
exportPayload.profiles.push({
  id: pId,
  name: 'Demo Profile',
  description: 'Public demo environment',
  createdAt: TS, updatedAt: TS
})

const sitesData = [
  { name: 'London (HQ)', racks: ['RACK01', 'RACK02', 'COMMS01'] },
  { name: 'Paris (Branch)', racks: ['COMMS01', 'COMMS02'] },
  { name: 'Amsterdam (DC)', racks: ['RACK01'] }
]

const sites = sitesData.map(s => ({
  id: uuid(), profileId: pId, name: s.name, description: null, createdAt: TS, updatedAt: TS, _racks: s.racks
}))
exportPayload.sites.push(...sites.map(({_racks, ...s}) => s))

const racks: any[] = []
for (const s of sites) {
  for (const rName of s._racks) {
    racks.push({
      id: uuid(), siteId: s.id, name: rName, description: null, uHeight: 42, createdAt: TS, updatedAt: TS,
      _siteName: s.name
    })
  }
}
exportPayload.racks.push(...racks.map(({_siteName, ...r}) => r))

// Load templates
const loadTemplate = (p: string) => {
  const content = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), p), 'utf8'))
  return { id: uuid(), ...content, createdAt: TS, updatedAt: TS, portCount: content.portLayout.length }
}

const tmpl24Patch = loadTemplate('templates/generic/patch_panel/patch_panel_24_port_rj45.json')
const tmpl24Sw = loadTemplate('templates/ubiquiti/switch/usw_pro_24_poe.json')
const tmplFirewall = loadTemplate('templates/sonicwall/firewall/nsa_3700.json')

// Local endpoint templates
const tmplWifi = {
  id: uuid(), name: 'UniFi AP U6 Pro', category: 'wifi_ap', manufacturer: 'Ubiquiti', model: 'U6-Pro',
  uHeight: 0, color: '#f8fafc', createdAt: TS, updatedAt: TS, portCount: 1,
  portLayout: [{ label: 'LAN', connectorType: 'rj45', position: 0, groupLayout: 'single_row' }]
}
const tmplCam = {
  id: uuid(), name: 'UniFi Camera G4 Bullet', category: 'ip_camera', manufacturer: 'Ubiquiti', model: 'G4-Bullet',
  uHeight: 0, color: '#e2e8f0', createdAt: TS, updatedAt: TS, portCount: 1,
  portLayout: [{ label: 'LAN', connectorType: 'rj45', position: 0, groupLayout: 'single_row' }]
}
const tmplServer = {
  id: uuid(), name: 'PowerEdge R650', category: 'server', manufacturer: 'Dell', model: 'R650',
  uHeight: 1, color: '#475569', createdAt: TS, updatedAt: TS, portCount: 4,
  portLayout: [
    { label: 'iDRAC', connectorType: 'rj45', position: 0, groupName: 'OOB', groupLayout: 'single_row' },
    { label: 'NIC1', connectorType: 'rj45', position: 1, groupName: 'NIC', groupLayout: 'single_row' },
    { label: 'NIC2', connectorType: 'rj45', position: 2, groupName: 'NIC', groupLayout: 'single_row' },
    { label: 'NIC3', connectorType: 'rj45', position: 3, groupName: 'NIC', groupLayout: 'single_row' }
  ]
}

exportPayload.deviceTemplates.push(tmpl24Patch, tmpl24Sw, tmplFirewall, tmplWifi, tmplCam, tmplServer)

const addDevice = (rackId: string, template: any, name: string, posU: number | null) => {
  const dId = uuid()
  const device = {
    id: dId, rackId, templateId: template.id, name, category: template.category, positionU: posU,
    color: template.color, notes: null, createdAt: TS, updatedAt: TS
  }
  exportPayload.devices.push(device)
  
  const dPorts = []
  for (const p of template.portLayout) {
    const pId = uuid()
    dPorts.push({
      id: pId, deviceId: dId, label: p.label, connectorType: p.connectorType, position: p.position,
      groupName: p.groupName || null, groupLayout: p.groupLayout || null, notes: null, createdAt: TS
    })
  }
  exportPayload.ports.push(...dPorts)
  return dPorts
}

const addLink = (pAId: string, slotA: 'front'|'back', pBId: string, slotB: 'front'|'back', type: string, color: string) => {
  exportPayload.cableLinks.push({
    id: uuid(), portAId: pAId, portASlot: slotA, portBId: pBId, portBSlot: slotB,
    cableType: type, color, label: null, notes: null, createdAt: TS, updatedAt: TS
  })
}

// Populate racks
let allSwitches: any[] = []
let allServers: any[] = []
const patchPanelsByRack: Record<string, any[][]> = {}
const firewallsBySite: Record<string, any[]> = {}

for (const r of racks) {
  let u = 42
  
  // Top: Firewall (only in London RACK1, Paris COMMS1, Amsterdam RACK1)
  let fwPorts = null
  if (r.name.includes('01') && r._siteName !== 'London (HQ)' || (r._siteName === 'London (HQ)' && r.name === 'COMMS01')) {
    fwPorts = addDevice(r.id, tmplFirewall, `FW-01`, u)
    firewallsBySite[r._siteName] = fwPorts
    u -= 2
  }
  
  // Switches
  const sw1Ports = addDevice(r.id, tmpl24Sw, `SW-01`, u--)
  const sw2Ports = addDevice(r.id, tmpl24Sw, `SW-02`, u--)
  allSwitches.push(sw1Ports)
  
  // Patch Panels
  const pp1Ports = addDevice(r.id, tmpl24Patch, `PP-01`, u--)
  const pp2Ports = addDevice(r.id, tmpl24Patch, `PP-02`, u--)
  patchPanelsByRack[r.name + '_' + r._siteName] = [pp1Ports, pp2Ports]
  
  // Connect Switches to Patch Panels (Front)
  for (let i = 0; i < 12; i++) {
    addLink(sw1Ports[i].id, 'front', pp1Ports[i].id, 'front', 'cat6', '#3b82f6')
    addLink(sw2Ports[i].id, 'front', pp2Ports[i].id, 'front', 'cat6', '#10b981')
  }

  // Connect FW to Switches if FW exists
  if (fwPorts) {
    addLink(fwPorts[0].id, 'front', sw1Ports[24].id, 'front', 'dac', '#000000') // SFP+ uplink
    addLink(fwPorts[1].id, 'front', sw2Ports[24].id, 'front', 'dac', '#000000')
  }
  
  // Endpoints & Servers
  if (r.name.startsWith('RACK')) {
    // Server Rack
    u -= 5
    for(let s=1; s<=3; s++) {
      const srvPorts = addDevice(r.id, tmplServer, `SRV-0${s}`, u--)
      allServers.push(srvPorts)
      // Connect servers to switch 1 directly
      addLink(srvPorts[0].id, 'front', sw1Ports[20+s].id, 'front', 'cat6', '#f59e0b') // iDRAC
      addLink(srvPorts[1].id, 'front', sw1Ports[12+s].id, 'front', 'cat6', '#8b5cf6') // NIC1
    }
  } else {
    // Comms Rack - lots of endpoints
    for(let e=1; e<=5; e++) {
      const apPorts = addDevice(r.id, tmplWifi, `AP-0${e}`, null)
      const camPorts = addDevice(r.id, tmplCam, `CAM-0${e}`, null)
      
      // Connect endpoint directly to the back of the patch panel (simulating structured cabling in walls)
      addLink(apPorts[0].id, 'front', pp1Ports[e-1].id, 'back', 'cat6_plenum', '#e5e7eb')
      addLink(camPorts[0].id, 'front', pp2Ports[e-1].id, 'back', 'cat6_plenum', '#e5e7eb')
    }
  }
}

// === Cross-Rack Links ===
// Connect London COMMS01 to London RACK01 and RACK02 via Patch Panels
const lonCommsPP1 = patchPanelsByRack['COMMS01_London (HQ)'][0]
const lonRack1PP1 = patchPanelsByRack['RACK01_London (HQ)'][0]
const lonRack2PP1 = patchPanelsByRack['RACK02_London (HQ)'][0]
// 4 fiber pairs from COMMS01 to RACK01
for(let i = 20; i < 24; i++) {
  addLink(lonCommsPP1[i].id, 'back', lonRack1PP1[i].id, 'back', 'fiber_om4', '#ec4899')
}
// 4 fiber pairs from COMMS01 to RACK02
for(let i = 16; i < 20; i++) {
  addLink(lonCommsPP1[i].id, 'back', lonRack2PP1[i].id, 'back', 'fiber_om4', '#ec4899')
}

// === Cross-Site (WAN) Links ===
const lonFW = firewallsBySite['London (HQ)']
const parFW = firewallsBySite['Paris (Branch)']
const amsFW = firewallsBySite['Amsterdam (DC)']

// London to Paris WAN (Port 3 -> Port 3)
addLink(lonFW[2].id, 'front', parFW[2].id, 'front', 'wan_mpls', '#eab308')
// London to Amsterdam WAN (Port 4 -> Port 3)
addLink(lonFW[3].id, 'front', amsFW[2].id, 'front', 'wan_mpls', '#eab308')

fs.writeFileSync('demo-seed.json', JSON.stringify(exportPayload, null, 2))
console.log(`Generated demo-seed.json with:
  Sites: ${exportPayload.sites.length}
  Racks: ${exportPayload.racks.length}
  Devices: ${exportPayload.devices.length}
  Ports: ${exportPayload.ports.length}
  Links: ${exportPayload.cableLinks.length}
`)
