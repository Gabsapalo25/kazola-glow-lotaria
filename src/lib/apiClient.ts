import historicoCompleto from '../data/historico_completo.json';

export interface Draw {
  id: string;
  date: string;
  time: string;
  session: string;
  numbers: number[];
}

export async function fetchRealDraws(): Promise<Draw[]> {
  try {
    console.log('📡 A carregar dados do ficheiro JSON local...');
    
    const drawsMap = new Map<string, Draw>(); // Usar Map para garantir unicidade
    const now = new Date();

    for (const group of historicoCompleto) {
      const date = extractDate(group.formatedDate);
      
      // Se a data do grupo é no futuro, ignorar todo o grupo
      if (new Date(date) > now) continue;

      if (!group.results || !Array.isArray(group.results)) continue;

      for (const draw of group.results) {
        if (!draw.number_1 || !draw.number_2 || !draw.number_3 || !draw.number_4 || !draw.number_5) continue;
        
        const horaStr = draw.hour?.replace('H00', '').replace('h00', '') || '0';
        const horaNum = parseInt(horaStr);
        const dataSorteio = new Date(date);
        dataSorteio.setHours(horaNum, 0, 0);
        
        // Só adicionar se já passou
        if (dataSorteio > now) continue;
        
        // Chave única: data + hora + sessão
        const key = `${date}-${draw.name}`;
        
        // Se já existe este sorteio, NÃO substituir (mantém o primeiro)
        if (!drawsMap.has(key)) {
          drawsMap.set(key, {
            id: key,
            date: date,
            time: draw.hour ? draw.hour.replace('H', ':').replace('h', ':') : '--:--',
            session: draw.name,
            numbers: [draw.number_1, draw.number_2, draw.number_3, draw.number_4, draw.number_5].sort((a, b) => a - b)
          });
        }
      }
    }

    // Converter Map para array e ordenar
    const draws = Array.from(drawsMap.values());
    draws.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`📊 Total de sorteios ÚNICOS carregados: ${draws.length}`);
    if (draws.length > 0) console.log('🎯 Último sorteio:', draws[0]);

    return draws;

  } catch (error) {
    console.error('❌ Erro ao ler dados do ficheiro JSON:', error);
    return [];
  }
}

function extractDate(formatedDate: string): string {
  if (!formatedDate) return new Date().toISOString().split('T')[0];
  const match = formatedDate.match(/(\d{1,2}) de (\w+) de (\d{4})/);
  if (!match) return new Date().toISOString().split('T')[0];
  const [, day, month, year] = match;
  const meses: Record<string, string> = {
    'Janeiro': '01', 'Fevereiro': '02', 'Março': '03', 'Abril': '04',
    'Maio': '05', 'Junho': '06', 'Julho': '07', 'Agosto': '08',
    'Setembro': '09', 'Outubro': '10', 'Novembro': '11', 'Dezembro': '12'
  };
  const monthNumber = meses[month];
  if (!monthNumber) return `${year}-01-01`;
  return `${year}-${monthNumber}-${day.padStart(2, '0')}`;
}