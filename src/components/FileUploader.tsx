import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '../utils';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onError: (msg: string) => void;
  isLoading: boolean;
}

export function FileUploader({ onFileSelect, onError, isLoading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcessFile(file);
    }
  };

  const validateAndProcessFile = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    // Some systems don't have accurate MIME types for excel files, so we also check extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['xlsx', 'xls', 'csv'];

    if (validTypes.includes(file.type) || (extension && validExtensions.includes(extension))) {
      onFileSelect(file);
    } else {
      onError('O formato do arquivo não atende aos critérios. É necessário subir o arquivo na estrutura correta (.xlsx, .xls ou .csv).');
    }
  };

  return (
    <div 
      className={cn(
        "glass-panel p-5 sm:p-8 w-full max-w-2xl mx-auto flex flex-col items-center justify-center transition-all duration-300 border-dashed border-2 cursor-pointer",
        isDragging ? "border-brand-secondary bg-brand-secondary/10 scale-[1.02]" : "border-brand-primary/30 hover:border-brand-primary/60",
        isLoading ? "opacity-70 pointer-events-none" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx, .xls, .csv"
      />
      
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand-primary/10 flex items-center justify-center mb-4 sm:mb-6 shadow-inner shrink-0">
        {isLoading ? (
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-brand-primary/30 border-t-brand-secondary rounded-full animate-spin"></div>
        ) : (
          <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-brand-primary" />
        )}
      </div>
      
      <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center">
        {isLoading ? "Processando arquivo..." : "Importar Base de Dados"}
      </h3>
      
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mb-5 sm:mb-6 max-w-md">
        {isLoading 
          ? "Por favor, aguarde enquanto extraímos as informações para o dashboard." 
          : "Arraste e solte sua planilha do Excel aqui, ou clique para procurar no seu computador."}
      </p>
      
      {!isLoading && (
        <button className="px-5 sm:px-6 py-2.5 sm:py-3 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs sm:text-sm rounded-xl font-semibold transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
          Selecionar Arquivo
        </button>
      )}
    </div>
  );
}
