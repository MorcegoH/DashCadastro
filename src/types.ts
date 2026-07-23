export interface CotacaoData {
  codigo_cotacao: string;
  placa_ou_chassi: string;
  nome_associado: string;
  nome_grupo: string;
  nome_usuario: string;
  nome_analista: string;
  inicio_analise: string; // ISO date string or formatted date
  fim_analise: string; // ISO date string or formatted date
  tempo_analise_minutos: number;
  tempo_analise: string;
}

export interface DashboardMetrics {
  totalAnalises: number;
  tempoMedioMinutos: number;
  cadastrosPorAnalista: { nome: string; quantidade: number; tempoMedio: number }[];
  cadastrosPorRegional: { regional: string; quantidade: number; tempoMedio: number; aderenciaMeta: number }[];
  evolucaoDiaria: { data: string; quantidade: number }[];
  vendedoresOutros: { nome: string; quantidade: number }[];
  aderenciaMeta: number; // Percentage of analyses completed in <= 30 minutes
  regionaisOfensoras: number;
}
