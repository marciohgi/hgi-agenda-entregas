(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HGICalc = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  var CATALOGO_ALMOX = [
    { id: "cat-mangueira", item: "Mangueira (conduíte)", categoria: "Elétrico", unidade: "m" },
    { id: "cat-fio", item: "Fio", categoria: "Elétrico", unidade: "m" },
    { id: "cat-disjuntor", item: "Disjuntor", categoria: "Elétrico", unidade: "un" },
    { id: "cat-ilhos", item: "Ilhós", categoria: "Fixação", unidade: "un" },
    { id: "cat-parafuso", item: "Parafuso", categoria: "Fixação", unidade: "un" },
    { id: "cat-bucha", item: "Bucha", categoria: "Fixação", unidade: "un" },
    { id: "cat-abracadeira", item: "Abraçadeira", categoria: "Fixação", unidade: "un" },
    { id: "cat-fita", item: "Fita isolante", categoria: "Elétrico", unidade: "rolo" },
    { id: "cat-conector", item: "Conector", categoria: "Elétrico", unidade: "un" }
  ];
  var CATEGORIAS = ["Elétrico", "Hidráulico", "Gás", "Fixação"];
  var UNIDADES = ["m", "un", "rolo", "cx"];

  function numOrNull(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    var s = String(v).trim();
    if (!s) return null;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function parseISO(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }
  function isoOf(y, m, d) {
    return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
  }
  function toDate(iso) {
    var p = parseISO(iso);
    return p ? new Date(p.y, p.m - 1, p.d) : null;
  }
  function somarDias(iso, n) {
    var dt = toDate(iso);
    if (!dt) return "";
    dt.setDate(dt.getDate() + n);
    return isoOf(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }
  function segundaDe(iso) {
    var dt = toDate(iso);
    if (!dt) return "";
    dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
    return isoOf(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }
  function diasDaSemana(segunda) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(somarDias(segunda, i));
    return out;
  }
  function listarDias(ini, fim) {
    var out = [], cur = ini, g = 0;
    while (cur && cur <= fim && g++ < 400) {
      out.push(cur);
      cur = somarDias(cur, 1);
    }
    return out;
  }
  function inicioMes(iso) {
    return parseISO(iso) ? iso.slice(0, 8) + "01" : "";
  }
  function hojeSP(agora) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora || new Date());
    } catch (e) {
      var d = agora || new Date();
      return isoOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }
  function ano2deIso(iso) {
    var p = parseISO(iso);
    return p ? p.y % 100 : null;
  }
  function nomeDia(iso) {
    var dt = toDate(iso);
    if (!dt) return "";
    return ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][dt.getDay()];
  }
  function nomeDiaCurto(iso) {
    var dt = toDate(iso);
    if (!dt) return "";
    return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][dt.getDay()];
  }
  function formatDataBR(iso) {
    var p = parseISO(iso);
    if (!p) return "";
    return (p.d < 10 ? "0" : "") + p.d + "/" + (p.m < 10 ? "0" : "") + p.m + "/" + p.y;
  }
  function formatSemana(segunda) {
    var dias = diasDaSemana(segunda);
    var a = parseISO(dias[0]), b = parseISO(dias[6]);
    if (!a || !b) return "";
    if (a.m === b.m && a.y === b.y) return "Semana de " + a.d + " a " + b.d + "/" + (b.m < 10 ? "0" : "") + b.m + "/" + b.y;
    return "Semana de " + formatDataBR(dias[0]) + " a " + formatDataBR(dias[6]);
  }
  function formatQuando(ms) {
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }
  function formatBRL(n) {
    if (n === null || n === undefined || n === "") return "—";
    var x = typeof n === "number" ? n : numOrNull(n);
    if (x === null) return "—";
    return x.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function formatQtd(n) {
    if (n === null || n === undefined || n === "") return "—";
    var x = typeof n === "number" ? n : numOrNull(n);
    if (x === null) return "—";
    return x.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  function formatRomaneio(n) {
    var x = numOrNull(n);
    if (x === null) return "";
    var s = String(Math.trunc(x));
    while (s.length < 6) s = "0" + s;
    return s;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function situacaoEstoque(entrada, saida, minimo) {
    var e = numOrNull(entrada), s = numOrNull(saida);
    if (e === null && s === null) return { saldo: null, status: "" };
    var saldo = (e || 0) - (s || 0);
    var m = numOrNull(minimo);
    var status = m === null ? "OK" : (saldo < m ? "Repor" : "OK");
    return { saldo: saldo, status: status };
  }

  function saldoEntrega(contratada, entregue) {
    var c = numOrNull(contratada), e = numOrNull(entregue);
    if (c === null || e === null) return null;
    return c - e;
  }

  function precos(emp) {
    var e = numOrNull(emp && emp.valorKitEletrico);
    var d = numOrNull(emp && emp.valorKitQdc);
    return { eletrico: e, qdc: d, tem: e !== null || d !== null, soma: (e || 0) + (d || 0) };
  }
  function valorDeQtd(qtd, emp) {
    var q = numOrNull(qtd);
    if (q === null) return null;
    var pr = precos(emp);
    if (!pr.tem) return null;
    return q * pr.soma;
  }

  function proximoRomaneio(atual, ano) {
    ano = Number(ano);
    if (!(ano >= 26 && ano <= 99)) return null;
    var inicio = ano * 10000 + 1;
    var fim = ano * 10000 + 9999;
    if (atual === null || atual === undefined || atual === "") return inicio;
    atual = Number(atual);
    if (!isFinite(atual)) return inicio;
    var anoAtual = Math.floor(atual / 10000);
    if (ano > anoAtual) return inicio;
    if (ano < anoAtual) {
      if (atual % 10000 >= 9999) return null;
      return atual + 1;
    }
    if (atual < inicio) return inicio;
    if (atual >= fim) return null;
    return atual + 1;
  }

  /* Espelha a validação de database.rules.json em contadores/romaneio.
     Número novo só entra se for o primeiro (…0001), o seguinte (+1)
     ou o primeiro número de um ano à frente. Nunca repete. */
  function regraContadorAceita(anterior, proximo) {
    if (typeof proximo !== "number" || !isFinite(proximo)) return false;
    if (proximo < 260001 || proximo > 991000) return false;
    if (proximo % 10000 < 1 || proximo % 10000 > 9999) return false;
    if (anterior === null || anterior === undefined || anterior === "") return proximo % 10000 === 1;
    anterior = Number(anterior);
    if (!isFinite(anterior)) return false;
    if (proximo === anterior + 1 && proximo % 10000 !== 0) return true;
    if (proximo > anterior && proximo % 10000 === 1 && proximo - anterior <= 100000) return true;
    return false;
  }

  function entradas(obj) {
    if (!obj || typeof obj !== "object") return [];
    return Object.keys(obj).map(function (id) {
      return Object.assign({ id: id }, obj[id]);
    });
  }

  function somarQtdValor(list, emp) {
    if (!list || !list.length) return { qtd: null, valor: null, incompleto: false };
    var qtd = 0, valor = 0, temQtd = false, temValor = false, incompleto = false;
    list.forEach(function (m) {
      var q = numOrNull(m.qtd);
      if (q === null) { incompleto = true; return; }
      temQtd = true;
      qtd += q;
      var v = valorDeQtd(q, emp);
      if (v === null) incompleto = true;
      else { temValor = true; valor += v; }
    });
    return { qtd: temQtd ? qtd : null, valor: temValor ? valor : null, incompleto: incompleto };
  }

  function linhasFinanceiras(emps, movimentos, ini, fim) {
    return (emps || []).map(function (emp) {
      var todos = (movimentos || []).filter(function (m) { return m && m.empreendimentoId === emp.id; });
      var entregas = todos.filter(function (m) { return m.tipo === "entrega"; });
      var somaEnt = somarQtdValor(entregas, emp);
      var naSemana = function (tipo) {
        return somarQtdValor(todos.filter(function (m) {
          return m.tipo === tipo && m.data >= ini && m.data <= fim;
        }), emp);
      };
      var proj = naSemana("projecao");
      var real = naSemana("entrega");
      var contratada = numOrNull(emp.qtdContratada);
      return {
        id: emp.id,
        nome: emp.nome || "",
        valorKitEletrico: numOrNull(emp.valorKitEletrico),
        valorKitQdc: numOrNull(emp.valorKitQdc),
        qtdContratada: contratada,
        qtdEntregue: somaEnt.qtd,
        saldo: saldoEntrega(contratada, somaEnt.qtd),
        qtdProjetadaSemana: proj.qtd,
        valorProjetadoSemana: proj.valor,
        qtdRealSemana: real.qtd,
        valorRealSemana: real.valor,
        lancadoPorNome: emp.lancadoPorNome || ""
      };
    }).sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt"); });
  }

  function vazioDia() {
    return { produzidoQtd: 0, produzidoReais: 0, entregaQtd: 0, entregaReais: 0, projecaoQtd: 0, projecaoReais: 0, romaneioQtd: 0, romaneioReais: 0, romaneioN: 0 };
  }
  function vazioEmp(emp) {
    return {
      id: emp.id,
      nome: emp.nome || "Empreendimento",
      projetadoQtd: 0, projetadoReais: 0,
      realQtd: 0, realReais: 0,
      produzidoQtd: 0, produzidoReais: 0,
      romaneioQtd: 0, romaneioReais: 0, romaneioN: 0,
      teve: false
    };
  }

  function unirRomaneios(movs, romaneios) {
    var extra = (romaneios || []).map(function (r) {
      return { tipo: "romaneio", empreendimentoId: r.empreendimentoId, data: r.data, qtd: r.qtd, numero: r.numero, nome: r.nome };
    });
    return (movs || []).concat(extra);
  }

  function periodoAcumulado(emps, movimentos, ini, fim) {
    var porId = {};
    (emps || []).forEach(function (e) { porId[e.id] = e; });
    var dias = {};
    var porEmp = {};
    (emps || []).forEach(function (e) { porEmp[e.id] = vazioEmp(e); });
    var tem = false;
    (movimentos || []).forEach(function (m) {
      if (!m || !m.data || m.data < ini || m.data > fim) return;
      tem = true;
      var emp = porId[m.empreendimentoId];
      var q = numOrNull(m.qtd);
      var valor = q === null ? null : valorDeQtd(q, emp);
      var bucket = dias[m.data] || (dias[m.data] = vazioDia());
      var pe = porEmp[m.empreendimentoId] || (porEmp[m.empreendimentoId] = vazioEmp({ id: m.empreendimentoId, nome: m.nome || "Empreendimento removido" }));
      pe.teve = true;
      var qq = q || 0, vv = valor || 0;
      if (m.tipo === "produzido") {
        if (q !== null) { bucket.produzidoQtd += qq; pe.produzidoQtd += qq; }
        if (valor !== null) { bucket.produzidoReais += vv; pe.produzidoReais += vv; }
      } else if (m.tipo === "entrega") {
        if (q !== null) { bucket.entregaQtd += qq; pe.realQtd += qq; }
        if (valor !== null) { bucket.entregaReais += vv; pe.realReais += vv; }
      } else if (m.tipo === "projecao") {
        if (q !== null) { bucket.projecaoQtd += qq; pe.projetadoQtd += qq; }
        if (valor !== null) { bucket.projecaoReais += vv; pe.projetadoReais += vv; }
      } else if (m.tipo === "romaneio") {
        bucket.romaneioN += 1;
        pe.romaneioN += 1;
        if (q !== null) { bucket.romaneioQtd += qq; pe.romaneioQtd += qq; }
        if (valor !== null) { bucket.romaneioReais += vv; pe.romaneioReais += vv; }
      }
    });
    var acc = { pq: 0, pr: 0, eq: 0, er: 0, gq: 0, gr: 0, rq: 0, rr: 0, rn: 0 };
    var serie = listarDias(ini, fim).map(function (data) {
      var d = dias[data] || vazioDia();
      acc.pq += d.produzidoQtd; acc.pr += d.produzidoReais;
      acc.eq += d.entregaQtd; acc.er += d.entregaReais;
      acc.gq += d.projecaoQtd; acc.gr += d.projecaoReais;
      acc.rq += d.romaneioQtd; acc.rr += d.romaneioReais; acc.rn += d.romaneioN;
      return {
        data: data,
        produzidoQtd: d.produzidoQtd, produzidoReais: d.produzidoReais, produzidoAcumuladoQtd: acc.pq, produzidoAcumuladoReais: acc.pr,
        entregaQtd: d.entregaQtd, entregaReais: d.entregaReais, entregaAcumuladoQtd: acc.eq, entregaAcumuladoReais: acc.er,
        projecaoQtd: d.projecaoQtd, projecaoReais: d.projecaoReais, projecaoAcumuladaQtd: acc.gq, projecaoAcumuladaReais: acc.gr,
        romaneioQtd: d.romaneioQtd, romaneioReais: d.romaneioReais, romaneioN: d.romaneioN,
        romaneioAcumuladoQtd: acc.rq, romaneioAcumuladoReais: acc.rr, romaneioAcumuladoN: acc.rn
      };
    });
    var ultimo = serie.length ? serie[serie.length - 1] : null;
    var empreendimentos = Object.keys(porEmp).map(function (id) { return porEmp[id]; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt"); });
    return {
      dias: serie,
      empreendimentos: empreendimentos,
      temLancamento: tem,
      totais: ultimo ? {
        produzidoQtd: ultimo.produzidoAcumuladoQtd,
        produzidoReais: ultimo.produzidoAcumuladoReais,
        entregaQtd: ultimo.entregaAcumuladoQtd,
        entregaReais: ultimo.entregaAcumuladoReais,
        projecaoQtd: ultimo.projecaoAcumuladaQtd,
        projecaoReais: ultimo.projecaoAcumuladaReais,
        romaneioQtd: ultimo.romaneioAcumuladoQtd,
        romaneioReais: ultimo.romaneioAcumuladoReais,
        romaneioN: ultimo.romaneioAcumuladoN
      } : vazioDia()
    };
  }

  function seedExemplo(hoje) {
    hoje = hoje || "2026-11-23";
    var mes = hoje.slice(0, 8);
    var d3 = mes + "03";
    var d10 = mes + "10";
    var d20 = mes + "20";
    if (d3 > hoje) d3 = hoje;
    if (d10 > hoje) d10 = hoje;
    if (d20 > hoje) d20 = hoje;
    var amanha = somarDias(hoje, 1);
    var ano = ano2deIso(hoje);
    var numero = proximoRomaneio(null, ano);
    var emps = [
      { id: "ex-alfa", nome: "Exemplo — Residencial Alfa", valorKitEletrico: 1000, valorKitQdc: null, qtdContratada: 10, lancadoPorNome: "Exemplo visual" },
      { id: "ex-beta", nome: "Exemplo — Residencial Beta", valorKitEletrico: 500, valorKitQdc: 50, qtdContratada: 8, lancadoPorNome: "Exemplo visual" },
      { id: "ex-pendente", nome: "Exemplo — Obra pendente", valorKitEletrico: null, valorKitQdc: null, qtdContratada: null, lancadoPorNome: "Exemplo visual" }
    ];
    var movimentos = [
      { id: "m1", tipo: "projecao", empreendimentoId: "ex-alfa", data: hoje, qtd: 2, lancadoPorNome: "Exemplo visual" },
      { id: "m2", tipo: "projecao", empreendimentoId: "ex-alfa", data: amanha, qtd: 2, lancadoPorNome: "Exemplo visual" },
      { id: "m3", tipo: "projecao", empreendimentoId: "ex-beta", data: hoje, qtd: 1, lancadoPorNome: "Exemplo visual" },
      { id: "m4", tipo: "produzido", empreendimentoId: "ex-alfa", data: d3, qtd: 1, lancadoPorNome: "Exemplo visual" },
      { id: "m5", tipo: "produzido", empreendimentoId: "ex-alfa", data: hoje, qtd: 2, lancadoPorNome: "Exemplo visual" },
      { id: "m6", tipo: "entrega", empreendimentoId: "ex-alfa", data: d10, qtd: 1, lancadoPorNome: "Exemplo visual" },
      { id: "m7", tipo: "entrega", empreendimentoId: "ex-beta", data: hoje, qtd: 1, lancadoPorNome: "Exemplo visual" }
    ];
    var romaneios = [{
      id: String(numero),
      numero: numero,
      empreendimentoId: "ex-beta",
      nome: "Exemplo — Residencial Beta",
      qtd: 1,
      data: d20,
      observacao: "Linha de exemplo — não é um romaneio real.",
      lancadoPorNome: "Exemplo visual"
    }];
    var fila = {
      "ex-alfa": { nome: "Exemplo — Residencial Alfa", qtdContratada: 10, pronto: true, romaneioNumero: null },
      "ex-beta": { nome: "Exemplo — Residencial Beta", qtdContratada: 8, pronto: true, romaneioNumero: numero, lancadoPorNome: "Exemplo visual" },
      "ex-pendente": { nome: "Exemplo — Obra pendente", qtdContratada: null, pronto: false, romaneioNumero: null }
    };
    return { empreendimentos: emps, movimentos: movimentos, romaneios: romaneios, fila: fila, contador: numero, aviso: "Exemplo visual — estes números não são lançamentos reais e não vão para o banco." };
  }

  return {
    CATALOGO_ALMOX: CATALOGO_ALMOX,
    CATEGORIAS: CATEGORIAS,
    UNIDADES: UNIDADES,
    numOrNull: numOrNull,
    parseISO: parseISO,
    isoOf: isoOf,
    somarDias: somarDias,
    segundaDe: segundaDe,
    diasDaSemana: diasDaSemana,
    listarDias: listarDias,
    inicioMes: inicioMes,
    hojeSP: hojeSP,
    ano2deIso: ano2deIso,
    nomeDia: nomeDia,
    nomeDiaCurto: nomeDiaCurto,
    formatDataBR: formatDataBR,
    formatSemana: formatSemana,
    formatQuando: formatQuando,
    formatBRL: formatBRL,
    formatQtd: formatQtd,
    formatRomaneio: formatRomaneio,
    esc: esc,
    situacaoEstoque: situacaoEstoque,
    saldoEntrega: saldoEntrega,
    precos: precos,
    valorDeQtd: valorDeQtd,
    proximoRomaneio: proximoRomaneio,
    regraContadorAceita: regraContadorAceita,
    entradas: entradas,
    somarQtdValor: somarQtdValor,
    linhasFinanceiras: linhasFinanceiras,
    unirRomaneios: unirRomaneios,
    periodoAcumulado: periodoAcumulado,
    seedExemplo: seedExemplo
  };
});
