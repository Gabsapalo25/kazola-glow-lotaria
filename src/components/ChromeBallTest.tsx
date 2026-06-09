// ============================================================
// ChromeBallTest.tsx — Teste isolado da Peça 2
// Apagar após aprovação
// ============================================================

import React, { useState } from 'react';
import ChromeBall from './ChromeBall';

const ChromeBallTest: React.FC = () => {
  const [globalSpin, setGlobalSpin] = useState(false);
  const [individualSpins, setIndividualSpins] = useState<Record<string, boolean>>({});

  const triggerIndividualSpin = (id: string) => {
    setIndividualSpins(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setIndividualSpins(prev => ({ ...prev, [id]: false }));
    }, 1000);
  };

  return (
    <div style={{ padding: '24px', background: '#0B0F19', minHeight: '100vh' }}>
      {/* Título */}
      <h1 style={{ color: '#00F5A0', marginBottom: '24px' }}>🧪 Teste — ChromeBall</h1>

      {/* Botão global */}
      <button
        onClick={() => setGlobalSpin(true)}
        style={{
          background: '#00F5A0',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '10px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '32px',
        }}
        onAnimationEnd={() => setGlobalSpin(false)}
      >
        🎰 Rodar Todas as Bolas
      </button>

      {/* Secção: Tamanhos */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '16px' }}>📏 Tamanhos</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div><ChromeBall n={42} size="sm" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>sm</div></div>
          <div><ChromeBall n={42} size="md" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>md</div></div>
          <div><ChromeBall n={42} size="lg" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>lg</div></div>
        </div>
      </div>

      {/* Secção: Variantes */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '16px' }}>🎨 Variantes</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div><ChromeBall n={7} variant="normal" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>normal</div></div>
          <div><ChromeBall n={23} variant="hot" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>hot</div></div>
          <div><ChromeBall n={45} variant="cold" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>cold</div></div>
          <div><ChromeBall n={68} variant="hit" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>hit</div></div>
          <div><ChromeBall n={89} variant="excluded" /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>excluded</div></div>
        </div>
      </div>

      {/* Secção: Animação */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '16px' }}>🎰 Animação Slot Machine</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((_, idx) => {
            const id = `ball-${idx}`;
            return (
              <div key={idx}>
                <ChromeBall
                  n={idx * 10 + 5}
                  size="lg"
                  spinning={individualSpins[id] || false}
                />
                <button
                  onClick={() => triggerIndividualSpin(id)}
                  style={{
                    marginTop: '8px',
                    background: '#333',
                    border: '1px solid #00F5A0',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    color: '#00F5A0',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Rodar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secção: Animated automático */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ color: '#FFD700', marginBottom: '16px' }}>⏳ Animated + Delay</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div><ChromeBall n={10} animated delay={0} /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>delay 0ms</div></div>
          <div><ChromeBall n={20} animated delay={500} /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>delay 500ms</div></div>
          <div><ChromeBall n={30} animated delay={1000} /> <div style={{ color: '#888', fontSize: '12px', marginTop: '8px' }}>delay 1000ms</div></div>
        </div>
      </div>

      {/* Nota */}
      <div style={{ marginTop: '48px', padding: '16px', background: '#111827', borderRadius: '10px', borderLeft: `4px solid #00F5A0` }}>
        <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>
          ✅ Critérios de aprovação:<br/>
          • Reflexo metálico visível (brilho no canto superior esquerdo)<br/>
          • Animação de giro funciona (números mudam durante ~800ms)<br/>
          • Variantes hot (vermelho glow), cold (azul glow), hit (verde glow pulse)<br/>
          • Tamanhos sm/md/lg correctos<br/>
          • Props compatíveis com Ball.tsx actual
        </p>
      </div>
    </div>
  );
};

export default ChromeBallTest;