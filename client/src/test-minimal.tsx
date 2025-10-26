import React from 'react';
import { createRoot } from 'react-dom/client';

function TestApp() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Page - Basic React Working</h1>
      <p>If you can see this, React is working.</p>
      <p>Therapist Dashboard - View All Sessions Button Fixed</p>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find root element');

const root = createRoot(container);
root.render(<TestApp />);