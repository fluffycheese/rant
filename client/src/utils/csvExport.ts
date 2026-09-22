import type { RackDevice, CableLink } from '../api/client.ts'

/** Escape a CSV field value */
function esc(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

/** Trigger a browser download of a CSV string */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Generate devices CSV for a rack */
export function devicesToCsv(devices: RackDevice[], rackName: string, siteName: string): string {
  const rows = [
    ['Site', 'Rack', 'U Position', 'Device Name', 'Category', 'Manufacturer', 'Model', 'U Height', 'Port Count'].map(esc).join(','),
    ...devices.map(d => [
      siteName,
      rackName,
      d.positionU ?? '',
      d.name,
      d.category,
      d.template?.manufacturer ?? '',
      d.template?.model ?? '',
      d.template?.uHeight ?? 1,
      d.ports?.length ?? 0,
    ].map(esc).join(','))
  ]
  return rows.join('\n')
}

/** Generate connections CSV for a rack.
 * portLookup maps portId to an object with device and port label info.
 */
export function connectionsToCsv(
  links: CableLink[],
  portLookup: Map<string, { device: RackDevice; port: { id: string; label: string } }>
): string {
  const rows = [
    [
      'A Site', 'A Rack', 'A Device', 'A Port', 'A Slot',
      'B Site', 'B Rack', 'B Device', 'B Port', 'B Slot',
      'Cable Type', 'Colour', 'Label'
    ].map(esc).join(','),
    ...links.map(l => {
      const a = portLookup.get(l.portAId)
      const b = portLookup.get(l.portBId)
      return [
        a?.device.site?.name ?? '', a?.device.rack?.name ?? '', a?.device.name ?? '', a?.port.label ?? '', l.portASlot,
        b?.device.site?.name ?? '', b?.device.rack?.name ?? '', b?.device.name ?? '', b?.port.label ?? '', l.portBSlot,
        l.cableType, l.color ?? '', l.label ?? '',
      ].map(esc).join(',')
    })
  ]
  return rows.join('\n')
}

/** Generate connections and ports CSV for a single device */
export function singleDeviceConnectionsToCsv(
  device: RackDevice,
  links: CableLink[],
  portLookup: Map<string, { device: RackDevice; port: { id: string; label: string } }>
): string {
  const rows = [
    ['Local Port', 'Slot', 'Remote Device', 'Remote Port', 'Remote Rack', 'Remote Site', 'Cable Type', 'Colour', 'Cable Label'].map(esc).join(',')
  ]

  // For every port on this device, check if it has a front/back link
  const devicePorts = device.ports || []
  
  for (const port of devicePorts) {
    const frontLink = links.find(l => (l.portAId === port.id && l.portASlot === 'front') || (l.portBId === port.id && l.portBSlot === 'front'))
    const backLink = links.find(l => (l.portAId === port.id && l.portASlot === 'back') || (l.portBId === port.id && l.portBSlot === 'back'))

    const addRow = (slot: string, link: CableLink | undefined) => {
      if (!link) {
        // Output empty row for unpatched port slots (optional, but good for schedules)
        rows.push([port.label, slot, '', '', '', '', '', '', ''].map(esc).join(','))
        return
      }
      const isA = link.portAId === port.id
      const remotePortId = isA ? link.portBId : link.portAId
      const remoteInfo = portLookup.get(remotePortId)
      
      rows.push([
        port.label,
        slot,
        remoteInfo?.device.name ?? 'Unknown',
        remoteInfo?.port.label ?? 'Unknown',
        remoteInfo?.device.rack?.name ?? '',
        remoteInfo?.device.site?.name ?? '',
        link.cableType,
        link.color ?? '',
        link.label ?? ''
      ].map(esc).join(','))
    }

    // Standard devices just have front links, passthrough have front and back
    const isPassthrough = ['patch_panel', 'wall_panel'].includes(device.category)
    addRow('front', frontLink)
    if (isPassthrough) {
      addRow('back', backLink)
    }
  }

  return rows.join('\n')
}

