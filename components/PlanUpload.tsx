'use client';
interface Props {
  label: string;
  onLoad: (text: string) => void;
  loaded: boolean;
  count: number;
  unit: string;
  compact?: boolean;
}
export default function PlanUpload({ label, onLoad, loaded, count, unit, compact }: Props) {
  const [filename, setFilename] = React.useState<string | null>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => onLoad(ev.target?.result as string);
    reader.readAsText(file);
  };
  if (compact) return (
    <span style={{ fontSize: '13px', color: loaded ? '#48bb78' : '#fc8181' }}>
      {loaded ? `✅ ${label}: ${count} ${unit} ${filename ? `(File: ${filename})` : ''}` : `⬜ ${label}: not loaded`}
      <label style={{ marginLeft: '8px', cursor: 'pointer', color: '#90cdf4', textDecoration: 'underline' }}>
        Change <input type="file" accept=".csv" onClick={(e: any) => e.target.value = null} onChange={handleFile} style={{ display: 'none' }} />
      </label>
    </span>
  );
  return (
    <div>
      <label style={{ display: 'inline-block', padding: '8px 16px', background: '#e8733a', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
        📂 {loaded ? `Change ${label}` : `Upload ${label}`}
        <input type="file" accept=".csv" onClick={(e: any) => e.target.value = null} onChange={handleFile} style={{ display: 'none' }} />
      </label>
      {loaded && <span style={{ marginLeft: '12px', color: '#48bb78' }}>✅ {count} {unit} loaded</span>}
    </div>
  );
}
