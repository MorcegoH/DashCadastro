import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';
import { CotacaoData, DashboardMetrics } from './types';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseExcelFile(file: File): Promise<CotacaoData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error("O formato do arquivo não atende aos critérios. Nenhuma aba encontrada no arquivo."));
          return;
        }

        const normalizeKey = (key: string) => {
          if (!key) return '';
          return key
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove accents
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_') // replace spaces and special chars with underscore
            .replace(/^_+|_+$/g, ''); // remove leading/trailing underscores
        };

        const requiredColumns = [
          'codigo_cotacao',
          'placa_ou_chassi',
          'nome_associado',
          'nome_grupo',
          'nome_usuario',
          'nome_analista',
          'inicio_analise',
          'fim_analise',
          'tempo_analise_minutos',
          'tempo_analise'
        ];

        let allRowsRaw: any[] = [];
        let lastMissingColumns: string[] = [];

        // Percorre TODAS as abas da planilha de Excel
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const jsonDataRaw = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd HH:MM:ss', defval: '' });
          if (jsonDataRaw.length === 0) continue;

          const jsonData = jsonDataRaw.map(row => {
            const newRow: any = {};
            for (const key of Object.keys(row)) {
              newRow[normalizeKey(key)] = row[key];
            }
            return newRow;
          });

          const headers = Object.keys(jsonData[0] || {});
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));

          if (missingColumns.length === 0) {
            allRowsRaw = allRowsRaw.concat(jsonData);
          } else {
            lastMissingColumns = missingColumns;
          }
        }

        if (allRowsRaw.length === 0) {
          if (lastMissingColumns.length > 0) {
            reject(new Error(`O formato do arquivo não atende aos critérios. É necessário subir o arquivo na estrutura correta.\n\nColunas ausentes ou com nomes incorretos:\n${lastMissingColumns.join(', ')}`));
          } else {
            reject(new Error("O formato do arquivo não atende aos critérios. O arquivo está vazio ou não contém dados válidos."));
          }
          return;
        }

        const seenKeys = new Set<string>();
        const formattedData: CotacaoData[] = [];

        for (const row of allRowsRaw) {
          const codigo = String(row.codigo_cotacao || '').trim();
          if (!codigo) continue;

          const inicioStr = String(row.inicio_analise || '').trim();
          const fimStr = String(row.fim_analise || '').trim();
          const uniqueKey = `${codigo}_${inicioStr}`;

          if (seenKeys.has(uniqueKey)) continue;
          seenKeys.add(uniqueKey);

          const inicioDate = parseCustomDate(inicioStr);
          const fimDate = parseCustomDate(fimStr);

          let tempoBusinessMinutos = 0;
          if (inicioDate && fimDate) {
            tempoBusinessMinutos = calculateBusinessMinutes(inicioDate, fimDate);
          } else {
            tempoBusinessMinutos = Number(row.tempo_analise_minutos || 0);
          }

          formattedData.push({
            codigo_cotacao: codigo,
            placa_ou_chassi: String(row.placa_ou_chassi || ''),
            nome_associado: String(row.nome_associado || ''),
            nome_grupo: String(row.nome_grupo || ''),
            nome_usuario: String(row.nome_usuario || ''),
            nome_analista: String(row.nome_analista || ''),
            inicio_analise: inicioStr,
            fim_analise: fimStr,
            tempo_analise_minutos: tempoBusinessMinutos,
            tempo_analise: String(row.tempo_analise || ''),
          });
        }

        resolve(formattedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

const rawRegionalMap: Record<string, string> = {
  // CEI
  "HENRIQUE VIANA PRADO": "CEI",
  "LUCAS SOUSA DE MIRANDA": "CEI",
  "REGIONAL CEI": "CEI",

  // CRS
  "MATEUS VINICIUS GONCALVES": "CRS",
  "MATEUS VINICIUS GONÇALVES DE OLIVEIRA CARLOTA": "CRS",
  "PAULA INGREDY BORGES MILHOMEM": "CRS",
  "REGIONAL CRS": "CRS",

  // FSA
  "AILTON DE BRITO MARTINS": "FSA",
  "CAIO DE SOUSA LIMA": "FSA",
  "DIEGO DIAS DE SOUSA": "FSA",
  "EDINARDO AMORIM": "FSA",
  "EVANDRO WILKER BARBOSA REZENDE": "FSA",
  "GUSTAVO VELOSO FELIPE": "FSA",
  "HUDSON DE SOUSA CORRÊA": "FSA",
  "HUDSON DE SOUZA CORRÊA": "FSA",
  "JONATHAS NATAL DE LIMA": "FSA",
  "JOSE OLIVEIRA DOS SANTOS": "FSA",
  "JOSÉ OLIVEIRA DOS SANTOS": "FSA",
  "JOSEMAR DE OLIVEIRA VIANA": "FSA",
  "RAFAEL ALEXANDRE DO CARMO DIAS": "FSA",
  "REGIONAL FSA": "FSA",
  "TAYNA ROSA DOURADO": "FSA",

  // INS (substituindo INSIDE por INS)
  "AILA PEREIRA FEITOSA": "INS",
  "ANNA KAROLINA COUTO REGO": "INS",
  "AURYANE GOBIRA CARDOSO DE MATOS": "INS",
  "CHARLENE MANOELE MOURA SANTOS": "INS",
  "DEBORA RODRIGUES GOMES DOS SANTOS": "INS",
  "ERICK THOMAS": "INS",
  "ERICK THOMAS TEIXEIRA DA SILVA": "INS",
  "EVERTON TALLES MARTINS BARBOSA": "INS",
  "FELIPE CANHEDO SILVA": "INS",
  "GABRIELA BARBOSA DE MOURA": "INS",
  "HAMILTON DE CARVALHO ROCHA": "INS",
  "HILLARY HILANNA MORENO ARAUJO": "INS",
  "HILLARY HIRLANNA MORENO ARUJO": "INS",
  "KELVYN HATHAYAN DIAS GOMES": "INS",
  "MARCOS VINICIUS EMILIANO DUTRA DA SILVA": "INS",
  "MARCOS VINÍCIUS EMILIANO DUTRA DA SILVA": "INS",
  "MARÍLIA GONÇALVES FARIAS": "INS",
  "NANDERSON GOMES DOS SANTOS": "INS",
  "REGIONAL INS": "INS",
  "REGIONAL INSIDE": "INS",
  "RODRIGO NOGUEIRA CARDOSO": "INS",
  "RONEY CARDOSO DE OLIVEIRA LIMA": "INS",
  "RUTE VIANA NUNES BARBOSA": "INS",

  // AGS
  "ARRUDA - PEDRO ALMEIDA A FERREIRA": "AGS",
  "CARLA RAYANNA OLIVEIRA SOUSA": "AGS",
  "CARLA RAYANNA OLIVEIRA DE SOUSA": "AGS",
  "PEDRO ALMEIDA ARRUDA FERREIRA": "AGS",
  "REGIONAL AGS": "AGS",
  "THALLIS DANIEL DE ARAÚJO BRITO": "AGS",
  "THALLIS DANIEL DE ARAUJO BRITO": "AGS",

  // PLT
  "DIOGO BARBOSA RAMOS DE FREITAS": "PLT",
  "FABIO SILVA CANHEDO": "PLT",
  "PAULO EDUARDO NERY AZEVEDO": "PLT",
  "REGIONAL PLT": "PLT",
  "RODRIGO MONTEIRO DE FONSECA": "PLT",
  "RODRIGO MONTEIRO DA FONSECA": "PLT",
  "THIAGO SILVANO DA SILVA": "PLT",
  "WILLIAM PINTO DE ARAUJO": "PLT",
  "WILLIAN PINTO DE ARAÚJO": "PLT",

  // PLT GO
  "KAUAN FRANCISCO SANTOS DE CASTRO": "PLT GO",
  "LEONARDO SOUZA SANTOS BATISTA": "PLT GO",
  "REGIONAL PLT GO": "PLT GO",
  "RUBENS LEANDRO DAS DORES THEODORO": "PLT GO",
  "VITOR GABRIEL FERREIRA DE MOURA": "PLT GO",
  "WAGNER RODRIGUES MACHADO": "PLT GO",

  // SIA
  "CLEITON BARROS NASCIMENTO": "SIA",
  "DANIEL CABRAL LINARES": "SIA",
  "ITALO SATURNINO MARTINS DA SILVA": "SIA",
  "JESSICA CLAUDIA ALVES RODRIGUES": "SIA",
  "LEANDRO DE ARAUJO DOS SANTOS": "SIA",
  "MAURICIO DE SOUZA ROCHA": "SIA",
  "REGIONAL SIA": "SIA",
  "STEPHANE MAYARA FERREIRA DE PÁDUA": "SIA",
  "THIAGO GOMES DOS SANTOS": "SIA",

  // VPZ
  "BIANCA SILVA SANTOS": "VPZ",
  "DOUGLAS DA SILVA ALVES": "VPZ",
  "HAYLLA THAMIRES FERREIRA SILVA": "VPZ",
  "ITALO SOARES DA CRUZ": "VPZ",
  "ÍTALO SOARES DA CRUZ": "VPZ",
  "JACKSON ARAGAO DA SILVA": "VPZ",
  "JOSE DE AZEVEDO SANTOS JUNIOR": "VPZ",
  "JOSE DE AZEVEDO SANTOS JÚNIOR": "VPZ",
  "REGIONAL VPZ": "VPZ",
  "RODRIGO DOS SANTOS DE LIMA": "VPZ",

  // S/ Regional
  "TIAGO DIAS DA SILVA PEREIRA": "S/ Regional",
};

export const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
};

const regionalMap: Record<string, string> = {};
Object.entries(rawRegionalMap).forEach(([key, value]) => {
  regionalMap[key.trim().toUpperCase()] = value;
  regionalMap[normalizeName(key)] = value;
});

export function calculateMetrics(data: CotacaoData[]): DashboardMetrics {
  const totalAnalises = data.length;
  
  const totalMinutos = data.reduce((acc, curr) => acc + (curr.tempo_analise_minutos || 0), 0);
  const tempoMedioMinutos = totalAnalises > 0 ? Math.round(totalMinutos / totalAnalises) : 0;
  
  const dentroDaMeta = data.filter(item => (item.tempo_analise_minutos || 0) <= 30).length;
  const aderenciaMeta = totalAnalises > 0 ? Math.round((dentroDaMeta / totalAnalises) * 100) : 0;

  // Cadastros por analista
  const analistaMap = new Map<string, { quantidade: number; totalMinutos: number }>();
  // Cadastros por Regional
  const regionalCountMap = new Map<string, { quantidade: number; totalMinutos: number; dentroDaMeta: number }>();
  // Vendedores Outros
  const vendedoresOutrosMap = new Map<string, number>();
  // Evolução Diária (baseado no inicio_analise)
  const dateMap = new Map<string, number>();

  data.forEach(item => {
    // Analistas
    if (item.nome_analista) {
      const analista = analistaMap.get(item.nome_analista) || { quantidade: 0, totalMinutos: 0 };
      analista.quantidade += 1;
      analista.totalMinutos += item.tempo_analise_minutos;
      analistaMap.set(item.nome_analista, analista);
    }

    // Regionais baseadas no nome_usuario (vendedor)
    if (item.nome_usuario) {
      const rawUser = item.nome_usuario.trim().toUpperCase();
      const normUser = normalizeName(item.nome_usuario);
      const regional = regionalMap[normUser] || regionalMap[rawUser] || "Outros";
      const regStats = regionalCountMap.get(regional) || { quantidade: 0, totalMinutos: 0, dentroDaMeta: 0 };
      regStats.quantidade += 1;
      regStats.totalMinutos += (item.tempo_analise_minutos || 0);
      if ((item.tempo_analise_minutos || 0) <= 30) {
        regStats.dentroDaMeta += 1;
      }
      regionalCountMap.set(regional, regStats);

      if (regional === "Outros") {
        const outroCount = vendedoresOutrosMap.get(rawUser) || 0;
        vendedoresOutrosMap.set(rawUser, outroCount + 1);
      }
    }

    // Evolução diária
    if (item.inicio_analise) {
      try {
        const parsedDate = parseCustomDate(item.inicio_analise);
        if (parsedDate) {
          const yyyy = parsedDate.getFullYear();
          const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const dd = String(parsedDate.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          const count = dateMap.get(dateStr) || 0;
          dateMap.set(dateStr, count + 1);
        } else {
          // Fallback to simple extraction if parseCustomDate returned null
          const dateStr = item.inicio_analise.split(' ')[0]; 
          if (dateStr && dateStr.length === 10) {
             const count = dateMap.get(dateStr) || 0;
             dateMap.set(dateStr, count + 1);
          }
        }
      } catch (e) {
        // ignore parsing errors for individual dates
      }
    }
  });

  const cadastrosPorAnalista = Array.from(analistaMap.entries()).map(([nome, stats]) => ({
    nome,
    quantidade: stats.quantidade,
    tempoMedio: Math.round(stats.totalMinutos / stats.quantidade)
  })).sort((a, b) => b.quantidade - a.quantidade);

  const cadastrosPorRegional = Array.from(regionalCountMap.entries()).map(([regional, stats]) => ({
    regional,
    quantidade: stats.quantidade,
    tempoMedio: Math.round(stats.totalMinutos / stats.quantidade),
    aderenciaMeta: Math.round((stats.dentroDaMeta / stats.quantidade) * 100)
  })).sort((a, b) => b.quantidade - a.quantidade);

  const regionaisOfensoras = cadastrosPorRegional.filter(r => r.tempoMedio > 30).length;

  const evolucaoDiaria = Array.from(dateMap.entries()).map(([data, quantidade]) => ({
    data,
    quantidade
  })).sort((a, b) => a.data.localeCompare(b.data));

  const vendedoresOutros = Array.from(vendedoresOutrosMap.entries()).map(([nome, quantidade]) => ({
    nome,
    quantidade
  })).sort((a, b) => b.quantidade - a.quantidade);

  return {
    totalAnalises,
    tempoMedioMinutos,
    cadastrosPorAnalista,
    cadastrosPorRegional,
    evolucaoDiaria,
    vendedoresOutros,
    aderenciaMeta,
    regionaisOfensoras
  };
}

export function formatMinutesToHours(minutes: number): string {
  if (!minutes || isNaN(minutes)) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function parseCustomDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // Tenta formato ISO YYYY-MM-DD HH:mm:ss ou YYYY-MM-DD
  const isoParsed = new Date(str.replace(' ', 'T'));
  if (!isNaN(isoParsed.getTime())) return isoParsed;

  // Tenta formato brasileiro DD/MM/YYYY HH:mm:ss ou DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const [_, day, month, year, hours = '00', minutes = '00', seconds = '00'] = brMatch;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10),
      parseInt(seconds, 10)
    );
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Calcula a diferença em minutos considerando apenas horas úteis (Business Hours).
 * Regras:
 * - Segunda a Sexta: 08:00 às 18:00
 * - Sábados: 08:00 às 12:00
 * - Domingos: Sem expediente
 *
 * Qualquer intervalo de tempo fora dessas janelas (ex: noites, madrugadas e domingos inteiros)
 * não será somado no total de minutos do chamado.
 */
export function calculateBusinessMinutes(start: Date, end: Date): number {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  let totalMinutes = 0;
  let current = new Date(start);

  while (current < end) {
    // Se o current e o end caírem no mesmo dia, calculamos a diferença direto e paramos
    if (current.toDateString() === end.toDateString()) {
       totalMinutes += getBusinessMinutesForDay(current, end);
       break;
    } else {
       // Calcula as horas úteis restantes do dia "current" até o final dele
       const endOfDay = new Date(current);
       endOfDay.setHours(23, 59, 59, 999);
       totalMinutes += getBusinessMinutesForDay(current, endOfDay);
       
       // Avança para a meia-noite do próximo dia
       current.setDate(current.getDate() + 1);
       current.setHours(0, 0, 0, 0);
    }
  }

  return totalMinutes;
}

function getBusinessMinutesForDay(start: Date, end: Date): number {
  const dayOfWeek = start.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  
  // Domingo não tem expediente, então retorna 0 minutos.
  if (dayOfWeek === 0) return 0;

  // Horário de expediente inicia às 08:00 em qualquer dia útil
  let startHour = 8;
  // Segunda a Sexta: expediente vai até 18:00. Sábado: expediente vai até 12:00.
  let endHour = dayOfWeek === 6 ? 12 : 18;

  const businessStart = new Date(start);
  businessStart.setHours(startHour, 0, 0, 0);
  
  const businessEnd = new Date(start);
  businessEnd.setHours(endHour, 0, 0, 0);

  // Define os horários reais de início e fim que caem dentro do intervalo de expediente
  // Ex: se começou às 07:00, começamos a contar a partir das 08:00 (businessStart)
  const actualStart = start > businessStart ? start : businessStart;
  // Ex: se terminou às 20:00, paramos de contar às 18:00 (businessEnd)
  const actualEnd = end < businessEnd ? end : businessEnd;

  // Se o actualStart ainda for menor que o actualEnd, significa que houve tempo trabalhado nesse dia
  if (actualStart < actualEnd) {
    return Math.floor((actualEnd.getTime() - actualStart.getTime()) / 60000);
  }

  // Caso o evento tenha ocorrido completamente fora do horário de expediente (ex: 19:00 as 22:00)
  return 0;
}
