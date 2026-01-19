export default function App() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Hajj Package Ranker</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Shortlist, compare, and rank Hajj packages based on your priorities.
      </p>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>How to use</h2>
        <ol style={{ marginBottom: 0 }}>
          <li>Add your shortlisted packages (manual entry).</li>
          <li>Set preferences (hujjaj, local budget, dates, camp/room/zone).</li>
          <li>Go to Recommend to see ranked configurations.</li>
        </ol>
      </div>
    </div>
  )
}
