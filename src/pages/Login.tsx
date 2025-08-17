import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

const Login: React.FC = () => {
  const { isLoading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Force refresh to clear cache

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      setError(error.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ padding: 24, border: '1px solid #ddd', borderRadius: 8, minWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
          {isSignUp ? 'Registrierung' : 'Anmeldung'}
        </h1>
        
        {user ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 16 }}>Bereits angemeldet als:</p>
            <p style={{ fontWeight: 500, marginBottom: 16 }}>{user.email}</p>
            <button 
              onClick={() => auth.signOut()} 
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Abmelden
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                E-Mail:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14
                }}
                placeholder="ihre.email@beispiel.de"
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Passwort:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14
                }}
                placeholder="Mindestens 6 Zeichen"
              />
            </div>

            {error && (
              <div style={{ 
                marginBottom: 16, 
                padding: '8px 12px', 
                backgroundColor: '#f8d7da', 
                color: '#721c24', 
                borderRadius: 4,
                fontSize: 14
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isProcessing || isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: isProcessing || isLoading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 16,
                cursor: isProcessing || isLoading ? 'not-allowed' : 'pointer',
                marginBottom: 16
              }}
            >
              {isProcessing ? 'Wird verarbeitet...' : (isSignUp ? 'Registrieren' : 'Anmelden')}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007bff',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: 14
                }}
              >
                {isSignUp ? 'Bereits ein Konto? Anmelden' : 'Kein Konto? Registrieren'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;


