# 📄 Documentação Completa do Projeto: Dashboard de Cotações & Análise SLA

Este documento contém a especificação técnica detalhada, arquitetura, manual de execução local ("rodar por fora") e a explicação detalhada de todas as fórmulas e regras de negócio aplicadas no sistema.

---

## 🚀 1. Como Rodar Este Projeto "Por Fora" (Localmente / Servidor Próprio)

Este projeto foi construído utilizando **React (v18)** com **TypeScript** e empacotado através do **Vite**. Ele pode ser executado em qualquer ambiente local ou servidor web padrão (Node.js).

### 📋 Pré-requisitos
- **Node.js**: Versão `18.0.0` ou superior (Recomendado Node 20 LTS).
- **Gerenciador de Pacotes**: `npm` (já vem com o Node) ou `yarn` / `pnpm`.
- **Git**: Para clonar o repositório.

### 🛠️ Passo a Passo para Execução Local

#### Passo 1: Obter os Arquivos do Projeto
Se você baixou o projeto via arquivo `.zip` (exportação do AI Studio) ou clonou um repositório Git:
```bash
# Se clonado via Git:
git clone <URL_DO_SEU_REPOSITORIO>
cd <NOME_DA_PASTA>

# Se você baixou o ZIP, basta extrair e abrir o terminal dentro da pasta raiz.
```

#### Passo 2: Instalar as Dependências
No terminal, na pasta raiz do projeto, execute:
```bash
npm install
```
*Isso irá baixar e instalar todas as bibliotecas do projeto (React, Vite, Recharts, Lucide Icons, XLSX, Date-Fns, Tailwind, etc.).*

#### Passo 3: Executar em Modo de Desenvolvimento (Dev)
Para rodar a aplicação localmente no seu navegador:
```bash
npm run dev
```
O Vite iniciará um servidor local e exibirá um endereço no terminal (ex: `http://localhost:3000` ou `http://localhost:5173`). Abra este link no seu navegador.

#### Passo 4: Gerar o Build de Produção (Opcional)
Se desejar publicar o site em um servidor de hospedagem (como Vercel, Netlify, AWS S3, Nginx, IIS, Firebase Hosting):
```bash
npm run build
```
Isso criará uma pasta chamada `dist/` com todos os arquivos estáticos (HTML, JS, CSS) otimizados e minificados, prontos para serem servidos por qualquer servidor web.

---

## 📁 2. Estrutura de Arquivos e Arquitetura

```
├── DOCUMENTACAO.md           # Este documento de especificações
├── index.html                # Ponto de entrada HTML da aplicação
├── package.json              # Dependências e scripts do projeto
├── vite.config.ts            # Configurações do Vite (Build & Dev Server)
├── src/
│   ├── main.tsx              # Inicialização do React no DOM
│   ├── App.tsx               # Componente Raiz da Aplicação
│   ├── index.css             # Estilos Globais e utilitários Tailwind CSS
│   ├── types.ts              # Definições de Tipos e Interfaces TypeScript
│   ├── utils.ts              # Regras de Negócio, Fórmulas e Mapeamentos
│   └── components/
│       └── Dashboard.tsx     # Painel principal de indicadores e gráficos
```

---

## 📐 3. Regras de Negócio, Fórmulas e Intentos

Abaixo está o detalhamento de todos os cálculos operacionais implementados no arquivo `src/utils.ts`.

---

### 🕒 3.1. Cálculo de Minutos Úteis (Business Minutes)
* **Função**: `calculateBusinessMinutes(start: Date, end: Date)` e `getBusinessMinutesForDay()`

#### 📌 Fórmula / Regra Aplicada:
Calcula o tempo real decorrido entre o início (`inicio_analise`) e o término (`fim_analise`) do processo de análise, **considerando exclusivamente os horários de expediente de trabalho**:

| Dia da Semana | Horário de Expediente Válido | Horas Diárias |
| :--- | :--- | :--- |
| **Segunda a Sexta-feira** | 08:00 às 18:00 | 10 horas / dia (600 min) |
| **Sábado** | 08:00 às 12:00 | 4 horas / dia (240 min) |
| **Domingo** | *Sem expediente* | 0 minutos |

*Qualquer período fora dessas janelas (noites após 18h/12h, madrugadas e domingos) é **descartado** do cálculo.*

#### 🎯 Intento da Aplicação:
Garantir **justiça e precisão na avaliação do SLA da equipe**. Se uma cotação for aberta na sexta-feira às 17h30 e concluída na segunda-feira às 08h30:
* **Sem horas úteis (tempo corrido)**: Contaria ~63 horas (3.780 minutos), estourando severamente a meta.
* **Com horas úteis (algoritmo aplicado)**: São contabilizados apenas 30 minutos na sexta (17h30 às 18h) + 30 minutos na segunda (08h00 às 08h30) = **60 minutos úteis**.

---

### ⏱️ 3.2. Aderência à Meta de SLA (SLA Target Compliance)
* **Métrica**: `% Aderência` (Meta = **30 Minutos**)

#### 📌 Fórmula:
$$\text{Aderência à Meta (\%)} = \left( \frac{\text{Quantidade de Análises com Tempo Útil} \le 30 \text{ min}}{\text{Total de Análises Realizadas}} \right) \times 100$$

#### 🎯 Intento da Aplicação:
Mapear o nível de conformidade do atendimento das solicitações em relação ao SLA estipulado de 30 minutos por cotação. Permite visualizar em tempo real se a equipe está cumprindo os acordos operacionais e identificar regionais ofensoras (com tempo médio $> 30$ min).

---

### 📊 3.3. Tempo Médio de Análise (TMA)
* **Métrica**: `Tempo Médio (min)` e Formatação `formatMinutesToHours(minutos)`

#### 📌 Fórmula:
$$\text{Tempo Médio (min)} = \text{Arredondamento}\left( \frac{\sum \text{tempo\_analise\_minutos}}{\text{Total de Cotações}} \right)$$

Para apresentação visual:
$$\text{Horas/Minutos} = \lfloor \text{minutos} / 60 \rfloor \text{h } + (\text{minutos} \bmod 60)\text{m}$$

#### 🎯 Intento da Aplicação:
Identificar gargalos operacionais e comparar a eficiência individual entre analistas e a eficiência coletiva entre regionais.

---

### 🔠 3.4. Normalização de Nomes e Mapeamento Inteligente de Regionais
* **Funções**: `normalizeName(name: string)` e `regionalMap`

#### 📌 Regra Aplicada:
Para evitar falhas decorrentes de digitação manual de nomes de usuários/vendedores na planilha, a função realiza a higienização do texto:
1. Decomposição Unicode NFD (`.normalize("NFD")`) para remoção de acentos e diacríticos (ex: `Ítalo` ➔ `Italo`, `Gonçalves` ➔ `Goncalves`).
2. Remoção de espaços duplicados ou extremidades (`.trim().replace(/\s+/g, ' ')`).
3. Conversão total para letras maiúsculas (`.toUpperCase()`).

O nome sanitizado é comparado com a tabela de depara de vendedores para vincular a regional correta:
* **INS** (substituindo o antigo nome "INSIDE"): Vendedores associados a vendas internas/Inside Sales (ex: *Erick Thomas*, *Hillary Hilanna*, *Marcos Vinícius Dutra*, etc.).
* **FSA**: Feira de Santana (ex: *Hudson de Sousa*, *José Oliveira*, *Edinardo Amorim*, etc.).
* **AGS**: Agrestina/Araguarina (ex: *Carla Rayanna*, *Pedro Almeida Arruda*, *Thallis Daniel*, etc.).
* **PLT / PLT GO**: Planaltina / Planaltina Goiás (ex: *Rodrigo Monteiro*, *Willian Pinto*, *Wagner Rodrigues*, etc.).
* **SIA / VPZ / CEI / CRS**: Demais regionais mapeadas.
* **Outros**: Caso o vendedor não esteja pré-cadastrado no mapa, ele é contabilizado em "Outros" e listado em uma tabela dedicada de auditoria no dashboard.

#### 🎯 Intento da Aplicação:
Evitar perda de dados e classificação incorreta devido a variações de grafia nas planilhas de entrada (ex: com ou sem acento, abreviações).

---

### 🔄 3.5. Chave de Deduplicação e Leitura Multi-Aba
* **Função**: `parseExcelFile(file: File)`

#### 📌 Regra Aplicada:
1. **Multi-Aba**: Percorre todas as abas da planilha Excel (`workbook.SheetNames`), permitindo a importação de relatórios consolidados em múltiplos guias.
2. **Dedup Key**: Cria uma chave única composta por `${codigo_cotacao}_${inicio_analise}`. Se uma mesma cotação com a mesma data/hora de início aparecer mais de uma vez na planilha, os registros duplicados são automaticamente descartados.

#### 🎯 Intento da Aplicação:
Prevenir a contagem dupla de cotações em relatórios extraídos de sistemas que geram registros repetidos ou na importação acidental de planilhas sobrepostas.

---

## 🎨 4. Design & Layout do Dashboard

* **Otimização Visual do Gráfico de Rosca**:
  - Layout limpo, centralizado e sem elementos decorativos poluídos.
  - Utilização de `ResponsiveContainer` e raio do donut dimensionado com unidades relativas (`innerRadius="50%"`, `outerRadius="75%"`) garantindo máxima legibilidade.
  - Badge central com contagem totalizadora destacada.
  - Tooltips customizados com sombras suaves e alto contraste (WCAG AA).

---

## 📦 5. Dependências Utilizadas

- `react`: Biblioteca UI principal.
- `lucide-react`: Ícones vetoriais modernos e consistentes.
- `recharts`: Renderização flexível de gráficos estatísticos em SVG.
- `xlsx`: Leitura e parse de arquivos do Excel no cliente sem necessidade de backend.
- `date-fns`: Manipulação e parsing resiliente de datas no padrão brasileiro.
- `tailwind-merge` & `clsx`: Utilitários para estilização dinâmica com Tailwind CSS.
