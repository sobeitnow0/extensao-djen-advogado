# ⚖️ Buscador DJEN - Extensão para Advogados

Uma extensão de navegador leve e poderosa (Manifest V3) projetada para otimizar a rotina jurídica. Ela consulta o **Diário de Justiça Eletrônico Nacional (DJEN)** diretamente via API pública do Conselho Nacional de Justiça (CNJ), extraindo, higienizando e formatando as intimações para fácil integração com sistemas de anotações e gestão de conhecimento (PKM).

## ✨ Funcionalidades Principais

- **Consulta Direta via API:** Conexão nativa com a base de dados do CNJ, eliminando a necessidade de *web scraping* lento ou resolução de captchas.
- **Exportação Estruturada (Outlining):** Copia os resultados em formato de listas aninhadas (blocos), ideal para organização no Logseq, Obsidian ou Notion.
- **Higienização e Destaque:** Remove automaticamente tags HTML residuais e destaca em negrito palavras críticas como **Prazo**, **Liminar**, **Tutela**, **Penhora** e **Multa**.
- **Filtro Dinâmico Inteligente:** Filtre as intimações na própria interface. O ícone da extensão (badge) atualiza em tempo real mostrando a quantidade de resultados visíveis.
- **Atalhos de Período e Prevenção de Spam:** Botões rápidos para consultar `[Hoje]`, `[Últimos 3 dias]` e `[Última semana]`, além de trava anti-duplo clique durante as requisições.
- **Dark Mode Nativo:** A interface se adapta automaticamente ao tema escuro ou claro do seu sistema operacional.

## 🏛️ Abrangência e Funcionamento

Esta extensão consome os dados do **Barramento de Serviços do Poder Judiciário (CNJ)**. O sistema captura qualquer publicação centralizada pelo CNJ, abrangendo:

- **Tribunais Estaduais (TJs):** Inclui o **TJSP** (sistemas e-SAJ e Eproc) e demais tribunais estaduais integrados.
- **Tribunais Federais (TRFs):** Cobertura do **TRF3** e outros tribunais federais.
- **Justiça do Trabalho (TRTs):** Captura de publicações trabalhistas migradas para a base nacional.

## 🚀 Como Instalar (Modo Desenvolvedor)

### Para Google Chrome, Brave e Edge
1. Faça o clone deste repositório ou baixe o arquivo ZIP:
   `git clone https://github.com/sobeitnow0/extensao-djen-advogado.git`
2. No seu navegador, acesse a página de extensões (ex: `chrome://extensions/`).
3. Ative o **"Modo do desenvolvedor"** (canto superior direito).
4. Clique em **"Carregar sem compactação"** e selecione a pasta do projeto.

### Para Mozilla Firefox
1. Faça o clone deste repositório ou baixe o arquivo ZIP.
2. Dentro da pasta do projeto, apague o arquivo `manifest.json` (que é o padrão do Chrome).
3. Renomeie o arquivo `manifest-firefox.json` para `manifest.json`.
4. Abra o Firefox e acesse a página de depuração: `about:debugging`
5. No menu lateral, clique em **"Este Firefox"**.
6. Clique em **"Carregar um complemento temporário..."** e selecione o novo arquivo `manifest.json`.

## 📋 Formato de Exportação (Outlining)

Ao clicar no botão "Copiar Resultados para Outlining", as intimações filtradas são enviadas para a sua área de transferência formatadas em blocos aninhados (bullet points) prontos para colar. A estrutura obedece a seguinte hierarquia:

* **Bloco Principal (Pai):** Contém os metadados essenciais na mesma linha (Número do Processo formatado, Sigla do Tribunal, Data da pesquisa e o cabeçalho/identificação da publicação).
  * **Bloco Recuado (Filho):** Contém o teor completo da intimação higienizado, com o espaçamento corrigido e os termos processuais críticos (como prazos) automaticamente destacados em negrito.

---
**Autor:** Amilcar Moreira ([@sobeitnow0](https://github.com/sobeitnow0))
