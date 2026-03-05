# ⚖️ Buscador DJEN - Extensão de Navegador

Uma ferramenta de produtividade jurídica de código aberto, desenvolvida para simplificar a rotina de controle de prazos. Esta extensão permite consultar o **Diário de Justiça Eletrônico Nacional (DJEN)** diretamente pela API oficial do CNJ, consolidando intimações de diversos tribunais (como TJSP e TRF3) em uma única interface minimalista.

## ✨ Funcionalidades

- **Consulta via API:** Acesso direto ao endpoint do CNJ, garantindo velocidade e ignorando instabilidades de interfaces web.
- **Filtro por Período:** Seleção nativa de data inicial e final via calendário.
- **OAB Editável com Persistência:** Permite pesquisar qualquer OAB/UF e memoriza o último número utilizado para agilizar consultas futuras.
- **Otimizado para Logseq/PKM:** Botão dedicado para copiar todos os resultados formatados, facilitando a colagem em ferramentas de gestão de conhecimento (Personal Knowledge Management).
- **Foco em Privacidade:** A extensão não possui servidores intermediários; a comunicação ocorre exclusivamente entre o seu navegador e o servidor público do CNJ.

## 🚀 Como Instalar (Modo Desenvolvedor)

1. Faça o **Download** ou clone este repositório `sobeitnow0/extensao-djen-advogado`.
2. No seu navegador (Chrome, Brave, Edge ou Opera), acesse a página de extensões: `chrome://extensions/`.
3. Ative o **Modo do Desenvolvedor** (Developer mode) no canto superior direito.
4. Clique no botão **Carregar sem compactação** (Load unpacked).
5. Selecione a pasta onde você salvou os arquivos deste projeto.
6. Fixe a extensão na sua barra de ferramentas para acesso rápido.

## 🛠️ Tecnologias

- **JavaScript (ES6+):** Consumo de API assíncrona.
- **HTML5 / CSS3:** Interface responsiva e limpa.
- **Manifest v3:** Seguindo os padrões mais recentes de segurança e desempenho para extensões.

## ⚖️ Abrangência e Funcionamento

Esta extensão consome os dados do **Barramento de Serviços do Poder Judiciário (CNJ)**. Diferente de buscadores que realizam *web scraping* em diários locais, este projeto acessa a fonte primária unificada.

- **Tribunais Estaduais (TJs):** Inclui o **TJSP** (tanto sistemas e-SAJ quanto Eproc) e demais tribunais estaduais integrados ao portal de comunicações processuais.
- **Tribunais Federais (TRFs):** Cobertura completa do **TRF3** e outros tribunais federais que utilizam o sistema de transmissão de dados ao DJEN.
- **Justiça do Trabalho (TRTs):** Captura publicações de tribunais trabalhistas que já migraram suas intimações para a base nacional.
- **Unificação Nacional:** O objetivo é a cobertura de 100% dos juízos do Brasil, conforme as resoluções de modernização do CNJ para o Diário de Justiça Eletrônico Nacional.

## 📝 Licença

Este projeto está sob a licença MIT. Sinta-se à vontade para utilizar, modificar e contribuir.

---
**Autor:** Amilcar Moreira ([@sobeitnow0](https://github.com/sobeitnow0))
*Advogado (OAB/SP 349.457)*
