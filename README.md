# ⚖️ Buscador DJEN - Extensão para Navegador

Uma ferramenta de jurimetria e acompanhamento processual focada em agilidade, segurança e design utilitário. Desenvolvida para consultar o Diário de Justiça Eletrônico Nacional (DJEN) diretamente do navegador, sem intermediários.

## 🚀 Novidades da Versão 1.3.0

A extensão foi completamente redesenhada para oferecer a experiência de um software jurídico de alto padrão, focando em velocidade de leitura e triagem visual:

* **Design System Renovado:** Interface em formato de cards flutuantes, separação visual clara e tipografia otimizada para leituras longas.
* **Badges Visuais e Contador de Prazos:** A ferramenta agora faz uma varredura inteligente nos resultados. Identifica intimações que contêm a palavra "prazo", emite um alerta global (⚠️) e destaca o card do processo para atenção imediata.
* **Filtros Dinâmicos:** Novo menu suspenso (dropdown) gerado em tempo real que permite isolar e ler intimações de apenas um Tribunal específico (ex: apenas STJ ou TJSP).
* **Exportação Otimizada (.txt):** Além da cópia rápida para a área de transferência, um novo botão gera um arquivo de texto local estruturado e limpo, pronto para ser importado em sistemas de *outlining* ou gestão de casos, contendo a data oficial de disponibilização em destaque.

## 🛠️ Principais Funcionalidades

* **Consulta em 1 Clique:** Atalhos dinâmicos (Hoje, 5 dias, 15 dias e 1 Mês) que preenchem as datas e executam a busca instantaneamente.
* **Dark Mode Nativo:** Interface que se adapta automaticamente ao tema do sistema operacional do usuário.
* **Privacidade e Segurança:** Funciona localmente. Não coleta telemetria, não exige cadastro e utiliza sanitização rigorosa de dados (DOMParser) para evitar injeções de código. Comunicação feita exclusivamente com a API oficial do CNJ.
* **Suporte Universal:** Código compatível e aprovado para rodar nativamente tanto em motores Chromium (Google Chrome, Edge, Brave) quanto na engine Gecko (Mozilla Firefox).

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
