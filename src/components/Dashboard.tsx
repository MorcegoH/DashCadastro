import React, { useState, useMemo, useEffect } from 'react';
import { CotacaoData, DashboardMetrics } from '../types';
import { formatMinutesToHours, calculateMetrics, parseCustomDate } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Clock, Users, Activity, FileText, PieChart as PieChartIcon, BarChart2, Thermometer, Calendar, ChevronDown, Check } from 'lucide-react';

const COLORS = ['#005b2e', '#007a3d', '#00994d', '#00b85c', '#00d66c', '#00f57b', '#1fff8e', '#3eff9f'];

interface DashboardProps {
  data: CotacaoData[];
  metrics: DashboardMetrics;
}

export function Dashboard({ data, metrics: initialMetrics }: DashboardProps) {
  // Extrai os meses disponíveis a partir dos dados originais
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach(item => {
      if (item.inicio_analise) {
        const parsedDate = parseCustomDate(item.inicio_analise);
        if (parsedDate) {
          const yyyy = parsedDate.getFullYear();
          const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
          months.add(`${yyyy}-${mm}`);
        } else if (item.inicio_analise.length >= 7) {
          months.add(item.inicio_analise.substring(0, 7));
        }
      }
    });
    return Array.from(months).sort().reverse();
  }, [data]);

  // Estado do mês selecionado - Inicia vazio
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  // Estado do filtro de quinzena para o gráfico de evolução diária
  const [quinzenaFilter, setQuinzenaFilter] = useState<'todas' | 'q1' | 'q2'>('todas');

  // Detecção de tela mobile para otimizar gráficos e legendas
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sempre que houver meses disponíveis, seleciona automaticamente o mês mais recente por padrão
  useEffect(() => {
    if (availableMonths.length > 0) {
      if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
        setSelectedMonth(availableMonths[0]);
      }
    }
  }, [availableMonths]);

  // Filtra os dados brutos com base no mês selecionado
  const filteredData = useMemo(() => {
    if (!selectedMonth) return data;
    return data.filter(item => {
      if (!item.inicio_analise) return false;
      const parsedDate = parseCustomDate(item.inicio_analise);
      if (parsedDate) {
        const yyyy = parsedDate.getFullYear();
        const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}` === selectedMonth;
      }
      return item.inicio_analise.startsWith(selectedMonth);
    });
  }, [data, selectedMonth]);

  // Recalcula TODAS as métricas do dashboard para o mês filtrado
  const activeMetrics = useMemo(() => {
    if (!selectedMonth && initialMetrics) return initialMetrics;
    return calculateMetrics(filteredData);
  }, [filteredData, selectedMonth, initialMetrics]);

  // Filtra os dados de evolução diária do gráfico por quinzena preenchendo toda a largura do gráfico
  const chartEvolucaoDiaria = useMemo(() => {
    if (!activeMetrics.evolucaoDiaria || activeMetrics.evolucaoDiaria.length === 0) return [];

    const mapByData = new Map<string, number>();
    activeMetrics.evolucaoDiaria.forEach(item => {
      mapByData.set(item.data, item.quantidade);
    });

    let datesToRender: string[] = [];
    if (selectedMonth && selectedMonth.length === 7) {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, month, 0).getDate();

      let startDay = 1;
      let endDay = daysInMonth;

      if (quinzenaFilter === 'q1') {
        endDay = Math.min(15, daysInMonth);
      } else if (quinzenaFilter === 'q2') {
        startDay = 16;
      }

      for (let day = startDay; day <= endDay; day++) {
        const dd = String(day).padStart(2, '0');
        datesToRender.push(`${selectedMonth}-${dd}`);
      }
    } else {
      datesToRender = activeMetrics.evolucaoDiaria
        .map(item => item.data)
        .filter(dateStr => {
          const day = parseInt(dateStr.substring(8, 10), 10);
          if (quinzenaFilter === 'q1') return day <= 15;
          if (quinzenaFilter === 'q2') return day >= 16;
          return true;
        });
    }

    return datesToRender.map(dateStr => ({
      data: dateStr,
      quantidade: mapByData.get(dateStr) ?? 0
    }));
  }, [activeMetrics.evolucaoDiaria, selectedMonth, quinzenaFilter]);

  // Totais por quinzena para exibição de resumo
  const totalQ1 = useMemo(() => {
    return activeMetrics.evolucaoDiaria
      .filter(item => parseInt(item.data.substring(8, 10), 10) <= 15)
      .reduce((acc, curr) => acc + curr.quantidade, 0);
  }, [activeMetrics.evolucaoDiaria]);

  const totalQ2 = useMemo(() => {
    return activeMetrics.evolucaoDiaria
      .filter(item => parseInt(item.data.substring(8, 10), 10) >= 16)
      .reduce((acc, curr) => acc + curr.quantidade, 0);
  }, [activeMetrics.evolucaoDiaria]);

  const currentTotalCadastros = useMemo(() => {
    if (quinzenaFilter === 'q1') return totalQ1;
    if (quinzenaFilter === 'q2') return totalQ2;
    return activeMetrics.totalAnalises;
  }, [quinzenaFilter, totalQ1, totalQ2, activeMetrics.totalAnalises]);

  const formatMonth = (yyyyMm: string) => {
    if (!yyyyMm) return 'Todos os Meses';
    const [year, month] = yyyyMm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Cabeçalho do Dashboard com Filtro Global de Mês */}
      <div className="relative z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Visão Geral do Desempenho</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Métricas e indicadores consolidados para o período selecionado
          </p>
        </div>

        {/* Filtro de Mês no Head */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative z-40 w-full sm:w-auto">
            <button
              onClick={() => setIsMonthOpen(!isMonthOpen)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-primary text-xs font-bold text-slate-800 dark:text-slate-100 transition-all shadow-sm active:scale-95"
            >
              <div className="flex items-center gap-2 truncate">
                <Calendar className="w-4 h-4 text-brand-primary shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-semibold hidden xs:inline">Mês:</span>
                <span className="text-brand-primary dark:text-brand-secondary font-black text-xs sm:text-sm truncate">
                  {selectedMonth ? formatMonth(selectedMonth) : 'Todos os Meses'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isMonthOpen ? 'rotate-180 text-brand-primary' : ''}`} />
            </button>

            {isMonthOpen && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setIsMonthOpen(false)} />
                <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-64 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] divide-y divide-slate-100 dark:divide-slate-800 opacity-100 ring-1 ring-slate-900/10 dark:ring-white/10">
                  <div className="px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-t-2xl border-b border-slate-200 dark:border-slate-700">
                    Selecione o Mês
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setSelectedMonth(''); setIsMonthOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between transition-colors ${
                        selectedMonth === ''
                          ? 'bg-brand-primary text-white font-black'
                          : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>Todos os Meses</span>
                      {selectedMonth === '' && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                    {availableMonths.map(month => (
                      <button
                        key={month}
                        onClick={() => { setSelectedMonth(month); setIsMonthOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between transition-colors ${
                          selectedMonth === month
                            ? 'bg-brand-primary text-white font-black'
                            : 'text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{formatMonth(month)}</span>
                        {selectedMonth === month && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
        <MetricCard 
          title="Total de Cadastros" 
          value={activeMetrics.totalAnalises.toString()} 
          icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />} 
        />
        <MetricCard 
          title="Tempo Médio" 
          value={formatMinutesToHours(activeMetrics.tempoMedioMinutos)} 
          icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-brand-secondary" />} 
        />
        <ThermometerCard 
          title="Aderência à Meta" 
          percentage={activeMetrics.aderenciaMeta} 
          icon={<Thermometer className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />} 
        />
        <MetricCard 
          title="Reg. Ofensoras" 
          value={activeMetrics.regionaisOfensoras.toString()} 
          icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6">
        
        {/* Main Chart: Evolução Diária */}
        <div className="glass-panel p-4 sm:p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-primary shrink-0" />
              <h3 className="text-base sm:text-lg font-bold">Evolução Diária de Cadastros</h3>
            </div>

            {/* Slicer de Quinzena */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setQuinzenaFilter('todas')}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap ${
                  quinzenaFilter === 'todas'
                    ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Mês Completo
              </button>
              <button
                onClick={() => setQuinzenaFilter('q1')}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  quinzenaFilter === 'q1'
                    ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>1ª Quinzena</span>
                <span className="text-[9px] sm:text-[10px] opacity-70 font-normal hidden xs:inline">(1-15)</span>
              </button>
              <button
                onClick={() => setQuinzenaFilter('q2')}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                  quinzenaFilter === 'q2'
                    ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>2ª Quinzena</span>
                <span className="text-[9px] sm:text-[10px] opacity-70 font-normal hidden xs:inline">(16-31)</span>
              </button>
            </div>
          </div>

          {/* Resumo visual por quinzena */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0"></span>
              1ª Quinzena (1-15): <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalQ1} cadastros</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              2ª Quinzena (16+): <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalQ2} cadastros</strong>
            </span>
          </div>

          <div className="flex-1 min-h-[250px] sm:min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartEvolucaoDiaria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e854" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00e854" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis 
                  dataKey="data" 
                  stroke="currentColor" 
                  className="text-[10px] sm:text-xs opacity-50" 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={15}
                  tickFormatter={(val) => val ? val.substring(8, 10) : ''} 
                />
                <YAxis stroke="currentColor" className="text-[10px] sm:text-xs opacity-50" tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#00e854' }}
                  formatter={(value: any) => [`${value ?? 0} cadastros`, 'Cadastros']}
                  labelFormatter={(label) => label ? `Dia ${label.substring(8, 10)} (${label.substring(0, 7)})` : ''}
                />
                <Area type="monotone" dataKey="quantidade" name="Cadastros" stroke="#00e854" strokeWidth={3} fillOpacity={1} fill="url(#colorDaily)" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Performance */}
        <div className="glass-panel p-4 sm:p-6 flex flex-col">
          <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-primary shrink-0" />
            Top Analistas
          </h3>
          <div className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-y-auto pr-1 sm:pr-2 max-h-[300px] sm:max-h-[320px]">
            {activeMetrics.cadastrosPorAnalista.slice(0, 8).map((user, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 gap-2">
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="font-medium truncate text-xs sm:text-sm" title={user.nome}>{user.nome}</span>
                  <span className="text-[11px] opacity-70">Tempo méd: {formatMinutesToHours(user.tempoMedio)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="block font-bold text-brand-primary dark:text-brand-secondary text-xs sm:text-sm">{user.quantidade}</span>
                  </div>
                </div>
              </div>
            ))}
            {activeMetrics.cadastrosPorAnalista.length === 0 && (
              <div className="text-center opacity-50 py-10 text-xs sm:text-sm">Nenhum dado de analista no período</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-6">
        
        {/* Pie Chart (Distribuição por Regional - Área Máxima Otimizada e Responsiva) */}
        <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-sm backdrop-blur-md flex flex-col h-full min-h-[340px] sm:min-h-[380px] justify-between">
          {/* Cabeçalho Compacto e Integrado */}
          <div className="flex items-center justify-between shrink-0 mb-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary shrink-0" />
              <span>Distribuição por Regional</span>
            </h3>
            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-secondary border border-brand-primary/20">
              Visão por Regional
            </span>
          </div>

          {/* Área do Gráfico */}
          <div className="w-full flex-1 min-h-[260px] sm:min-h-[300px] relative flex items-center justify-center my-auto p-0">
            {/* Badge Central Totalizador */}
            <div className="absolute z-10 flex flex-col items-center justify-center pointer-events-none select-none text-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                {activeMetrics.totalAnalises}
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                TOTAL
              </span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={isMobile ? { top: 10, right: 10, bottom: 10, left: 10 } : { top: 15, right: 35, bottom: 15, left: 35 }}>
                <Pie
                  data={activeMetrics.cadastrosPorRegional}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? "48%" : "42%"}
                  outerRadius={isMobile ? "72%" : "62%"}
                  paddingAngle={3}
                  dataKey="quantidade"
                  nameKey="regional"
                  stroke="transparent"
                  label={isMobile ? false : ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={isMobile ? false : { stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {activeMetrics.cadastrosPorRegional.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      className="transition-all duration-200 hover:opacity-85 cursor-pointer"
                    />
                  ))}
                </Pie>

                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    padding: '8px 12px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#00e854', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value} cadastros`, 'Volume']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda Resumo Exclusiva para Telas Mobile */}
          {isMobile && (
            <div className="mt-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-2 xs:grid-cols-3 gap-1.5">
              {activeMetrics.cadastrosPorRegional.map((item, index) => {
                const pct = activeMetrics.totalAnalises > 0 
                  ? ((item.quantidade / activeMetrics.totalAnalises) * 100).toFixed(0) 
                  : '0';
                return (
                  <div key={item.regional} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px]">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{item.regional}</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 ml-1 text-[10px] shrink-0">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vertical Bar Chart (Volume por Regional - Ranking Ampliado) */}
        <div className="relative overflow-hidden rounded-3xl p-4 sm:p-6 md:p-8 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border-2 border-slate-200/80 dark:border-slate-800 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)] hover:shadow-[0_25px_50px_-12px_rgba(0,147,77,0.25)] transition-all duration-300 transform-gpu hover:-translate-y-1">
          {/* Brilho 3D de Borda Superior */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal-400 via-brand-primary to-emerald-600" />
          
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-2.5">
              <div className="p-1.5 sm:p-2 rounded-xl bg-brand-primary/10 text-brand-primary dark:text-brand-secondary shadow-sm shrink-0">
                <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="truncate">Volume por Regional (Ranking)</span>
            </h3>
          </div>

          <div className="h-[300px] sm:h-[380px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeMetrics.cadastrosPorRegional.slice(0, 10)} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
                <defs>
                  <linearGradient id="bar3dGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e854" />
                    <stop offset="50%" stopColor="#00994d" />
                    <stop offset="100%" stopColor="#004d27" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis 
                  dataKey="regional" 
                  stroke="currentColor" 
                  className="text-[10px] sm:text-[11px] font-bold opacity-80" 
                  tickLine={false} 
                  axisLine={false} 
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={45}
                  minTickGap={5}
                />
                <YAxis stroke="currentColor" className="text-[10px] sm:text-xs font-bold opacity-70" tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(0, 232, 84, 0.08)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#00e854', fontWeight: 'bold' }}
                />
                <Bar dataKey="quantidade" name="Cadastros" fill="url(#bar3dGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Unmapped Users (Outros) Table */}
      {activeMetrics.vendedoresOutros && activeMetrics.vendedoresOutros.length > 0 && (
        <div className="glass-panel p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500 shrink-0" />
            Cadastros sem Regional Mapeada (Outros)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
            Os seguintes usuários realizaram cadastros, mas não estão associados a nenhuma regional no sistema. 
            Eles estão agrupados como "Outros" nos gráficos acima.
          </p>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg font-medium">Nome do Usuário</th>
                  <th className="px-4 py-3 rounded-tr-lg rounded-br-lg font-medium w-32 text-right">Cadastros</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {activeMetrics.vendedoresOutros.map((vendedor, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {vendedor.nome}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-primary dark:text-brand-secondary">
                      {vendedor.quantidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="glass-panel p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 scale-[2]">
        {icon}
      </div>
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <div className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
          {icon}
        </div>
        <h4 className="font-semibold text-slate-500 dark:text-slate-400 text-xs sm:text-sm tracking-wide uppercase truncate">{title}</h4>
      </div>
      <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

function ThermometerCard({ title, percentage, icon }: { title: string, percentage: number, icon: React.ReactNode }) {
  const getThermometerColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  const getTextColor = (pct: number) => {
    if (pct >= 80) return "text-green-500";
    if (pct >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="glass-panel p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 scale-[2]">
        {icon}
      </div>
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        <div className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
          {icon}
        </div>
        <h4 className="font-semibold text-slate-500 dark:text-slate-400 text-xs sm:text-sm tracking-wide uppercase truncate">{title}</h4>
      </div>
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className={`text-2xl sm:text-3xl font-black ${getTextColor(percentage)}`}>{percentage}%</div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getThermometerColor(percentage)} transition-all duration-1000 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Meta: {'<='} 30 min</span>
      </div>
    </div>
  );
}
