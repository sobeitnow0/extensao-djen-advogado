// Motor de Prazos DJEN
// Realiza o cálculo matemático de datas com base em dias úteis/corridos e regras de feriados (CPC e CPP)

const MotorDePrazos = {
    calcular: function (params) {
        // Fallback functions in case they are not yet decoupled from global scope
        const f = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const formatISO = (dObj) => dObj.toISOString().split('T')[0];
        
        // This relies on checarMotivoFeriado which is still global in sidebar.js 
        // until we extract the Holiday service, so we use globalThis for now.
        const _checarMotivoFeriado = typeof checarMotivoFeriado === 'function' ? checarMotivoFeriado : globalThis.checarMotivoFeriado;

        const { pubEscolhida, dias, tipo, direcao, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos, tipoData = 'dje' } = params;

        let dataAtual = new Date(pubEscolhida + 'T15:00:00');
        let timeline = [];
        let totalFeriados = 0;
        let temFeriadoMun = false;
        let prorrogado = false;

        if (tipoData === 'dje') {
            timeline.push({ data: dataAtual.toISOString(), desc: "Disponibilizado", tipo: "info", numero: "Disp." });

            // 1. ACHAR A DATA DE PUBLICAÇÃO
            dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
            while (true) {
                let dStr = formatISO(dataAtual);
                let motivo = _checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                if (motivo === "Dia Útil") break;
                if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true;
                timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
            }
        }

        const dtPub = new Date(dataAtual);
        timeline.push({ data: dtPub.toISOString(), desc: tipoData === 'painel' ? "Leitura / Intimação" : "Publicação", tipo: "info", numero: tipoData === 'painel' ? "Int." : "Pub." });

        // 2. ACHAR O INÍCIO DO PRAZO
        dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
        while (true) {
            let dStr = formatISO(dataAtual);
            let motivo = _checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
            if (motivo === "Dia Útil") break;
            if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true;
            timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
            dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
        }
        const dtInicio = new Date(dataAtual);

        // 3. LAÇO DE CONTAGEM (CPC ou CPP)
        if (tipo === 'cpc') {
            let diasContados = 1;
            timeline.push({ data: dataAtual.toISOString(), desc: "Dia Útil", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia 1" });
            while (diasContados < dias) {
                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                let dStr = formatISO(dataAtual);
                let motivo = _checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                if (motivo === "Dia Útil") {
                    diasContados++;
                    timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: diasContados === dias ? "fatal" : "util", numero: "Dia " + diasContados });
                } else {
                    totalFeriados++;
                    if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true;
                    timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                }
            }
        } else { // Regra CPP
            let diasContados = 1;
            timeline.push({ data: dataAtual.toISOString(), desc: "Dia Corrido", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia 1" });
            while (diasContados < dias) {
                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                let dStr = formatISO(dataAtual);
                let motivo = _checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                if (motivo !== "Dia Útil") { totalFeriados++; if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true; }
                diasContados++;
                timeline.push({ data: dataAtual.toISOString(), desc: motivo !== "Dia Útil" ? motivo : "Dia Corrido", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia " + diasContados });
            }

            // Prorrogação final se cair em dia não-útil
            let dStrFatal = formatISO(dataAtual);
            let motivoFatal = _checarMotivoFeriado(dStrFatal, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
            while (motivoFatal !== "Dia Útil") {
                prorrogado = true;
                timeline[timeline.length - 1].tipo = "pulo";
                timeline[timeline.length - 1].numero = "Prorrogado";
                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                dStrFatal = formatISO(dataAtual);
                motivoFatal = _checarMotivoFeriado(dStrFatal, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                timeline.push({ data: dataAtual.toISOString(), desc: motivoFatal === "Dia Útil" ? "Prorrogação" : motivoFatal, tipo: motivoFatal === "Dia Útil" ? "fatal" : "pulo", numero: motivoFatal === "Dia Útil" ? "Dia " + dias : "-" });
            }
        }

        const dtFatal = new Date(dataAtual);

        let diasRecuo = parseInt(window.diasControleInterno || globalThis.diasControleInterno);
        if (isNaN(diasRecuo)) diasRecuo = 3;

        let dtControle = new Date(dtFatal);
        dtControle.setDate(dtControle.getDate() - diasRecuo);

        if (dtControle.getDay() === 6) dtControle.setDate(dtControle.getDate() - 1);
        if (dtControle.getDay() === 0) dtControle.setDate(dtControle.getDate() - 2);

        return {
            disp: f(new Date(pubEscolhida + 'T15:00:00')),
            pub: f(dtPub),
            inicio: f(dtInicio),
            fatal: f(dtFatal),
            feriados: totalFeriados,
            temFeriadoMunicipal: temFeriadoMun,
            prorrogado: prorrogado,
            timeline: timeline
        };
    }
};

// Exportar pro global context até o modulo terminar a migração total
globalThis.MotorDePrazos = MotorDePrazos;
