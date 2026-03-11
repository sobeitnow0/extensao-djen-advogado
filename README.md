⚖️ Buscador DJEN (v3.3.0)
Uma extensão de navegador minimalista, segura e independente para consulta rápida de intimações no Diário da Justiça Eletrônico Nacional (DJEN) via API pública do CNJ. Projetada com a estética Adwaita (GNOME Style) para garantir uma leitura limpa, livre de distrações e altamente focada na produtividade jurídica.

🚀 O que há de novo na Versão 3.3.0?
A extensão passou por uma grande reestruturação para incluir uma ferramenta indispensável para a advocacia: Cálculo de Prazos Processuais automatizado e 100% Offline.

🧠 Motor Forense Offline: Abandonamos a dependência de APIs de terceiros para buscar feriados. A extensão agora possui um motor astronômico embutido que calcula automaticamente a Páscoa e todos os feriados móveis (Carnaval, Quarta de Cinzas, Quinta de Endoenças, Sexta-Feira Santa e Corpus Christi), além dos feriados fixos da Lei 5.010/66.

📅 Regras Estritas do CPC e CPP:

CPC (Dias Úteis): Pula finais de semana, feriados nacionais/forenses e aplica automaticamente a suspensão de prazos do Recesso Forense (20/12 a 20/01).

CPP (Dias Corridos): Contagem ininterrupta, mas ajusta automaticamente o início e o vencimento caso caiam em dias não úteis.

🛡️ Alerta de Confirmação: Ao calcular um prazo, um resumo das datas (Publicação, Início e Vencimento) é exibido para sua conferência. Você pode inserir suspensões locais (ex: feriados municipais ou instabilidade no PJe) manualmente.

📋 Exportação Inteligente: Os prazos confirmados são atrelados à respectiva intimação. Ao exportar em .txt ou clicar no novo botão "Copiar" (Individual ou Global), o resumo do cálculo é anexado perfeitamente formatado ao final do texto da publicação.


✨ Funcionalidades Principais
Busca Direta: Consulta via OAB e UF diretamente na API do PJe/CNJ.

Leitura Limpa (Limpeza Editorial): Remove marcações HTML desnecessárias, corrige espaçamentos excessivos, padroniza termos (ex: "artigo" para "art.", "parágrafo" para "§") e aplica formatação natural (Capitalized words).

Filtros Dinâmicos: Filtre rapidamente os resultados recebidos por texto, número do processo ou Tribunal.

Design Adwaita: Interface moderna, suporte automático a Tema Claro/Escuro (Dark Mode) do sistema operativo e foco na legibilidade (Zero innerHTML inseguro na renderização de resultados).

Ações em Massa: Expanda ou recolha todas as intimações, exporte a lista completa para um arquivo .txt ou copie tudo para a área de transferência com um clique.


## 📦 Como Instalar (Versões de Desenvolvimento)

Para utilizar a versão mais recente direto do código-fonte:

**No Chrome / Edge / Brave:**
1. Baixe os arquivos do repositório.
2. Acesse `chrome://extensions/` no seu navegador.
3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **"Carregar sem compactação"** e selecione a pasta com os arquivos (`manifest.json` e cia).

**No Firefox:**
1. https://addons.mozilla.org/pt-BR/firefox/addon/buscador-djen-advogado/

---
*Ferramenta Open-Source desenvolvida para otimizar a rotina de triagem na advocacia.*
