import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { FileUploader } from './components/FileUploader';
import { Dashboard } from './components/Dashboard';
import { ErrorModal } from './components/ErrorModal';
import { CotacaoData, DashboardMetrics } from './types';
import { parseExcelFile, calculateMetrics } from './utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard'>('upload');
  const [data, setData] = useState<CotacaoData[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastImportDate, setLastImportDate] = useState<Date | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  const showError = (message: string) => {
    setErrorModal({ isOpen: true, message });
  };

  const closeError = () => {
    setErrorModal({ isOpen: false, message: '' });
  };

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const parsedData = await parseExcelFile(file);
      if (parsedData.length === 0) {
        showError("O formato do arquivo não atende aos critérios. É necessário subir o arquivo na estrutura correta.\n\nMotivo: O arquivo está vazio ou não contém dados válidos.");
        setIsLoading(false);
        return;
      }
      
      const newMetrics = calculateMetrics(parsedData);
      
      setData(parsedData);
      setMetrics(newMetrics);
      setLastImportDate(new Date());
      setActiveTab('dashboard');
    } catch (error: any) {
      console.error(error);
      showError(error.message || "O formato do arquivo não atende aos critérios. É necessário subir o arquivo na estrutura correta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} hasData={data.length > 0} lastImportDate={lastImportDate}>
        {activeTab === 'upload' ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] py-4 sm:py-8">
            <div className="mb-6 sm:mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-4 text-brand-primary dark:text-brand-secondary">
                Inteligência de Dados
              </h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-lg px-2">
                Importe sua planilha de produtividade para gerar insights visuais instantâneos sobre o desempenho de cadastros.
              </p>
            </div>
            <div className="w-full animate-in fade-in zoom-in-95 duration-700 delay-150">
              <FileUploader onFileSelect={handleFileSelect} onError={showError} isLoading={isLoading} />
            </div>
          </div>
        ) : (
          metrics && <Dashboard data={data} metrics={metrics} />
        )}
      </Layout>
      
      <ErrorModal 
        isOpen={errorModal.isOpen} 
        message={errorModal.message} 
        onClose={closeError} 
      />
    </>
  );
}

