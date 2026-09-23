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

  if (loading) return <div style={{ padding: 20 }}>Loading device...</div>;
  if (!device) return <div style={{ padding: 20 }}>Device not found.</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>{device.name}</h1>
        <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
          {device.category} {rack ? `· Rack: ${rack.name}` : ''}
        </div>
        {device.notes && <div style={{ marginTop: '8px', fontSize: '14px' }}>{device.notes}</div>}
      </header>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ports.length === 0 ? (
          <div style={{ color: '#999' }}>No ports available on this device.</div>
        ) : (
          ports.map(port => (
            <div key={port.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa'
            }}>
              <div>
                <strong style={{ fontSize: '16px', display: 'block' }}>{port.label}</strong>
                <span style={{ fontSize: '12px', color: '#555' }}>
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
  );
}
