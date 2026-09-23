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
        {endpoints.map(({ port, device }) => {
          const url = `${window.location.origin}/scan/port/${port.id}`;
          return (
            <div key={port.id} style={{
              border: '1px solid #ccc', padding: '16px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', gap: '12px', pageBreakInside: 'avoid'
            }}>
              <QRCodeSVG 
                value={url} size={120}
                imageSettings={{ src: '/favicon.svg', height: 24, width: 24, excavate: true }} 
              />
              <div>
                <strong style={{ display: 'block', fontSize: '14px' }}>{port.label}</strong>
                <span style={{ fontSize: '12px', color: '#666' }}>{device.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
