/* Kits por tipo gravados em /entregas/{id}/kits e resumo por empreendimento.
   Mesmas regras da Agenda (index.html): obra antiga sem "kits" vira um bloco implícito
   do tipo principal com qtd pedida = qtd da obra; entregas parciais mandam na qtd entregue
   do bloco principal; obra concluída sem parciais conta entregue = pedido. */
(function () {
  var calc = window.HGICalc;
  var LINHAS = [
    { id: "eletrica", tipo: "eletrica", rot: "Elétrico" },
    { id: "qdc", tipo: "qdc", rot: "QDC" },
    { id: "hidraulica-agua-fria", tipo: "hidraulica", ramal: "agua-fria", rot: "Hidráulica água fria" },
    { id: "hidraulica-agua-quente", tipo: "hidraulica", ramal: "agua-quente", rot: "Hidráulica água quente" },
    { id: "hidraulica-esgoto", tipo: "hidraulica", ramal: "esgoto", rot: "Hidráulica esgoto" },
    { id: "gas", tipo: "gas", rot: "Gás" }
  ];
  var TIPOS = { eletrica: 1, qdc: 1, hidraulica: 1, gas: 1 };
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
  function chaveNome(s) { return norm(s).replace(/[^a-z0-9]+/g, " ").trim(); }
  function numV(v) { var n = calc.numOrNull(v); return (n === null || n < 0) ? null : n; }
  function qnum(o) { var q = o && o.qtd; q = (typeof q === "string") ? parseInt(q, 10) : q; return (typeof q === "number" && isFinite(q) && q > 0) ? q : 0; }
  function tipoDe(o) {
    var t = norm(o && o.tipo);
    if (TIPOS[t]) return t;
    if (t.indexOf("qdc") >= 0) return "qdc";
    if (t.indexOf("hidr") >= 0) return "hidraulica";
    if (t.indexOf("gas") >= 0) return "gas";
    return "eletrica";
  }
  function ramalDe(o) {
    if (tipoDe(o) !== "hidraulica") return "";
    var r = norm(o && o.ramal).replace(/\s+/g, "-");
    if (r === "agua-fria" || r === "aguafria" || r === "fria") return "agua-fria";
    if (r === "agua-quente" || r === "aguaquente" || r === "quente") return "agua-quente";
    if (r === "esgoto") return "esgoto";
    return "";
  }
  function chaveTotal(o) { var t = tipoDe(o); if (t === "hidraulica") { var r = ramalDe(o); return r ? "hidraulica-" + r : ""; } return t; }
  function entregueTotal(o) {
    var p = o && o.entregasParciais, s = 0, k, q;
    if (!p || typeof p !== "object") return { n: 0, q: 0 };
    var n = 0;
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) {
      if (!p[k] || typeof p[k] !== "object") continue;
      q = (typeof p[k].qtd === "string") ? parseInt(p[k].qtd, 10) : p[k].qtd;
      n++; if (typeof q === "number" && isFinite(q) && q > 0) s += q;
    }
    return { n: n, q: s };
  }
  function estaConcluido(o) {
    if (!o) return false;
    var s = norm(o.statusCodigo || o.status);
    return s === "concluido" || s.indexOf("concluido") >= 0;
  }
  function kitsDe(o) {
    var out = {}, k = o && o.kits, main = chaveTotal(o), parc = entregueTotal(o), conc = estaConcluido(o);
    if (k && typeof k !== "object") k = null;
    LINHAS.forEach(function (ln) {
      var b = k && k[ln.id], isMain = ln.id === main;
      if (b && typeof b === "object" && b.ativo === false) return;
      if (!b && !isMain) return;
      b = (b && typeof b === "object") ? b : {};
      var ped = numV(b.qtdPedido), ent = numV(b.qtdEntregue);
      if (isMain && ped === null && qnum(o)) ped = qnum(o);
      if (isMain && parc.n > 0) ent = parc.q;
      else if (ent === null && conc && ped !== null) ent = ped;
      out[ln.id] = { id: ln.id, rot: ln.rot, valor: numV(b.valor), qtdPedido: ped, qtdEntregue: ent };
    });
    return out;
  }
  function chavesFiltroTipo(f) {
    if (!f) return null;
    if (f === "hidraulica") return ["hidraulica-agua-fria", "hidraulica-agua-quente", "hidraulica-esgoto"];
    return [f];
  }
  /* Junta /entregas, /empreendimentos, /filaRomaneio e /romaneios pelo nome (sem caixa nem acento). */
  function agrupar(fontes, filtro) {
    filtro = filtro || {};
    var scope = chavesFiltroTipo(filtro.tipo), grupos = {}, ordem = [];
    function grupo(nome, origem) {
      var k = chaveNome(nome);
      if (!k) return null;
      if (!grupos[k]) { grupos[k] = { chave: k, nome: String(nome).trim(), n: 0, ped: 0, ent: 0, semQtd: 0, tipos: {}, origens: {}, temKit: false }; ordem.push(k); }
      grupos[k].origens[origem] = 1;
      return grupos[k];
    }
    var ent = fontes.entregas || {};
    Object.keys(ent).forEach(function (id) {
      var o = ent[id]; if (!o || typeof o !== "object") return;
      var g = grupo(o.nome || id, "agenda"); if (!g) return;
      g.n++;
      var ks = kitsDe(o);
      Object.keys(ks).forEach(function (kk) {
        var b = ks[kk];
        if (scope && scope.indexOf(b.id) < 0) return;
        g.temKit = true;
        if (b.qtdPedido === null) { g.semQtd++; return; }
        var t = g.tipos[b.id] || (g.tipos[b.id] = { rot: b.rot, ped: 0, ent: 0 });
        t.ped += b.qtdPedido; t.ent += (b.qtdEntregue || 0);
        g.ped += b.qtdPedido; g.ent += (b.qtdEntregue || 0);
      });
    });
    [["empreendimentos", "financeiro"], ["filaRomaneio", "romaneio"], ["romaneios", "romaneio"]].forEach(function (par) {
      var src = fontes[par[0]] || {};
      Object.keys(src).forEach(function (id) { var x = src[id]; if (x && typeof x === "object" && x.nome) grupo(x.nome, par[1]); });
    });
    var arr = ordem.map(function (k) { var g = grupos[k]; g.saldo = g.ped - g.ent; return g; });
    if (filtro.cliente) arr = arr.filter(function (g) { return g.chave === filtro.cliente; });
    if (scope) arr = arr.filter(function (g) { return g.temKit; });
    arr.sort(function (a, b) {
      var za = a.saldo <= 0 ? 1 : 0, zb = b.saldo <= 0 ? 1 : 0;
      return (za - zb) || (b.saldo - a.saldo) || a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    });
    return arr;
  }
  function htmlCards(arr) {
    var esc = calc.esc, f = calc.formatQtd;
    if (!arr.length) return '<div class="re-vazio">Nenhum empreendimento com estes filtros.</div>';
    return arr.map(function (g) {
      var zerado = g.saldo <= 0;
      var h = '<div class="re-card' + (zerado ? " re-ok" : "") + '">';
      h += '<div class="re-nome" title="' + esc(g.nome) + '">' + esc(g.nome) + (g.n > 1 ? ' <span class="re-n">' + g.n + " lançamentos</span>" : "") + "</div>";
      h += '<div class="re-nums"><div><span>Pedido</span><b>' + f(g.ped) + '</b></div><div><span>Entregue</span><b>' + f(g.ent) + '</b></div><div class="re-saldo"><span>Saldo</span><b>' + f(g.saldo) + "</b></div></div>";
      var tps = Object.keys(g.tipos).map(function (k) { var t = g.tipos[k]; return '<span class="re-tipo" title="' + esc(t.rot) + ": pedido " + t.ped + ", entregue " + t.ent + ", saldo " + (t.ped - t.ent) + '">' + esc(t.rot.replace("Hidráulica ", "H. ")) + " " + t.ent + "/" + t.ped + "</span>"; });
      if (g.semQtd) tps.push('<span class="re-tipo re-sq">' + g.semQtd + " sem qtd</span>");
      if (!g.n) tps.push('<span class="re-tipo re-sq">sem obra na Agenda</span>');
      h += '<div class="re-tipos">' + tps.join("") + "</div></div>";
      return h;
    }).join("");
  }

  /* ===== Semana (mesma lógica da Agenda para saber quais obras aparecem na semana) ===== */
  function iso(t) { return /^\d{4}-\d{2}-\d{2}$/.test(t || "") ? t : ""; }
  function parciais(o) {
    var p = o && o.entregasParciais, arr = [], k, x, q;
    if (!p || typeof p !== "object") return arr;
    for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) {
      x = p[k]; if (!x || typeof x !== "object") continue;
      q = (typeof x.qtd === "string") ? parseInt(x.qtd, 10) : x.qtd;
      arr.push({ id: k, qtd: (typeof q === "number" && isFinite(q) && q > 0) ? q : 0, data: x.data || "", lote: parseInt(x.lote, 10) || 0, criadoEm: x.criadoEm || 0 });
    }
    arr.sort(function (a, b) { return (a.data || "").localeCompare(b.data || "") || (a.criadoEm - b.criadoEm); });
    return arr;
  }
  function lotes(o) {
    var p = o && o.lotesPrevistos, arr = [], k, x, q;
    if (p && typeof p === "object") for (k in p) if (Object.prototype.hasOwnProperty.call(p, k)) {
      x = p[k]; if (!x || typeof x !== "object") continue;
      q = (typeof x.qtd === "string") ? parseInt(x.qtd, 10) : x.qtd;
      arr.push({ n: parseInt(x.n || k, 10) || 0, qtd: (typeof q === "number" && q > 0) ? q : 0, data: x.data || "" });
    }
    return arr.filter(function (l) { return l.n >= 1; }).sort(function (a, b) { return a.n - b.n; });
  }
  function integral(o) { var q = qnum(o); return q > 0 && entregueTotal(o).q >= q; }
  function enviado(o) {
    if (estaConcluido(o) || integral(o)) return true;
    var s = norm(o && (o.statusCodigo || o.status));
    return s === "pronto" || s.indexOf("entregue") >= 0 || s.indexOf("enviado") >= 0;
  }
  function dataFinal(o) {
    if (estaConcluido(o)) { if (iso(o.dataConclusao)) return o.dataConclusao; if (iso(o.data)) return o.data; }
    if (integral(o)) { var ps = parciais(o).filter(function (p) { return iso(p.data); }); if (ps.length) return ps[ps.length - 1].data; }
    return "";
  }
  function dataRef(o) {
    var falta = qnum(o) ? Math.max(0, qnum(o) - entregueTotal(o).q) : 0;
    if (falta > 0 && iso(o.proximoLoteData)) return o.proximoLoteData;
    var ent = entregueTotal(o).q, acum = 0, ls = lotes(o), i;
    for (i = 0; i < ls.length; i++) { acum += ls[i].qtd; if ((acum > ent || !ls[i].qtd) && iso(ls[i].data)) return ls[i].data; }
    return o.data || "";
  }
  function datasNaSemana(o, hoje) {
    var df = dataFinal(o);
    if (df) return [df];
    if (!enviado(o)) { var ref = dataRef(o); if (iso(o.data) && (!iso(ref) || o.data < ref)) ref = o.data; if (iso(ref) && ref < hoje) return [hoje]; }
    var d = [];
    if (iso(o.data)) d.push(o.data);
    lotes(o).forEach(function (l) { if (iso(l.data)) d.push(l.data); });
    if (iso(o.proximoLoteData)) d.push(o.proximoLoteData);
    return d;
  }
  function entregueNaSemana(o, ini, fim) {
    var q = qnum(o), antes = 0, dentro = 0;
    parciais(o).forEach(function (x) { if (!iso(x.data)) return; if (x.data < ini) antes += x.qtd; else if (x.data <= fim) dentro += x.qtd; });
    if (estaConcluido(o)) { var df = dataFinal(o); if (!df || df < ini || df > fim) return 0; return q ? Math.max(0, q - antes) : 0; }
    if (q) dentro = Math.min(dentro, Math.max(0, q - antes));
    return dentro;
  }
  function mapaEmps(emps) {
    var m = {}; Object.keys(emps || {}).forEach(function (k) { var e = emps[k]; if (!e || !e.nome) return; var c = chaveNome(e.nome); m[c] = (m[c] === undefined) ? e : null; }); return m;
  }
  function precoKit(o, b, mapa) {
    if (b.valor !== null) return b.valor;
    var e = mapa[chaveNome(o.nome)];
    if (e && b.id === "eletrica") return numV(e.valorKitEletrico);
    if (e && b.id === "qdc") return numV(e.valorKitQdc);
    return null;
  }
  function diasUteis(ini) {
    var n = 0, d, i;
    for (i = 0; i < 5; i++) { d = calc.somarDias(ini, i); if (d < "2026-12-24" || d > "2026-12-27") n++; }
    return n;
  }
  /* Projeção da semana em kits e R$ a partir de /entregas (kits) com reserva no preço do Financeiro. */
  function semana(fontes, ini, hoje) {
    var fim = calc.somarDias(ini, 6), ent = fontes.entregas || {}, mapa = mapaEmps(fontes.empreendimentos), visto = {};
    var r = { ini: ini, fim: fim, pN: 0, pQ: 0, pV: 0, pComV: 0, rN: 0, rQ: 0, rV: 0, rComV: 0, semValor: {}, semQtd: {} };
    Object.keys(ent).forEach(function (id) {
      var o = ent[id]; if (!o || typeof o !== "object") return;
      var naSem = datasNaSemana(o, hoje).some(function (d) { return d >= ini && d <= fim; });
      var ks = kitsDe(o), bl = Object.keys(ks).map(function (k) { return ks[k]; }), main = chaveTotal(o), temParc = parciais(o).length > 0;
      if (!naSem) {
        var mb = ks[main]; if (!mb) return;
        var q = entregueNaSemana(o, ini, fim); if (!q) return;
        r.rN++; r.rQ += q; var pv = precoKit(o, mb, mapa);
        if (pv === null) r.semValor[id] = 1; else { r.rV += q * pv; r.rComV++; }
        return;
      }
      r.pN++;
      var tp = numV(o.valorProjetado), tr = numV(o.valorReal), qp = 0, vp = 0, falta = false, algum = false, qr = 0, vr = 0, faltaR = false, algumR = false;
      bl.forEach(function (b) {
        var pr = precoKit(o, b, mapa);
        if (!b.qtdPedido) r.semQtd[id] = 1; else { qp += b.qtdPedido; if (pr === null) falta = true; else { algum = true; vp += b.qtdPedido * pr; } }
        var qe = (b.id === main && temParc) ? entregueNaSemana(o, ini, fim) : (b.qtdEntregue || 0);
        if (qe > 0) { qr += qe; if (pr === null) faltaR = true; else { algumR = true; vr += qe * pr; } }
      });
      if (!bl.length && qnum(o)) { qp = qnum(o); falta = true; }
      r.pQ += qp; r.rQ += qr;
      if (tp !== null) { r.pV += tp; r.pComV++; } else { if (algum) { r.pV += vp; r.pComV++; } if (falta || (!algum && qp)) r.semValor[id] = 1; }
      if (qr > 0 || tr !== null) r.rN++;
      if (tr !== null) { r.rV += tr; r.rComV++; } else { if (algumR) { r.rV += vr; r.rComV++; } if (faltaR) r.semValor[id] = 1; }
    });
    r.nSemValor = Object.keys(r.semValor).length; r.nSemQtd = Object.keys(r.semQtd).length;
    r.dias = diasUteis(ini); r.meta = 50 * r.dias;
    r.proj = r.pComV ? r.pV : null; r.real = r.rComV ? r.rV : (r.proj !== null ? 0 : null);
    r.dif = (r.proj !== null && r.real !== null) ? r.real - r.proj : null;
    r.pct = (r.dif !== null && r.proj > 0) ? r.real / r.proj * 100 : null;
    return r;
  }
  /* Totais por tipo de kit em todas as obras. */
  function porTipo(fontes) {
    var ent = fontes.entregas || {}, mapa = mapaEmps(fontes.empreendimentos), t = {};
    LINHAS.forEach(function (ln) { t[ln.id] = { rot: ln.rot, n: 0, ped: 0, ent: 0, vPed: 0, vEnt: 0, comValor: 0, semValor: 0, semQtd: 0 }; });
    Object.keys(ent).forEach(function (id) {
      var o = ent[id]; if (!o || typeof o !== "object") return;
      var ks = kitsDe(o);
      Object.keys(ks).forEach(function (k) {
        var b = ks[k], x = t[k]; x.n++;
        if (b.qtdPedido === null) { x.semQtd++; return; }
        x.ped += b.qtdPedido; x.ent += (b.qtdEntregue || 0);
        var v = precoKit(o, b, mapa);
        if (v === null) x.semValor++; else { x.comValor++; x.vPed += v * b.qtdPedido; x.vEnt += v * (b.qtdEntregue || 0); }
      });
    });
    return t;
  }
  function moeda(n) { return n === null || n === undefined ? "—" : calc.formatBRL(n); }
  function pctTxt(n) { return n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; }
  window.HGIKitsExtra = { semana: semana, porTipo: porTipo, parciais: parciais, dataFinal: dataFinal, precoKit: precoKit, mapaEmps: mapaEmps, moeda: moeda, pctTxt: pctTxt, numV: numV, qnum: qnum, chaveTotal: chaveTotal };
  window.HGIKits = { LINHAS: LINHAS, kitsDe: kitsDe, chaveNome: chaveNome, agrupar: agrupar, htmlCards: htmlCards };
})();
