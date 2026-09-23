import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type RackDevice, type Port, type Rack } from '../api/client.ts';

export default function ScanDevicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<RackDevice | null>(null);
  const [rack, setRack] = useState<Rack | null>(null);
  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const dev = await api.devices.get(id!);
        // @ts-ignore
        setDevice(dev);
        const [pts, rck] = await Promise.all([
          api.devices.ports(id!),
          api.racks.get(dev.rackId)
        ]);
        setPorts(pts.sort((a, b) => a.position - b.position));
        setRack(rck);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (ports.length === 1) {
      navigate('/scan/port/' + ports[0].id, { replace: true });
    }
  }, [ports, navigate]);

  if (loading) return <div style={{ padding: 20, color: '#F1F5F9', backgroundColor: '#0F172A', minHeight: '100vh' }}>Loading device...</div>;
  if (!device) return <div style={{ padding: 20, color: '#F87171', backgroundColor: '#0F172A', minHeight: '100vh' }}>Device not found.</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F172A', color: '#F1F5F9', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#F1F5F9' }}>{device.name}</h1>
          <div style={{ color: '#94A3B8', fontSize: '14px', marginTop: '4px' }}>
            {device.category} {rack ? `· Rack: ${rack.name}` : ''}
          </div>
          {device.notes && <div style={{ marginTop: '8px', fontSize: '14px', color: '#CBD5E1' }}>{device.notes}</div>}
        </header>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ports.length === 0 ? (
            <div style={{ color: '#94A3B8' }}>No ports available on this device.</div>
          ) : (
            ports.map(port => (
              <div key={port.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#1E293B',
                color: '#F1F5F9'
              }}>
                <div>
                  <strong style={{ fontSize: '16px', display: 'block', color: '#F1F5F9' }}>{port.label}</strong>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {port.connectorType} {port.groupName ? `(${port.groupName})` : ''}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/scan/port/${port.id}`)}
                  style={{
                    padding: '8px 16px', backgroundColor: '#3BB2F6', color: 'white',
                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  Trace
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
