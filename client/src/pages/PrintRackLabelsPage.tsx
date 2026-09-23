import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, type RackViewPayload } from '../api/client.ts';

export default function PrintRackLabelsPage() {
  const { id } = useParams<{ id: string }>();
  const [payload, setPayload] = useState<RackViewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState('L7651');

  useEffect(() => {
    if (!id) return;
    api.racks.view(id)
      .then(data => {
        setPayload(data);
        setSelectedIds(new Set(data.devices.map(d => d.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Loading labels...</div>;
  if (!payload) return <div style={{ padding: 20 }}>Rack not found</div>;

  const handleToggle = (deviceId: string) => {
    const next = new Set(selectedIds);
    if (next.has(deviceId)) next.delete(deviceId);
    else next.add(deviceId);
    setSelectedIds(next);
  };

  const handleSelectAll = (select: boolean) => {
    if (select) setSelectedIds(new Set(payload.devices.map(d => d.id)));
    else setSelectedIds(new Set());
  };

  const itemsToPrint = payload.devices.filter(d => selectedIds.has(d.id));

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
          <strong>Select Devices:</strong>
          <button onClick={() => handleSelectAll(true)} style={{ marginLeft: '12px', padding: '2px 8px', cursor: 'pointer' }}>All</button>
          <button onClick={() => handleSelectAll(false)} style={{ marginLeft: '4px', padding: '2px 8px', cursor: 'pointer' }}>None</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '12px', background: '#fff' }}>
          {payload.devices.map(device => (
            <label key={device.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedIds.has(device.id)} onChange={() => handleToggle(device.id)} />
              {device.name}
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
        {itemsToPrint.map(device => {
          const url = `${window.location.origin}/scan/device/${device.id}`;
          return (
            <div key={device.id} style={{
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
                <strong style={{ display: 'block', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{device.name}</strong>
                <span style={{ fontSize: '7px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{payload.rack.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
