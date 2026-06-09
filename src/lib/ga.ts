// src/lib/ga.ts
export const GA_ID = 'G-T60PHEZ1S0';

export function initGA() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

export function track(event: string, data?: Record<string, any>) {
  window.gtag?.('event', event, data);
}