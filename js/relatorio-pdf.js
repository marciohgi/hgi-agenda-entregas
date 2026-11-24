/* Relatório imprimível (salvar como PDF pelo navegador). Só papel total. Preto, branco e laranja. */
(function () {
  var calc = window.HGICalc;
  var esc = calc.esc;
  function agora() {
    try { return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date()) + " (horário de Brasília)"; }
    catch (e) { return new Date().toLocaleString("pt-BR"); }
  }
  function estilo() {
    if (document.getElementById("hgi-rel-css")) return;
    var st = document.createElement("style"); st.id = "hgi-rel-css";
    st.textContent = [
      "#hgi-rel{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);overflow:auto;padding:16px}",
      "#hgi-rel .hr-barra{max-width:900px;margin:0 auto 10px;display:flex;gap:8px;justify-content:flex-end}",
      "#hgi-rel .hr-barra button{font:inherit;font-weight:800;border-radius:6px;padding:9px 14px;cursor:pointer;border:2px solid #E87731}",
      "#hgi-rel .hr-2{grid-template-columns:1fr 1fr!important}#hgi-rel .hr-3{grid-template-columns:repeat(3,1fr)!important}#hgi-rel .hr-kpis b{display:block;min-height:1.2em}#hgi-rel .hr-meta{font-size:11px;color:#666;margin:2px 0 6px}#hgi-rel .hr-sem{border:1px solid #E87731;border-left:6px solid #E87731;padding:8px 10px;margin:8px 0 4px;font-size:12px;line-height:1.5}#hgi-rel .hr-sem a{color:#b4530f;font-weight:700}#hgi-rel .hr-sem ul{margin:4px 0 0 18px;padding:0;columns:2}" +
      "#hgi-rel .hr-imp{background:#E87731;color:#111}#hgi-rel .hr-fec{background:#111;color:#fff}",
      ".hr-folha{max-width:900px;margin:0 auto;background:#fff;color:#111;font-family:'Segoe UI',Arial,sans-serif;font-size:12px;padding:22px 26px;border-radius:6px}",
      ".hr-cab{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #E87731;padding-bottom:8px;margin-bottom:12px;gap:12px}",
      ".hr-cab h1{margin:0;font-size:20px}.hr-cab .hr-marca{font-weight:900;font-size:14px;letter-spacing:.5px}.hr-cab .hr-marca b{color:#E87731}",
      ".hr-cab .hr-dir{text-align:right;font-size:11px}.hr-int{display:inline-block;background:#111;color:#fff;font-weight:800;padding:2px 8px;border-radius:4px;margin-bottom:4px;letter-spacing:.5px}",
      ".hr-folha h2{font-size:14px;margin:16px 0 6px;padding:4px 8px;background:#111;color:#fff;border-left:5px solid #E87731}",
      ".hr-fonte{font-size:10.5px;color:#444;margin:0 0 6px}",
      ".hr-folha table{width:100%;border-collapse:collapse;margin:4px 0 6px}",
      ".hr-folha th{background:#111;color:#fff;text-align:left;padding:5px 6px;font-size:11px}",
      ".hr-folha td{border-bottom:1px solid #ddd;padding:4px 6px;font-size:11.5px}",
      ".hr-folha td.n,.hr-folha th.n{text-align:right;white-space:nowrap}",
      ".hr-folha tr.tot td{font-weight:800;border-top:2px solid #111}",
      ".hr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0}",
      ".hr-kpis div{border:1px solid #111;border-radius:6px;padding:6px 8px}.hr-kpis div.lar{border-color:#E87731;border-width:2px}",
      ".hr-kpis span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#444}.hr-kpis b{font-size:15px}",
      ".hr-nota{font-size:10.5px;color:#444;margin:4px 0}.hr-alerta{color:#b85a1c;font-weight:700}",
      ".hr-rod{margin-top:16px;border-top:1px solid #111;padding-top:6px;font-size:10px;color:#444}",
      "@media print{@page{size:A4;margin:12mm}html.hgi-rel-on body>*:not(#hgi-rel){display:none!important}html.hgi-rel-on body{background:#fff!important}",
      "#hgi-rel{position:static!important;background:none!important;padding:0!important;overflow:visible!important}#hgi-rel .hr-barra{display:none!important}",
      ".hr-folha{max-width:none;padding:0;border-radius:0}.hr-folha h2,.hr-folha th,.hr-int{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr{break-inside:avoid}}"
    ].join("\n");
    document.head.appendChild(st);
  }
  function abrir(titulo, corpo) {
    estilo();
    var old = document.getElementById("hgi-rel"); if (old) old.remove();
    var ov = document.createElement("div"); ov.id = "hgi-rel";
    ov.innerHTML = '<div class="hr-barra"><button type="button" class="hr-imp">Imprimir / salvar PDF</button><button type="button" class="hr-fec">Fechar</button></div>' +
      '<div class="hr-folha"><div class="hr-cab"><div><div class="hr-marca">GRUPO <b>HGI</b></div><h1>' + esc(titulo) + '</h1></div><div class="hr-dir"><span class="hr-int">USO INTERNO</span><br>Emitido em ' + esc(agora()) + '<br>Emitido por: ' + esc((window.HGI && HGI.sessao && (HGI.sessao.setor || HGI.sessao.nome)) || "") + '</div></div>' +
      corpo + '<div class="hr-rod">Grupo HGI · uso interno · não comentar nem prometer a cliente.</div></div>';
    document.body.appendChild(ov);
    document.documentElement.classList.add("hgi-rel-on");
    var prevTitle = document.title;
    ov.querySelector(".hr-imp").onclick = function () { document.title = titulo; window.print(); document.title = prevTitle; };
    ov.querySelector(".hr-fec").onclick = function () { ov.remove(); document.documentElement.classList.remove("hgi-rel-on"); };
    return ov;
  }
  function base() { return location.origin + location.pathname.replace(/[^\/]*$/, ""); }
  function lnkEd(id) { return base() + "index.html?obra=" + encodeURIComponent(id) + "&editar=1"; }
  function comoLancar() { return 'Lance o valor do kit em <b>✎ Editar obra</b> (Agenda, blocos de kit) ou em <a href="' + base() + 'financeiro.html#emp-nome">Financeiro dos kits</a> (só elétrico e QDC; o nome precisa ser igual ao da obra).'; }
  function q(n) { return n === null || n === undefined ? "" : calc.formatQtd(n); }
  /* Relatório geral (Painel e Resumo por Empreendimento). */
  function geral(fontes, semanaIni, hoje) {
    var K = HGIKits, X = HGIKitsExtra, m = X.moeda;
    var r = X.semana(fontes, semanaIni, hoje), t = X.porTipo(fontes), arr = K.agrupar(fontes, {});
    var h = "";
    h += "<h2>1. Projeção da semana · " + esc(calc.formatSemana(semanaIni)) + "</h2>";
    h += '<p class="hr-fonte">Fonte: /entregas (obras e blocos de kit lançados na Agenda). Preço: valor do kit na obra; sem ele, preço do Financeiro (só elétrico e QDC).</p>';
    h += '<div class="hr-kpis hr-2"><div><span>Projetado pra entregar</span><b>' + m(r.proj) + '</b></div><div class="lar"><span>Real entregue na semana</span><b>' + m(r.real) + '</b></div></div>';
    var vz = function (n) { return n ? q(n) : ""; };
    h += '<div class="hr-kpis hr-3"><div class="lar"><span>Meta (50/dia × ' + r.dias + ' dias úteis)</span><b>' + (r.dias ? q(r.meta) : "") + '</b></div><div><span>Programado</span><b>' + vz(r.pQ) + '</b></div><div><span>Entregue</span><b>' + vz(r.rQ) + '</b></div></div>';
    var DEP = { "eletrica": "Elétrica", "qdc": "QDC", "hidraulica-agua-fria": "Água fria", "hidraulica-agua-quente": "Água quente", "hidraulica-esgoto": "Esgoto", "gas": "Gás" }, linhasDep = "";
    K.LINHAS.forEach(function (ln) { var T = r.tipos[ln.id]; if (!T || !(T.n || T.rq)) return; var pv = T.cv ? T.v : null, rv = T.crv ? T.rv : (pv !== null ? 0 : null);
      linhasDep += "<tr><td>" + esc(DEP[ln.id] || ln.rot) + '</td><td class="n">' + vz(T.q) + '</td><td class="n">' + m(pv) + '</td><td class="n">' + m(rv) + "</td></tr>"; });
    if (linhasDep) h += '<table><thead><tr><th>Departamento</th><th class="n">Aptos/kits</th><th class="n">Projetado</th><th class="n">Real</th></tr></thead><tbody>' + linhasDep + '<tr class="tot"><td>Total</td><td class="n">' + vz(r.pQ) + '</td><td class="n">' + m(r.proj) + '</td><td class="n">' + m(r.real) + "</td></tr></tbody></table>";
    h += "<h2>2. Kits por tipo · todas as obras</h2>";
    h += '<p class="hr-fonte">Fonte: /entregas (blocos de kit). Obras antigas sem bloco usam o tipo e a quantidade da própria obra.</p>';
    h += '<table><thead><tr><th>Tipo</th><th class="n">Blocos</th><th class="n">Pedido</th><th class="n">Saldo do pedido</th><th class="n">R$ pedido</th><th class="n">R$ entregue</th><th class="n">R$ saldo</th></tr></thead><tbody>';
    var tt = { n: 0, ped: 0, ent: 0, vPed: 0, vEnt: 0, com: 0, sem: 0 };
    K.LINHAS.forEach(function (ln) {
      var x = t[ln.id]; tt.n += x.n; tt.ped += x.ped; tt.ent += x.ent; tt.vPed += x.vPed; tt.vEnt += x.vEnt; tt.com += x.comValor; tt.sem += x.semValor + x.semQtd;
      var cv = x.comValor > 0;
      h += "<tr><td>" + esc(x.rot) + '</td><td class="n">' + x.n + '</td><td class="n">' + q(x.ped) + '</td><td class="n">' + q(x.ped - x.ent) + '</td><td class="n">' + (cv ? m(x.vPed) : "") + '</td><td class="n">' + (cv ? m(x.vEnt) : "") + '</td><td class="n">' + (cv ? m(x.vPed - x.vEnt) : "") + "</td></tr>";
    });
    h += '<tr class="tot"><td>Total (kits)</td><td class="n">' + tt.n + '</td><td class="n">' + q(tt.ped) + '</td><td class="n">' + q(tt.ped - tt.ent) + '</td><td class="n">' + (tt.com ? m(tt.vPed) : "") + '</td><td class="n">' + (tt.com ? m(tt.vEnt) : "") + '</td><td class="n">' + (tt.com ? m(tt.vPed - tt.vEnt) : "") + "</td></tr></tbody></table>";

    h += "<h2>3. Resumo por empreendimento · todos</h2>";
    h += '<p class="hr-fonte">Fonte: /entregas, mais os nomes de /empreendimentos e do romaneio. Nomes iguais sem diferença de maiúscula ou acento são juntados.</p>';
    h += '<table><thead><tr><th>Empreendimento</th><th class="n">Lanç.</th><th class="n">Pedido</th><th class="n">Saldo do pedido</th><th>Por tipo (pedido · saldo)</th></tr></thead><tbody>';
    var sp = 0, se = 0;
    arr.forEach(function (g) {
      sp += g.ped; se += g.ent;
      var tps = Object.keys(g.tipos).map(function (k) { var x = g.tipos[k]; return esc(x.rot.replace("Hidráulica ", "H. ")) + " " + x.ped + " · saldo " + (x.ped - x.ent); }).join(" · ");
      if (!g.n) tps = "";
      h += "<tr><td>" + esc(g.nome) + '</td><td class="n">' + g.n + '</td><td class="n">' + q(g.ped) + '</td><td class="n">' + q(g.saldo) + "</td><td>" + tps + "</td></tr>";
    });
    h += '<tr class="tot"><td>' + arr.length + ' empreendimentos</td><td></td><td class="n">' + q(sp) + '</td><td class="n">' + q(sp - se) + "</td><td></td></tr></tbody></table>";

    h += "<h2>4. Lançamentos do Financeiro na semana</h2>";
    h += '<p class="hr-fonte">Fonte: /producao (aba Resumo por Empreendimento → Lançar quantidade). É o que alimenta os cartões e gráficos da aba Painel.</p>';
    var dias = calc.diasDaSemana(semanaIni);
    var per = calc.periodoAcumulado(calc.entradas(fontes.empreendimentos), calc.unirRomaneios(calc.entradas(fontes.producao), calc.entradas(fontes.romaneios)), dias[0], dias[6]);
    if (!per.temLancamento) h += '<p class="hr-nota">Nenhum lançamento nesta semana.</p>';
    else {
      var T = per.totais;
      h += '<table><thead><tr><th></th><th class="n">Quantidade</th><th class="n">R$</th></tr></thead><tbody>';
      h += '<tr><td>Projeção</td><td class="n">' + q(T.projecaoQtd) + '</td><td class="n">' + m(T.projecaoReais) + "</td></tr>";
      h += '<tr><td>Produzido</td><td class="n">' + q(T.produzidoQtd) + '</td><td class="n">' + m(T.produzidoReais) + "</td></tr>";
      h += '<tr><td>Entrega (real)</td><td class="n">' + q(T.entregaQtd) + '</td><td class="n">' + m(T.entregaReais) + "</td></tr>";
      h += '<tr><td>Romaneios (' + T.romaneioN + ')</td><td class="n">' + q(T.romaneioQtd) + '</td><td class="n">' + m(T.romaneioReais) + "</td></tr></tbody></table>";
    }
    return h;
  }
  /* Busca os nós e abre o relatório geral. */
  function abrirGeral(semanaIni) {
    var nos = ["entregas", "empreendimentos", "filaRomaneio", "romaneios", "producao"], fontes = {};
    return Promise.all(nos.map(function (n) { return firebase.database().ref(n).once("value").then(function (s) { fontes[n] = s.val() || {}; }); }))
      .then(function () { return abrir("Relatório de kits, empreendimentos e projeção da semana", geral(fontes, semanaIni, calc.hojeSP())); });
  }
  /* Relatório de uma obra. dados: {o, id, emps, producao} */
  function obra(d) {
    var K = HGIKits, X = HGIKitsExtra, m = X.moeda, o = d.o || {}, ks = K.kitsDe(o), mapa = X.mapaEmps(d.emps);
    var df = function (t) { return /^\d{4}-\d{2}-\d{2}$/.test(t || "") ? calc.formatDataBR(t) : ""; };
    var h = "<h2>Obra</h2><table><tbody>";
    h += "<tr><td>Empreendimento / obra</td><td><b>" + esc(o.nome || d.id) + "</b></td></tr>";
    h += "<tr><td>Status</td><td>" + esc(o.status || o.statusCodigo || "") + "</td></tr>";
    h += "<tr><td>Estágio</td><td>" + esc(o.etapa ? String(o.etapa) : "") + "</td></tr>";
    h += "<tr><td>Padrão</td><td>" + esc(o.padrao || "") + "</td></tr>";
    h += "<tr><td>Quantidade de aptos (agenda)</td><td>" + q(X.qnum(o) || null) + "</td></tr>";
    h += "<tr><td>Previsão de entrega</td><td>" + df(o.data) + "</td></tr>";
    h += "<tr><td>Entrou na produção</td><td>" + df(o.entrouProducao) + "</td></tr>";
    h += "<tr><td>Próximo lote</td><td>" + df(o.proximoLoteData) + "</td></tr>";
    h += "<tr><td>Conclusão (embarque)</td><td>" + df(X.dataFinal(o)) + "</td></tr>";
    h += "</tbody></table>";
    h += "<h2>Kits por tipo</h2><p class=\"hr-fonte\">Fonte: /entregas (blocos de kit desta obra).</p>";
    h += '<table><thead><tr><th>Tipo</th><th class="n">Valor do kit</th><th class="n">Pedido</th><th class="n">Saldo do pedido</th><th class="n">R$ pedido</th><th class="n">R$ entregue</th><th class="n">R$ saldo</th></tr></thead><tbody>';
    var sp = 0, se = 0, temV = false, semV = 0;
    Object.keys(ks).forEach(function (k) {
      var b = ks[k], v = X.precoKit(o, b, mapa), ped = b.qtdPedido, en = b.qtdEntregue || 0, sal = ped === null ? null : ped - en;
      if (v === null) semV++; else if (ped !== null) { temV = true; sp += v * ped; se += v * en; }
      h += "<tr><td>" + esc(b.rot) + (b.valor === null && v !== null ? " <small>(preço do Financeiro)</small>" : "") + '</td><td class="n">' + m(v) + '</td><td class="n">' + q(ped) + '</td><td class="n">' + q(sal) + '</td><td class="n">' + (v !== null && ped !== null ? m(v * ped) : "") + '</td><td class="n">' + (v !== null ? m(v * en) : "") + '</td><td class="n">' + (v !== null && sal !== null ? m(v * sal) : "") + "</td></tr>";
    });
    if (!Object.keys(ks).length) h += '<tr><td colspan="7">Nenhum bloco de kit (hidráulica sem ramal ou kits excluídos).</td></tr>';
    h += "</tbody></table>";
    var vp = X.numV(o.valorProjetado), vr = X.numV(o.valorReal);
    var proj = vp !== null ? vp : (temV ? sp : null), real = vr !== null ? vr : (temV ? se : null);
    var dif = proj !== null && real !== null ? real - proj : null, pct = dif !== null && proj > 0 ? real / proj * 100 : null;
    h += "<h2>Valores da obra</h2>";
    h += '<div class="hr-kpis"><div><span>Valor projetado</span><b>' + m(proj) + '</b></div><div class="lar"><span>Valor real</span><b>' + m(real) + '</b></div><div><span>Diferença (real − projetado)</span><b>' + (dif === null ? "" : (dif > 0 ? "+" : "") + m(dif)) + '</b></div><div><span>% realizado</span><b>' + X.pctTxt(pct) + "</b></div></div>";
    var ps = X.parciais(o);
    h += "<h2>Entregas parciais</h2>";
    if (!ps.length) h += '<p class="hr-nota">Nenhuma entrega parcial lançada.</p>';
    else {
      h += '<table><thead><tr><th>Data</th><th class="n">Lote</th><th class="n">Quantidade</th></tr></thead><tbody>';
      var tq = 0; ps.forEach(function (p) { tq += p.qtd; h += "<tr><td>" + df(p.data) + '</td><td class="n">' + (p.lote || "") + '</td><td class="n">' + q(p.qtd) + "</td></tr>"; });
      h += '<tr class="tot"><td>Total</td><td></td><td class="n">' + q(tq) + "</td></tr></tbody></table>";
    }
    h += "<h2>Lançamentos do Financeiro (/producao)</h2>";
    var chave = K.chaveNome(o.nome), idsEmp = Object.keys(d.emps || {}).filter(function (k) { return d.emps[k] && K.chaveNome(d.emps[k].nome) === chave; });
    var movs = Object.keys(d.producao || {}).map(function (k) { return Object.assign({ id: k }, d.producao[k]); }).filter(function (x) { return idsEmp.indexOf(x.empreendimentoId) >= 0; })
      .sort(function (a, b) { return (a.data || "").localeCompare(b.data || ""); });
    if (!idsEmp.length) h += '<p class="hr-nota">Esta obra não tem cadastro com o mesmo nome no Financeiro, então não há lançamentos ligados a ela.</p>';
    else if (!movs.length) h += '<p class="hr-nota">Cadastro encontrado no Financeiro, sem lançamentos.</p>';
    else {
      h += '<table><thead><tr><th>Data</th><th>Tipo</th><th class="n">Quantidade</th><th class="n">R$</th><th>Lançado por</th></tr></thead><tbody>';
      movs.forEach(function (x) { h += "<tr><td>" + df(x.data) + "</td><td>" + esc(x.tipo === "entrega" ? "Entrega" : x.tipo === "produzido" ? "Produzido" : "Projeção") + '</td><td class="n">' + q(x.qtd) + '</td><td class="n">' + m(X.numV(x.valorTotal)) + "</td><td>" + esc(x.lancadoPorNome || "") + "</td></tr>"; });
      h += "</tbody></table>";
    }
    return h;
  }
  window.HGIRel = { abrir: abrir, abrirGeral: abrirGeral, geral: geral, obra: obra };
})();
