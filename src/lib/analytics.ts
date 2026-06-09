/**
 * analytics.ts — Google Analytics 4 + Facebook Pixel + Validação de Performance
 * ============================================================================
 * Sistema completo para medir a eficácia do gerador Kazola V4-D
 * 
 * Eventos monitorados:
 * - Geração de combinações (estratégia, quantidade, premium)
 * - Validação contra sorteios reais (acertos, taxa de sucesso)
 * - Upgrade para Premium (plano, valor)
 * - Partilha de combinações
 * - Favoritos
 */

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// =============================================================
// CONFIGURAÇÕES (SUBSTITUIR PELOS SEUS IDs REAIS)
// =============================================================
export const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // ← Colocar ID real do GA4
export const FB_PIXEL_ID = 'XXXXXXXXXXXXXXX';    // ← Colocar ID real do Facebook Pixel

// =============================================================
// GOOGLE ANALYTICS 4 (GA4)
// =============================================================

export function initGA() {
  if (typeof window === 'undefined') return;
  
  // Evita duplicação
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
    return;
  }
  
  // Carrega o script do GA4
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
  
  console.log('📊 Google Analytics 4 inicializado');
}

export function eventGA(action: string, category: string, label?: string, value?: number) {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// Eventos específicos do Kazola
export function trackGeneration(strategy: string, linesCount: number, isPremium: boolean) {
  eventGA('generate', 'gerador', `${strategy}_${linesCount}_${isPremium ? 'premium' : 'free'}`, linesCount);
  console.log(`📊 GA: Geração ${strategy} - ${linesCount} linhas`);
}

export function trackValidation(hits: number, strategy: string, linesCount: number) {
  eventGA('validation', 'acertos', `${strategy}_${hits}_acertos`, hits);
  if (hits >= 2) {
    eventGA('win_2plus', 'premio', strategy, hits);
  }
  if (hits >= 3) {
    eventGA('win_3plus', 'premio', strategy, hits);
  }
  if (hits >= 4) {
    eventGA('win_4plus', 'premio', strategy, hits);
  }
  if (hits >= 5) {
    eventGA('win_jackpot', 'premio', strategy, hits);
  }
  console.log(`📊 GA: Validação - ${hits} acertos com ${strategy}`);
}

export function trackFavorite(action: 'add' | 'remove', numbers: number[]) {
  eventGA('favorite', 'favoritos', `${action}_${numbers.join('-')}`, action === 'add' ? 1 : 0);
}

export function trackUpgrade(plan: 'mensal' | 'anual' | 'vitalicio', priceKz: number) {
  eventGA('upgrade', 'premium', plan, priceKz);
}

export function trackLogin(method: 'email' | 'token' | 'trial') {
  eventGA('login', 'acesso', method);
}

export function trackShare(platform: 'facebook' | 'whatsapp' | 'copy', numbers: number[]) {
  eventGA('share', 'partilha', `${platform}_${numbers.join('-')}`);
}

// =============================================================
// FACEBOOK PIXEL
// =============================================================

export function initFB() {
  if (typeof window === 'undefined') return;
  
  // Evita duplicação
  if (window.fbq) return;
  
  // Carrega o script do Facebook Pixel
  !function(f,b,e,v,n,t,s) {
    if(f.fbq)return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  
  window.fbq('init', FB_PIXEL_ID);
  window.fbq('track', 'PageView');
  
  console.log('📘 Facebook Pixel inicializado');
}

export function trackFB(event: string, parameters?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, parameters);
}

// Eventos padrão do Facebook
export function trackFBCompleteRegistration(email?: string) {
  trackFB('CompleteRegistration', { content_name: 'registro', email });
}

export function trackFBLead(email?: string) {
  trackFB('Lead', { content_name: 'trial_ativado', email });
}

export function trackFBSubscribe(plan: string, priceKz: number) {
  trackFB('Subscribe', { 
    subscription_plan: plan, 
    value: priceKz, 
    currency: 'AOA',
    predicted_ltv: priceKz * (plan === 'anual' ? 12 : plan === 'vitalicio' ? 60 : 1)
  });
}

export function trackFBPurchase(plan: string, priceKz: number) {
  trackFB('Purchase', { 
    value: priceKz, 
    currency: 'AOA',
    content_name: `Plano ${plan}`,
    content_type: 'subscription'
  });
}

// =============================================================
// SISTEMA DE VALIDAÇÃO OFFLINE (PERFORMANCE DO GERADOR)
// =============================================================

export interface ValidationRecord {
  id: string;
  date: string;
  sessionName: string;
  strategy: string;
  lines: number[][];
  drawnNumbers: number[];
  hits: number;
  hit2Plus: boolean;
  hit3Plus: boolean;
  hit4Plus: boolean;
  hit5: boolean;
}

const VALIDATION_STORAGE_KEY = 'kazola_validation_history';
const MAX_VALIDATION_RECORDS = 500;

export function saveValidation(record: Omit<ValidationRecord, 'id'>) {
  try {
    const existing = localStorage.getItem(VALIDATION_STORAGE_KEY);
    const history: ValidationRecord[] = existing ? JSON.parse(existing) : [];
    
    const newRecord: ValidationRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    history.unshift(newRecord);
    
    if (history.length > MAX_VALIDATION_RECORDS) {
      history.pop();
    }
    
    localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify(history));
    
    // Envia para analytics
    trackValidation(record.hits, record.strategy, record.lines.length);
    
    // Grandes acertos vão para o Facebook também
    if (record.hits >= 3) {
      trackFB('CustomizeProduct', { 
        content_name: 'big_win', 
        value: record.hits, 
        content_category: record.strategy 
      });
    }
    
    console.log(`✅ Validação registada: ${record.hits} acertos com ${record.strategy}`);
    
  } catch (error) {
    console.error('Erro ao guardar validação:', error);
  }
}

export function getValidationHistory(): ValidationRecord[] {
  try {
    const existing = localStorage.getItem(VALIDATION_STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

export function getValidationStats() {
  const history = getValidationHistory();
  if (history.length === 0) return null;
  
  const total = history.length;
  const hit2Plus = history.filter(r => r.hit2Plus).length;
  const hit3Plus = history.filter(r => r.hit3Plus).length;
  const hit4Plus = history.filter(r => r.hit4Plus).length;
  const hit5 = history.filter(r => r.hit5).length;
  
  // Estatísticas por estratégia
  const byStrategy: Record<string, { total: number; hits: number; rate: number }> = {};
  for (const record of history) {
    if (!byStrategy[record.strategy]) {
      byStrategy[record.strategy] = { total: 0, hits: 0, rate: 0 };
    }
    byStrategy[record.strategy].total++;
    if (record.hit2Plus) byStrategy[record.strategy].hits++;
  }
  
  for (const strategy in byStrategy) {
    byStrategy[strategy].rate = (byStrategy[strategy].hits / byStrategy[strategy].total) * 100;
  }
  
  // Últimos 30 dias
  const trintaDiasAtras = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentes = history.filter(r => new Date(r.date).getTime() >= trintaDiasAtras);
  const recentesHit2Plus = recentes.filter(r => r.hit2Plus).length;
  
  return {
    total,
    hit2Plus,
    hit2PlusRate: (hit2Plus / total) * 100,
    hit3Plus,
    hit3PlusRate: (hit3Plus / total) * 100,
    hit4Plus,
    hit4PlusRate: (hit4Plus / total) * 100,
    hit5,
    hit5Rate: (hit5 / total) * 100,
    byStrategy,
    ultimos30Dias: {
      total: recentes.length,
      hit2Plus: recentesHit2Plus,
      hit2PlusRate: recentes.length > 0 ? (recentesHit2Plus / recentes.length) * 100 : 0,
    },
  };
}

export function clearValidationHistory() {
  localStorage.removeItem(VALIDATION_STORAGE_KEY);
  console.log('🗑️ Histórico de validação limpo');
}

// =============================================================
// COMPONENTE: CARD DE PERFORMANCE DO GERADOR
// =============================================================

export function ValidationStatsCard() {
  const [stats, setStats] = useState<ReturnType<typeof getValidationStats> | null>(null);
  
  useEffect(() => {
    setStats(getValidationStats());
    
    // Atualiza quando houver mudanças no localStorage
    const handleStorageChange = () => {
      setStats(getValidationStats());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  if (!stats || stats.total === 0) {
    return (
      <div className="bg-neutral-50 rounded-2xl p-5 text-center text-neutral-500 text-sm border border-neutral-200">
        <div className="text-3xl mb-2">📊</div>
        <p className="font-medium">Ainda sem dados de validação</p>
        <p className="text-xs mt-1">Gere combinações e confira com os sorteios reais</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-r from-neutral-50 to-white rounded-2xl p-5 space-y-4 border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display font-bold text-xl">🎯 Performance do Gerador</h3>
        <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
          {stats.total} sorteios conferidos
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-100 rounded-xl p-3 text-center transition hover:scale-105">
          <div className="text-2xl font-bold text-green-700">{stats.hit2PlusRate.toFixed(1)}%</div>
          <div className="text-xs text-green-600 font-medium">≥2 acertos</div>
          <div className="text-[10px] text-green-500 mt-1">{stats.hit2Plus}/{stats.total}</div>
        </div>
        <div className="bg-blue-100 rounded-xl p-3 text-center transition hover:scale-105">
          <div className="text-2xl font-bold text-blue-700">{stats.hit3PlusRate.toFixed(1)}%</div>
          <div className="text-xs text-blue-600 font-medium">≥3 acertos</div>
          <div className="text-[10px] text-blue-500 mt-1">{stats.hit3Plus}/{stats.total}</div>
        </div>
        <div className="bg-purple-100 rounded-xl p-3 text-center transition hover:scale-105">
          <div className="text-2xl font-bold text-purple-700">{stats.hit4PlusRate.toFixed(1)}%</div>
          <div className="text-xs text-purple-600 font-medium">≥4 acertos</div>
          <div className="text-[10px] text-purple-500 mt-1">{stats.hit4Plus}/{stats.total}</div>
        </div>
        <div className="bg-amber-100 rounded-xl p-3 text-center transition hover:scale-105">
          <div className="text-2xl font-bold text-amber-700">{stats.hit5Rate.toFixed(1)}%</div>
          <div className="text-xs text-amber-600 font-medium">5 acertos</div>
          <div className="text-[10px] text-amber-500 mt-1">{stats.hit5}/{stats.total}</div>
        </div>
      </div>
      
      {stats.ultimos30Dias.total > 0 && (
        <div className="text-xs text-neutral-500 text-center border-t pt-3 mt-2">
          📈 Últimos 30 dias: <strong className="text-emerald-600">{stats.ultimos30Dias.hit2PlusRate.toFixed(1)}%</strong> de acertos (≥2)
        </div>
      )}
      
      <details className="text-xs">
        <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700 font-medium">
          📋 Detalhes por estratégia
        </summary>
        <div className="mt-2 space-y-1 bg-neutral-50 p-2 rounded-lg">
          {Object.entries(stats.byStrategy).map(([strategy, data]) => (
            <div key={strategy} className="flex justify-between items-center">
              <span className="capitalize font-medium">{strategy}</span>
              <span className="font-mono text-xs">
                {data.hits}/{data.total} ({data.rate.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </details>
      
      <div className="text-[10px] text-neutral-400 text-center border-t pt-2">
        Baseado em sorteios reais da Lotaria Nacional de Angola
      </div>
    </div>
  );
}