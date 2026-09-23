import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, type Site, type RackDevice, type Port } from '../api/client.ts';

type EndpointPort = { port: Port; device: RackDevice };

export default function PrintSiteLabelsPage() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState('L7651');

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const siteData = await api.sites.get(id!);
        setSite(siteData);
        
        const racks = await api.sites.racks(id!);
        const targetCategories = ['wall_panel', 'wifi_ap', 'ip_camera'];
        const eps: EndpointPort[] = [];
        
        for (const rack of racks) {
          const payload = await api.racks.view(rack.id);
          for (const device of payload.devices) {
            if (targetCategories.includes(device.category)) {
              for (const port of device.ports) eps.push({ port, device });
            }
          }
        }
        setEndpoints(eps);
        setSelectedIds(new Set(eps.map(ep => ep.port.id)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Loading labels...</div>;
  if (!site) return <div style={{ padding: 20 }}>Site not found</div>;

  const handleToggle = (portId: string) => {
    const next = new Set(selectedIds);
    if (next.has(portId)) next.delete(portId);
    else next.add(portId);
    setSelectedIds(next);
  };

  const handleSelectAll = (select: boolean) => {
    if (select) setSelectedIds(new Set(endpoints.map(ep => ep.port.id)));
    else setSelectedIds(new Set());
  };

  const itemsToPrint = endpoints.filter(ep => selectedIds.has(ep.port.id));

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>
        {`
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 0; }
            .no-print { display: none !important; }
            .print-grid { padding: 0 !important; }
          }
        `}
      </style>
      
      <div className="no-print" style={{ padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 16px 0' }}>Pre-Print Options</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ marginRight: '12px', fontWeight: 'bold' }}>Format:</label>
              <select value={format} onChange={e => setFormat(e.target.value)} style={{ padding: '4px' }}>
                <option value="L7651">Avery L7651 (65 per sheet)</option>
              </select>
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', fontWeight: 'bold' }}
            disabled={itemsToPrint.length === 0}
          >
            🖨️ Print Labels ({itemsToPrint.length})
          </button>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <strong>Select Ports:</strong>
          <button onClick={() => handleSelectAll(true)} style={{ marginLeft: '12px', padding: '2px 8px', cursor: 'pointer' }}>All</button>
          <button onClick={() => handleSelectAll(false)} style={{ marginLeft: '4px', padding: '2px 8px', cursor: 'pointer' }}>None</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '12px', background: '#fff' }}>
          {endpoints.map(({ port, device }) => (
            <label key={port.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedIds.has(port.id)} onChange={() => handleToggle(port.id)} />
              {port.label} ({device.name})
            </label>
          ))}
        </div>
      </div>

      <div className="print-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 38.1mm)', 
        gridAutoRows: '21.2mm', 
        gap: '2mm',
        padding: '20px',
        justifyContent: 'center'
      }}>
        {itemsToPrint.map(({ port, device }) => {
          const url = `${window.location.origin}/scan/port/${port.id}`;
          return (
            <div key={port.id} style={{
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              display: 'flex', 
              flexDirection: 'row',
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '2mm',
              gap: '4px',
              pageBreakInside: 'avoid',
              overflow: 'hidden'
            }}>
              <QRCodeSVG 
                value={url} size={64}
                imageSettings={{ src: '/favicon.svg', height: 12, width: 12, excavate: true }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, justifyContent: 'center' }}>
                <strong style={{ display: 'block', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{port.label}</strong>
                <span style={{ fontSize: '7px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{device.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
