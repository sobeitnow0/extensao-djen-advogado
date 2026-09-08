// Utilitarios Puros - DJEN

function debounce(func, wait) {
    let timeout;
    return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

function extrairTarefasTexto(texto, termosRadar = []) {
    if (!texto) return [];
    const txt = texto.toLowerCase();
    let auto = [];
    
    // Regras nativas
    if (txt.match(/audi[eê]ncia/)) auto.push({ feita: false, texto: "Anotar data da audiência e contatar cliente" });
    if (txt.match(/penhora|bloqueio|sisbajud|bacenjud/)) auto.push({ feita: false, texto: "Verificar extensão do bloqueio e prazo para embargos" });
    if (txt.match(/liminar|tutela/)) auto.push({ feita: false, texto: "Analisar deferimento/indeferimento de tutela" });
    if (txt.match(/contrarraz[oõ]es/)) auto.push({ feita: false, texto: "Apresentar contrarrazões ao recurso" });
    if (txt.match(/contesta[cç][aã]o|contestar/)) auto.push({ feita: false, texto: "Elaborar e protocolar contestação" });
    if (txt.match(/alega[cç][oõ]es finais|memoriais/)) auto.push({ feita: false, texto: "Apresentar alegações finais por memoriais" });
    if (txt.match(/per[ií]cia|perito|prontu[aá]rio/)) auto.push({ feita: false, texto: "Formular quesitos, analisar prontuário e indicar assistente técnico" });
    if (txt.match(/\b(inpi|marca|marcas|patente|patentes|autoral)\b/)) auto.push({ feita: false, texto: "Verificar status no INPI / analisar documentação do registro" });
    if (txt.match(/provedor|marco civil|dados cadastrais/)) auto.push({ feita: false, texto: "Notificar provedor de aplicação/conexão" });
    // Leitura Avançada de Prazos Escritos (IA Regex)
    const matchDias = txt.match(/prazo(?:\s+legal)?\s+de\s+(\d{1,3})\s*(?:\([^)]+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i) || 
                      txt.match(/(\d{1,3})\s*(?:\([^)]+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias\s+(?:para|sob|improrrogáveis)/i);
    if (matchDias && matchDias[1]) {
        auto.push({ feita: false, texto: `Cumprir prazo expresso de ${matchDias[1]} dias indicado na publicação` });
    } else {
        const extensoDias = txt.match(/prazo(?:\s+legal)?\s+de\s+(um|dois|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezassete|dezoito|dezanove|vinte|trinta|quarenta|cinquenta|sessenta)\b/i) || 
                            txt.match(/\b(um|dois|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezassete|dezoito|dezanove|vinte|trinta|quarenta|cinquenta|sessenta)\b\s*(?:\(\d+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias\s+(?:para|sob|improrrogáveis)/i);
        if (extensoDias && extensoDias[1]) {
            auto.push({ feita: false, texto: `Cumprir prazo expresso de ${extensoDias[1]} dias indicado na publicação` });
        }
    }

    // Regras dinâmicas baseadas no Radar configurado
    if (termosRadar && termosRadar.length > 0) {
        termosRadar.forEach(termo => {
            const termoLimpo = termo.trim().toLowerCase();
            if (termoLimpo && txt.includes(termoLimpo)) {
                // Evita duplicar se já foi adicionado por uma regra nativa similar
                const existe = auto.find(t => t.texto.toLowerCase().includes(termoLimpo));
                if (!existe) {
                    auto.push({ feita: false, texto: `Verificar urgência referente a: ${termo}` });
                }
            }
        });
    }

    return auto;
}
