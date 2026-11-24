(function () {
  var calc = HGICalc, K = HGIKits;
  var sec = document.getElementById("resumo-emp-sec");
  if (!sec) return;
  var fontes = { entregas: null, empreendimentos: null, filaRomaneio: null, romaneios: null };
  var filtro = { cliente: "", tipo: "" };
  function pronto() { return Object.keys(fontes).every(function (k) { return fontes[k] !== null; }); }
  function render() {
    var lista = document.getElementById("re-lista"), tot = document.getElementById("re-tot");
    if (!pronto()) { lista.innerHTML = '<div class="re-vazio">Carregando…</div>'; return; }
    var todos = K.agrupar(fontes, {});
    var sel = document.getElementById("re-cliente"), atual = filtro.cliente;
    sel.innerHTML = '<option value="">Todos</option>' + todos.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }); })
      .map(function (g) { return '<option value="' + calc.esc(g.chave) + '"' + (g.chave === atual ? " selected" : "") + ">" + calc.esc(g.nome) + "</option>"; }).join("");
    if (atual && !todos.some(function (g) { return g.chave === atual; })) { filtro.cliente = ""; sel.value = ""; }
    var arr = K.agrupar(fontes, filtro), p = 0, e = 0;
    arr.forEach(function (g) { p += g.ped; e += g.ent; });
    tot.textContent = arr.length + (arr.length === 1 ? " empreendimento" : " empreendimentos") + " · pedido " + calc.formatQtd(p) + " · entregue " + calc.formatQtd(e) + " · saldo " + calc.formatQtd(p - e) + " kits";
    lista.innerHTML = K.htmlCards(arr);
  }
  var selT = document.getElementById("re-tipo");
  selT.innerHTML = '<option value="">Todos</option>' + [["eletrica", "Elétrico"], ["qdc", "QDC"], ["hidraulica", "Hidráulica (todos)"], ["hidraulica-agua-fria", "Hidráulica água fria"], ["hidraulica-agua-quente", "Hidráulica água quente"], ["hidraulica-esgoto", "Hidráulica esgoto"], ["gas", "Gás"]]
    .map(function (x) { return '<option value="' + x[0] + '">' + x[1] + "</option>"; }).join("");
  selT.addEventListener("change", function () { filtro.tipo = selT.value; render(); });
  document.getElementById("re-cliente").addEventListener("change", function (ev) { filtro.cliente = ev.target.value; render(); });

  HGI.aoEntrar(function (s) {
    var h2 = document.querySelector(".sec-fin");
    if (s.papel !== "total") { sec.hidden = true; if (h2) h2.hidden = true; return; }
    sec.hidden = false;
    if (HGI.exemplo) { document.getElementById("re-lista").innerHTML = '<div class="re-vazio">No exemplo visual o resumo não é montado: ele lê as obras reais da Agenda.</div>'; return; }
    Object.keys(fontes).forEach(function (k) {
      HGIDados.escutar(k, function (v) { fontes[k] = v || {}; render(); }, function () { fontes[k] = {}; render(); });
    });
    render();
  });
})();
