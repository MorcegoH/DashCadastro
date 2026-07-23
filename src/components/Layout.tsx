import React from 'react';
import { FileUp, PieChart, Moon, Sun } from 'lucide-react';
import { cn } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'upload' | 'dashboard';
  setActiveTab: (tab: 'upload' | 'dashboard') => void;
  hasData: boolean;
  lastImportDate?: Date | null;
}

export function Layout({ children, activeTab, setActiveTab, hasData, lastImportDate }: LayoutProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
  };

  const formattedDate = lastImportDate 
    ? lastImportDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-screen flex flex-col w-full relative">
      {/* Top Header */}
      <header className="min-h-[4.5rem] py-3 sm:py-4 px-4 sm:px-6 lg:px-12 flex items-center justify-between z-20 relative border-b border-white/40 dark:border-white/10 glass-panel !rounded-none !border-x-0 !border-t-0 bg-white/40 dark:bg-slate-900/40 gap-2">
        
        {/* Left Side: Logo & Last Import Date */}
        <div className="flex flex-col min-w-0">
          <a 
            href="/"
            className="flex items-center gap-2.5 text-brand-primary dark:text-brand-secondary font-black text-lg sm:text-2xl tracking-tight hover:opacity-80 transition-opacity truncate"
            title="Atualizar página inicial"
          >
            <div className="p-1.5 sm:p-2 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/30 shrink-0">
              <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="truncate">Adarco Cadastro</span>
          </a>
          
          {activeTab === 'dashboard' && lastImportDate && (
            <div className="mt-1 text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 pl-8 sm:pl-[3.25rem] truncate">
              Última importação: {formattedDate}
            </div>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          
          {/* Import Button */}
          {activeTab === 'dashboard' && (
            <button
              onClick={() => setActiveTab('upload')}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5"
            >
              <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Importar arquivo</span>
              <span className="sm:hidden">Importar</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 sm:p-3 rounded-xl glass-panel hover:bg-white/60 dark:hover:bg-slate-800/80 transition-all flex items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm"
            title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-brand-secondary" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full overflow-y-auto z-10 relative p-4 lg:p-8">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

    </div>
  );
}
