import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#1e1f22',
      color: '#f2f3f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#5865f2' }}>
        Discordia WebApp
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#949ba4', marginBottom: '2rem' }}>
        Plataforma comunitaria de texto y voz en tiempo real
      </p>

      <div style={{
        backgroundColor: '#2b2d31',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
      }}>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            backgroundColor: '#5865f2',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s',
          }}
        >
          Contador: {count}
        </button>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#b5bac1' }}>
          Entorno Docker conectado a <code>discordia-net</code>
        </p>
      </div>
    </div>
  );
}
