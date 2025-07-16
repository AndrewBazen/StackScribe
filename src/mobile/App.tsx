import React from 'react';

export default function MobileApp() {
  return (
    <div style={{ 
      padding: 16, 
      backgroundColor: '#ff6b6b', 
      color: 'white', 
      minHeight: '100vh',
      fontSize: '24px',
      textAlign: 'center' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>📱 MOBILE UI LOADED! 📱</h1>
      <p style={{ fontSize: '32px', marginBottom: '20px' }}>StackScribe – Android Version</p>
      <p style={{ fontSize: '24px' }}>This is the mobile UI placeholder.</p>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>
        User Agent: {navigator.userAgent}
      </p>
    </div>
  );
} 