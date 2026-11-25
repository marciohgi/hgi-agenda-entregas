/* Cadastro de Cliente: grava /clientes/{id} e cria um registro por lote em /entregas. Só papel total. */
(function () {
  var calc = window.HGICalc;
  /* Antecipação na agenda, em dias corridos antes da previsão do cliente (único lugar para mudar). */
  var ANTECIPACAO_DIAS = {
    "Minha Casa Minha Vida": 10,
    "Médio Padrão": 13,
    "Alto Padrão": 15,
    "Altíssimo Padrão": 20
  };
  var RITMO = { "Minha Casa Minha Vida": "50 aptos/dia", "Médio Padrão": "30 aptos/dia", "Alto Padrão": "20 aptos/dia", "Altíssimo Padrão": "5–10 aptos/dia" };
  var TIPOS = [
    { v: "eletrica", rot: "Elétrico" },
    { v: "gas", rot: "Gás" },
    { v: "hidraulica:agua-fria", rot: "Água / Hidráulica · água fria" },
    { v: "hidraulica:agua-quente", rot: "Água / Hidráulica · água quente" },
    { v: "hidraulica:esgoto", rot: "Água / Hidráulica · esgoto" }
  ];
  var DIAS_SEM = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var app = document.getElementById("app"), esc = calc.esc;
  var CLI = null, ENT = null, edId = null, lotes = [];

  function db() { return firebase.database(); }
  function isoOk(t) { return /^\d{4}-\d{2}-\d{2}$/.test(t || ""); }
  function menosDias(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
  function diaSem(iso) { return new Date(iso + "T12:00:00Z").getUTCDay(); }
  function br(iso) { return isoOk(iso) ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : ""; }
  function dataAgenda(prev, padrao) { var n = ANTECIPACAO_DIAS[padrao]; return isoOk(prev) && n != null ? menosDias(prev, n) : ""; }
  function kitKey(tipo, ramal) { return tipo === "hidraulica" ? "hidraulica-" + ramal : tipo; }
  function lerMoeda(s) { s = String(s || "").replace(/R\$/g, "").replace(/\s+/g, ""); if (!s) return null; if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(s)) s = s.replace(/,/g, ""); var n = calc.numOrNull(s); return n === null || n < 0 ? NaN : Math.round(n * 100) / 100; }
  function lerInt(s) { s = String(s || "").trim(); if (!s) return null; if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, ""); var n = Number(s); return isFinite(n) && n >= 0 && Math.floor(n) === n ? n : NaN; }
  function slug(t) { return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cliente"; }
  function novoId(pref) { return slug(pref) + "-" + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4); }
  function v(id) { return (document.getElementById(id) || {}).value || ""; }

  function form() {
    var c = edId && CLI[edId] ? CLI[edId] : null;
    var h = '<div class="bloco cli-form"><h2>' + (c ? "Editar cliente · " + esc(c.nome) : "Novo cliente") + "</h2>";
    h += '<div class="form-grid">';
    h += '<label class="full">Cliente / empreendimento<input id="c-nome" maxlength="120" value="' + esc(c ? c.nome : "") + '"></label>';
    h += '<label>Quantidade de kits contratados<input id="c-qtd" inputmode="numeric" value="' + (c && c.qtdContratada ? c.qtdContratada : "") + '"></label>';
    var tv = c ? (c.tipo === "hidraulica" ? "hidraulica:" + (c.ramal || "agua-fria") : c.tipo) : "eletrica";
    h += '<label>Tipo de kit<select id="c-tipo">' + TIPOS.map(function (t) { return '<option value="' + t.v + '"' + (t.v === tv ? " selected" : "") + ">" + esc(t.rot) + "</option>"; }).join("") + "</select></label>";
    h += '<label>Valor por kit (R$)<input id="c-valor" inputmode="decimal" value="' + (c && c.valorKit != null ? String(c.valorKit).replace(".", ",") : "") + '"></label>';
    h += '<label>Padrão do imóvel<select id="c-padrao"><option value="">Escolha o padrão</option>' + Object.keys(ANTECIPACAO_DIAS).map(function (p) { return '<option' + (c && c.padrao === p ? " selected" : "") + ">" + esc(p) + "</option>"; }).join("") + "</select></label>";
    h += "</div>";
    h += '<h3 class="cli-sub">Lotes</h3><div class="cli-lotes-cab"><span>Lote</span><span>Quantidade</span><span>Previsão do cliente</span><span>Data na agenda</span><span></span></div><div id="c-lotes"></div>';
    h += '<button type="button" class="btn sec" id="c-add-lote">+ Adicionar lote</button> <span class="cli-soma" id="c-soma"></span>';
    h += '<div class="form-acoes"><button type="button" class="btn lar" id="c-salvar">' + (c ? "Salvar alterações" : "Salvar e criar na agenda") + "</button>" + (c ? '<button type="button" class="btn sec" id="c-novo">Novo cliente</button>' : "") + '<span class="hgi-okmsg" id="c-ok"></span><span class="hgi-erro" id="c-erro"></span></div></div>';
    return h;
  }
  function desenhaLotes() {
    var box = document.getElementById("c-lotes"); if (!box) return;
    box.innerHTML = lotes.map(function (l, i) {
      return '<div class="cli-lote" data-i="' + i + '"><b>' + (i + 1) + '</b><input data-f="qtd" inputmode="numeric" placeholder="Qtd" value="' + (l.qtd || "") + '" aria-label="Quantidade do lote ' + (i + 1) + '"><input type="date" data-f="prev" value="' + (l.prev || "") + '" aria-label="Previsão do cliente, lote ' + (i + 1) + '"><span class="cli-dag" id="c-dag' + i + '"></span><button type="button" class="btn verm mini" data-del="' + i + '">Excluir</button></div>';
    }).join("");
    calcula();
  }
  function calcula() {
    var pad = v("c-padrao"), soma = 0, tot = lerInt(v("c-qtd"));
    lotes.forEach(function (l, i) {
      var el = document.getElementById("c-dag" + i); if (!el) return;
      var d = dataAgenda(l.prev, pad), ds = d ? diaSem(d) : -1;
      el.innerHTML = d ? esc(br(d)) + (ds === 0 || ds === 6 ? ' <span class="cli-fds">' + DIAS_SEM[ds] + "</span>" : "") : "";
      var q = lerInt(l.qtd); if (q > 0) soma += q;
    });
    var s = document.getElementById("c-soma");
    if (s) { s.textContent = lotes.length ? "Soma dos lotes: " + soma + (tot > 0 ? " de " + tot + (soma !== tot ? " · diferente do contratado" : "") : "") : ""; s.className = "cli-soma" + (tot > 0 && soma !== tot ? " cli-diverge" : ""); }
  }
  function lista() {
    var ids = Object.keys(CLI || {}).sort(function (a, b) { return (CLI[a].nome || "").localeCompare(CLI[b].nome || "", "pt-BR"); });
    var h = '<div class="bloco"><h2>Clientes cadastrados</h2>';
    if (!ids.length) return h + '<p class="vazio">Nenhum cliente cadastrado.</p></div>';
    h += '<div class="grade-wrap"><table class="grade"><thead><tr><th>Cliente</th><th>Tipo</th><th>Padrão</th><th class="num">Kits</th><th class="num">Valor por kit</th><th class="num">Lotes</th><th></th></tr></thead><tbody>';
    ids.forEach(function (id) {
      var c = CLI[id], nl = Object.keys(c.lotes || {}).length, t = TIPOS.filter(function (x) { return x.v === (c.tipo === "hidraulica" ? "hidraulica:" + c.ramal : c.tipo); })[0];
      h += "<tr><td>" + esc(c.nome) + "</td><td>" + esc(t ? t.rot : c.tipo || "") + "</td><td>" + esc(c.padrao || "") + '</td><td class="num">' + (c.qtdContratada || "") + '</td><td class="num">' + (c.valorKit != null ? esc(calc.formatBRL(c.valorKit)) : "") + '</td><td class="num">' + nl + '</td><td><button type="button" class="btn sec mini" data-ed="' + esc(id) + '">Editar</button> <button type="button" class="btn verm mini" data-ex="' + esc(id) + '">Excluir</button></td></tr>';
    });
    return h + "</tbody></table></div></div>";
  }
  function render() {
    if (CLI === null || ENT === null) { app.textContent = "Carregando…"; return; }
    var ativo = document.activeElement && app.contains(document.activeElement);
    if (ativo && document.getElementById("c-nome")) { var bl = document.getElementById("cli-lista"); if (bl) bl.innerHTML = lista(); return; }
    app.innerHTML = form() + '<div id="cli-lista">' + lista() + "</div>";
    desenhaLotes();
  }
  function abrirEdicao(id) {
    edId = id; var c = CLI[id];
    lotes = Object.keys(c.lotes || {}).sort(function (a, b) { return a - b; }).map(function (k) { var l = c.lotes[k]; return { qtd: l.qtd, prev: l.dataPrevisaoCliente, entregaId: l.entregaId }; });
    app.innerHTML = ""; render(); window.scrollTo(0, 0);
  }
  function novo() { edId = null; lotes = [{ qtd: "", prev: "" }]; app.innerHTML = ""; render(); }

  function dizer(ok, t) { var a = document.getElementById(ok ? "c-ok" : "c-erro"), b = document.getElementById(ok ? "c-erro" : "c-ok"); if (b) b.textContent = ""; if (a) a.textContent = t; }
  function salvar() {
    var nome = v("c-nome").trim(), tot = lerInt(v("c-qtd")), tv = v("c-tipo").split(":"), tipo = tv[0], ramal = tv[1] || "", valor = lerMoeda(v("c-valor")), pad = v("c-padrao");
    if (!nome) return dizer(false, "Informe o cliente / empreendimento.");
    if (!(tot > 0)) return dizer(false, "Informe a quantidade de kits contratados.");
    if (isNaN(valor)) return dizer(false, "Valor por kit inválido.");
    if (!ANTECIPACAO_DIAS.hasOwnProperty(pad)) return dizer(false, "Escolha o padrão do imóvel.");
    if (!lotes.length) return dizer(false, "Adicione pelo menos um lote.");
    var soma = 0;
    for (var i = 0; i < lotes.length; i++) { var q = lerInt(lotes[i].qtd); if (!(q > 0)) return dizer(false, "Lote " + (i + 1) + ": informe a quantidade."); if (!isoOk(lotes[i].prev)) return dizer(false, "Lote " + (i + 1) + ": informe a previsão do cliente."); soma += q; }
    if (soma !== tot && !window.confirm("A soma dos lotes (" + soma + ") é diferente da quantidade contratada (" + tot + "). Salvar assim mesmo?")) return;
    var id = edId || novoId(nome), velho = edId ? CLI[edId] : null, agora = Date.now(), up = {}, kk = kitKey(tipo, ramal);
    var quem = (HGI.sessao && (HGI.sessao.setor || HGI.sessao.nome)) || "";
    var cli = { nome: nome, qtdContratada: tot, tipo: tipo, padrao: pad, ritmo: RITMO[pad] || "", antecipacaoDias: ANTECIPACAO_DIAS[pad], criadoEm: velho && velho.criadoEm || agora, atualizadoEm: agora, lancadoPorNome: quem, lotes: {} };
    if (ramal) cli.ramal = ramal; if (valor !== null) cli.valorKit = valor;
    var ajustados = [], usados = {};
    lotes.forEach(function (l, i) {
      var n = i + 1, q = lerInt(l.qtd), dAg = dataAgenda(l.prev, pad), eid = l.entregaId && ENT[l.entregaId] ? l.entregaId : null, e = eid ? ENT[eid] : null;
      var ds = diaSem(dAg), base = { nome: nome, qtd: q, data: dAg, dataPrevisaoCliente: l.prev, tipo: tipo, padrao: pad, ritmo: RITMO[pad] || "", clienteId: id, clienteLote: n, clienteLotes: lotes.length, origem: "cadastro-cliente", fimDeSemana: ds === 0 || ds === 6, atualizadoEm: agora };
      if (ramal) base.ramal = ramal;
      var bloco = { ativo: true, qtdPedido: q, qtdEntregue: 0 }; if (valor !== null) bloco.valor = valor;
      if (!eid) {
        eid = novoId(nome);
        base.criadoEm = agora; base.status = "aguardando"; base.statusCodigo = "aguardando"; base.estagio = ""; base.kits = {}; base.kits[kk] = bloco;
        up["entregas/" + eid] = base;
      } else {
        var mudou = e.data !== dAg || Number(e.qtd) !== q || e.tipo !== tipo || (e.padrao || "") !== pad;
        if (e.ajustadoManual && mudou) ajustados.push({ n: n, eid: eid, base: base, bloco: bloco, e: e });
        else aplicaLote(up, eid, base, bloco, e, kk);
      }
      usados[eid] = 1;
      cli.lotes[String(n)] = { qtd: q, dataPrevisaoCliente: l.prev, dataAgenda: dAg, entregaId: eid };
    });
    if (ajustados.length && window.confirm((ajustados.length === 1 ? "O lote " : "Os lotes ") + ajustados.map(function (a) { return a.n; }).join(", ") + (ajustados.length === 1 ? " foi ajustado" : " foram ajustados") + " manualmente na agenda. Sobrescrever com os dados do cadastro?")) {
      ajustados.forEach(function (a) { a.base.ajustadoManual = null; aplicaLote(up, a.eid, a.base, a.bloco, a.e, kk); });
    } else ajustados.forEach(function (a) { up["entregas/" + a.eid + "/clienteLote"] = a.n; up["entregas/" + a.eid + "/clienteLotes"] = lotes.length; up["entregas/" + a.eid + "/dataPrevisaoCliente"] = a.base.dataPrevisaoCliente; });
    var sobras = velho ? Object.keys(velho.lotes || {}).map(function (k) { return velho.lotes[k].entregaId; }).filter(function (x) { return x && ENT[x] && !usados[x]; }) : [];
    if (sobras.length) {
      if (window.confirm(sobras.length + " lote(s) saíram do cadastro. Apagar também da agenda?")) sobras.forEach(function (x) { up["entregas/" + x] = null; });
      else sobras.forEach(function (x) { up["entregas/" + x + "/clienteId"] = null; up["entregas/" + x + "/clienteLote"] = null; });
    }
    up["clientes/" + id] = cli;
    dizer(true, "Salvando…");
    db().ref().update(up).then(function () {
      dizer(true, (velho ? "Cliente atualizado" : "Cliente salvo") + " · " + lotes.length + (lotes.length === 1 ? " lote na agenda." : " lotes na agenda."));
      edId = id; lotes = Object.keys(cli.lotes).map(function (k) { var l = cli.lotes[k]; return { qtd: l.qtd, prev: l.dataPrevisaoCliente, entregaId: l.entregaId }; });
    }).catch(function (e) { dizer(false, (e && /PERMISSION/.test(e.code || e.message) ? "Sem permissão para gravar." : "Não foi possível gravar.")); });
  }
  function aplicaLote(up, eid, base, bloco, e, kk) {
    Object.keys(base).forEach(function (k) { up["entregas/" + eid + "/" + k] = base[k]; });
    var ks = e.kits && typeof e.kits === "object" ? e.kits : {};
    Object.keys(ks).forEach(function (k) { if (k !== kk) up["entregas/" + eid + "/kits/" + k + "/ativo"] = false; });
    var ent = ks[kk] && ks[kk].qtdEntregue ? Math.min(ks[kk].qtdEntregue, bloco.qtdPedido) : 0;
    up["entregas/" + eid + "/kits/" + kk + "/ativo"] = true; up["entregas/" + eid + "/kits/" + kk + "/qtdPedido"] = bloco.qtdPedido; up["entregas/" + eid + "/kits/" + kk + "/qtdEntregue"] = ent;
    up["entregas/" + eid + "/kits/" + kk + "/valor"] = bloco.valor != null ? bloco.valor : null;
  }
  function excluir(id) {
    var c = CLI[id]; if (!c) return;
    var eids = Object.keys(ENT || {}).filter(function (k) { return ENT[k] && ENT[k].clienteId === id; });
    if (!window.confirm('Excluir o cliente "' + c.nome + '" e os ' + eids.length + " lote(s) dele na agenda? Outras entregas não são tocadas.")) return;
    var up = {}; up["clientes/" + id] = null; eids.forEach(function (k) { up["entregas/" + k] = null; });
    db().ref().update(up).then(function () { if (edId === id) novo(); }).catch(function () { alert("Não foi possível excluir."); });
  }

  app.addEventListener("input", function (ev) {
    var row = ev.target.closest && ev.target.closest(".cli-lote");
    if (row) { var i = +row.getAttribute("data-i"), f = ev.target.getAttribute("data-f"); if (lotes[i]) lotes[i][f] = ev.target.value; }
    calcula();
  });
  app.addEventListener("change", function (ev) { if (ev.target.id === "c-padrao" || ev.target.type === "date") { var row = ev.target.closest && ev.target.closest(".cli-lote"); if (row) lotes[+row.getAttribute("data-i")].prev = ev.target.value; calcula(); } });
  app.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t.id === "c-add-lote") { lotes.push({ qtd: "", prev: "" }); desenhaLotes(); return; }
    if (t.id === "c-salvar") { salvar(); return; }
    if (t.id === "c-novo") { novo(); return; }
    if (t.hasAttribute && t.hasAttribute("data-del")) { var i = +t.getAttribute("data-del"); if (lotes.length === 1 && !window.confirm("Excluir o único lote?")) return; lotes.splice(i, 1); desenhaLotes(); return; }
    if (t.hasAttribute && t.hasAttribute("data-ed")) { abrirEdicao(t.getAttribute("data-ed")); return; }
    if (t.hasAttribute && t.hasAttribute("data-ex")) { excluir(t.getAttribute("data-ex")); return; }
  });

  HGI.aoEntrar(function (s) {
    if (s.papel !== "total") { HGI.mostrarBloqueio("cliente"); return; }
    document.body.classList.add("hgi-ok");
    HGI.montarChrome("cliente");
    if (HGI.exemplo) { app.textContent = "Cadastro de Cliente não tem modo de exemplo."; return; }
    lotes = [{ qtd: "", prev: "" }];
    app.textContent = "Carregando…";
    db().ref("clientes").on("value", function (sn) { CLI = sn.val() || {}; render(); }, function () { app.textContent = "Sem permissão para ler os clientes."; });
    db().ref("entregas").on("value", function (sn) { ENT = sn.val() || {}; if (CLI !== null && !document.getElementById("c-nome")) render(); }, function () { ENT = {}; });
  });
  window.HGICliente = { ANTECIPACAO_DIAS: ANTECIPACAO_DIAS, dataAgenda: dataAgenda };
})();
