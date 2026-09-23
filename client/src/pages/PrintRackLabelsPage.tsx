import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, type RackViewPayload } from '../api/client.ts';

export default function PrintRackLabelsPage() {
  const { id } = useParams<{ id: string }>();
  const [payload, setPayload] = useState<RackViewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.racks.view(id)
      .then(setPayload)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Loading labels...</div>;
  if (!payload) return <div style={{ padding: 20 }}>Rack not found</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <style>
        {`
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 0.5cm; }
            button { display: none !important; }
          }
        `}
      </style>
      
      <button 
        onClick={() => window.print()}
        style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: '#f8f9fa' }}
      >
        🖨️ Print Labels
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {payload.devices.map(device => {
          const url = `${window.location.origin}/scan/device/${device.id}`;
          return (
            <div key={device.id} style={{
              border: '1px solid #ccc', padding: '16px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', gap: '12px', pageBreakInside: 'avoid'
            }}>
              <QRCodeSVG 
                value={url} size={120}
                imageSettings={{ src: '/favicon.svg', height: 24, width: 24, excavate: true }} 
              />
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>{device.name}</strong>
                <span style={{ fontSize: '12px', color: '#666' }}>{payload.rack.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
