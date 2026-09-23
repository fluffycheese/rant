import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type RackViewPayload } from '../api/client.ts';
import TracePanel from '../components/RackView/TracePanel.tsx';

export default function ScanPortPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<RackViewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const port = await api.ports.get(id!);
        const device = await api.devices.get(port.deviceId);
        const rackPayload = await api.racks.view(device.rackId);
        setPayload(rackPayload);
      } catch (err: any) {
        setError(err.message || 'Failed to load trace data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div style={{ padding: 20, color: '#F1F5F9', backgroundColor: '#0F172A', height: '100vh' }}>Loading trace data...</div>;
  if (error || !payload) return <div style={{ padding: 20, color: '#F87171', backgroundColor: '#0F172A', height: '100vh' }}>Error: {error || 'Data not found'}</div>;

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 16px', background: '#1E293B', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: '1px solid #334155', color: '#F1F5F9', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Back
        </button>
        <span style={{ color: '#F1F5F9', fontWeight: 'bold' }}>Port Trace</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TracePanel originPortId={id!} originSlot="front" currentPayload={payload} />
      </div>
    </div>
  );
}
