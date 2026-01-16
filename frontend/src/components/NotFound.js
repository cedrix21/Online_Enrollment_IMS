import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      textAlign: 'center',
      backgroundColor: '#f4f4f4',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '100px', color: '#b8860b', margin: 0 }}>404</h1>
      <h2 style={{ color: '#333' }}>Access Restricted</h2>
      <p style={{ color: '#666', maxWidth: '400px', marginBottom: '30px' }}>
        You have declined the Data Privacy Agreement. We cannot process your enrollment application without your consent to handle the required information.
      </p>
      
    </div>
  );
}