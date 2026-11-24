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
  window.HGIKits = { LINHAS: LINHAS, kitsDe: kitsDe, chaveNome: chaveNome, agrupar: agrupar, htmlCards: htmlCards };
})();
