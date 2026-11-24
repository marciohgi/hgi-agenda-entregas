(function () {
  var calc = HGICalc;
  var app = document.getElementById("app");
  var emps = null, movs = null, roms = null;
  var semana = (function () {
    var s = "";
    try { s = sessionStorage.getItem("hgi-semana-vista") || ""; } catch (e) {}
    if (!calc.parseISO(s)) s = calc.segundaDe(calc.hojeSP());
    return calc.segundaDe(s);
  })();

  function gravarSemana(s) {
    semana = calc.segundaDe(s);
    try { sessionStorage.setItem("hgi-semana-vista", semana); } catch (e) {}
  }
  function base() {
    return calc.unirRomaneios(calc.entradas(movs), calc.entradas(roms));
  }
  function render() {
    if (emps === null || movs === null || roms === null) return;
    var hoje = calc.hojeSP();
    var dias = calc.diasDaSemana(semana);
    var atual = semana === calc.segundaDe(hoje);
    var lista = calc.entradas(emps);
    var periodo = calc.periodoAcumulado(lista, base(), dias[0], dias[6]);
    var html = "";
    if (HGI.exemplo) html += '<p class="aviso-exemplo">' + calc.esc(HGIDados.avisoExemplo()) + "</p>";
    html += '<div class="painel-semana' + (atual ? " atual" : "") + '"><div class="semana-nav">';
    html += '<button type="button" class="btn sec" data-nav="-1">◀</button>';
    html += '<button type="button" class="btn' + (atual ? " lar" : " sec") + '" data-nav="0">Esta semana</button>';
    html += '<button type="button" class="btn sec" data-nav="1">▶</button>';
    html += "<strong>" + calc.esc(calc.formatSemana(semana)) + "</strong>";
    if (atual) html += '<span class="selo-semana">Semana atual</span>';
    html += '<button type="button" class="btn lar" id="abrir-acumulado">Acumulado do mês</button>';
    if (!HGI.exemplo) html += '<button type="button" class="btn lar" id="gerar-rel-pdf">Gerar Relatório PDF</button>';
    html += "</div></div>";

    html += '<div class="cartoes">';
    html += card("Projetado na semana", periodo.temLancamento ? calc.formatBRL(periodo.totais.projecaoReais) : "", "R$", false);
    html += card("Projetado na semana", periodo.temLancamento ? calc.formatQtd(periodo.totais.projecaoQtd) : "", "quantidade · itens/apartamentos", false);
    html += card("Real na semana", periodo.temLancamento ? calc.formatBRL(periodo.totais.entregaReais) : "", "R$ · o que foi entregue" + pct(periodo.totais.entregaReais, periodo.totais.projecaoReais), true);
    html += card("Real na semana", periodo.temLancamento ? calc.formatQtd(periodo.totais.entregaQtd) : "", "quantidade · o que foi entregue" + pct(periodo.totais.entregaQtd, periodo.totais.projecaoQtd), true);
    html += card("Produzido na semana", periodo.temLancamento ? calc.formatBRL(periodo.totais.produzidoReais) : "", "R$", false);
    html += card("Produzido na semana", periodo.temLancamento ? calc.formatQtd(periodo.totais.produzidoQtd) : "", "quantidade", false);
    html += card("Romaneios na semana", periodo.temLancamento ? String(periodo.totais.romaneioN) : "", (periodo.temLancamento ? calc.formatQtd(periodo.totais.romaneioQtd) + " itens · " + calc.formatBRL(periodo.totais.romaneioReais) : "quantidade e R$"), false);
    html += "</div>";

    if (!periodo.temLancamento) {
      if (!HGI.exemplo) html += '<p class="nota"><a href="painel.html?exemplo=1">Ver exemplo visual</a></p>';
    } else {
      html += '<div class="bloco"><h2>Por empreendimento · R$</h2>' + svg(periodo.empreendimentos, "projetadoReais", "realReais", true) + "</div>";
      html += '<div class="bloco"><h2>Por empreendimento · quantidade</h2>' + svg(periodo.empreendimentos, "projetadoQtd", "realQtd", false) + "</div>";
    }

    html += '<div class="bloco"><h2>Produção da semana, dia a dia</h2><p class="nota">Cada dia mostra projeção, produção e entrega em quantidade e em R$. O dia de hoje fica destacado.</p>';
    html += '<div class="grade-wrap"><table class="grade"><thead><tr><th>Dia</th><th class="num">Projeção (qtd)</th><th class="num">Projeção (R$)</th><th class="num">Produzido (qtd)</th><th class="num">Produzido (R$)</th><th class="num">Real (qtd)</th><th class="num">Real (R$)</th></tr></thead><tbody>';
    var porDia = {};
    periodo.dias.forEach(function (d) { porDia[d.data] = d; });
    dias.forEach(function (iso) {
      var d = porDia[iso] || { projecaoQtd: 0, projecaoReais: 0, produzidoQtd: 0, produzidoReais: 0, entregaQtd: 0, entregaReais: 0 };
      html += '<tr class="' + (iso === hoje ? "hoje" : "") + '"><td>' + calc.esc(calc.nomeDiaCurto(iso)) + " " + calc.esc(calc.formatDataBR(iso)) + (iso === hoje ? " · hoje" : "") + "</td>";
      html += nums([d.projecaoQtd, d.projecaoReais, d.produzidoQtd, d.produzidoReais, d.entregaQtd, d.entregaReais], [0, 1, 0, 1, 0, 1], periodo.temLancamento);
      html += "</tr>";
    });
    html += "</tbody></table></div></div>";
    app.innerHTML = html;
    if (/(?:\?|&)modal=1(?:&|$)/.test(location.search)) abrirModal();
  }
  function pct(real, proj) {
    if (!proj) return "";
    return " · " + Math.round((real || 0) / proj * 100) + "% do projetado";
  }
  function card(rot, val, sub, real) {
    return '<article class="cartao' + (real ? " real" : "") + '"><div class="rot">' + calc.esc(rot) + '</div><div class="val">' + calc.esc(val === "—" ? "" : val) + '</div><div class="sub">' + calc.esc(sub) + "</div></article>";
  }
  function nums(vals, money, tem) {
    return vals.map(function (v, i) {
      var txt = tem ? (money[i] ? calc.formatBRL(v) : calc.formatQtd(v)) : "";
      if (txt === "—") txt = "";
      return '<td class="num">' + calc.esc(txt) + "</td>";
    }).join("");
  }
  function svg(emps, kProj, kReal, reais) {
    var linhas = emps.filter(function (e) { return e.teve || e[kProj] || e[kReal]; });
    if (!linhas.length) return '<p class="vazio">Sem valores neste recorte.</p>';
    var max = 1;
    linhas.forEach(function (e) { max = Math.max(max, e[kProj] || 0, e[kReal] || 0); });
    var w = 760, label = 200, right = 92, row = 52, h = linhas.length * row + 16;
    var bw = w - label - right;
    var out = '<div class="grafico"><svg viewBox="0 0 ' + w + " " + h + '" role="img">';
    out += '<rect width="' + w + '" height="' + h + '" fill="#fff"/>';
    linhas.forEach(function (e, i) {
      var y = 16 + i * row;
      out += '<text x="8" y="' + (y + 18) + '" font-size="12" fill="#1F2937">' + calc.esc(e.nome) + "</text>";
      [["#1E3A5F", e[kProj] || 0, y + 2], ["#E87731", e[kReal] || 0, y + 24]].forEach(function (b) {
        var larg = Math.max(0, (b[1] / max) * bw);
        if (larg > 0) out += '<rect x="' + label + '" y="' + b[2] + '" width="' + larg + '" height="16" rx="3" fill="' + b[0] + '"/>';
        var txt = reais ? calc.formatBRL(b[1]) : calc.formatQtd(b[1]);
        out += '<text x="' + (label + bw + 8) + '" y="' + (b[2] + 13) + '" font-size="12" fill="#1F2937">' + calc.esc(txt) + "</text>";
      });
    });
    out += "</svg></div>";
    out += '<div class="legenda"><span><i class="st" style="background:#1E3A5F;color:#fff">Projetado</i></span><span><i class="st" style="background:#E87731;color:#fff">Real</i></span></div>';
    return out;
  }
  function abrirModal() {
    var hoje = calc.hojeSP();
    var ini = calc.inicioMes(hoje);
    var periodo = calc.periodoAcumulado(calc.entradas(emps), base(), ini, hoje);
    var box = document.getElementById("corpo-acumulado");
    var tit = document.getElementById("tit-acumulado");
    tit.textContent = "Acumulado do mês · " + calc.formatDataBR(ini) + " a " + calc.formatDataBR(hoje);
    var html = "";
    if (HGI.exemplo) html += '<p class="aviso-exemplo">' + calc.esc(HGIDados.avisoExemplo()) + "</p>";
    html += '<div class="cartoes">';
    html += card("Projeção acumulada", calc.formatBRL(periodo.totais.projecaoReais), "R$ até hoje", false);
    html += card("Projeção acumulada", calc.formatQtd(periodo.totais.projecaoQtd), "quantidade até hoje", false);
    html += card("Produzido acumulado", calc.formatBRL(periodo.totais.produzidoReais), "R$", false);
    html += card("Produzido acumulado", calc.formatQtd(periodo.totais.produzidoQtd), "quantidade", false);
    html += card("Real acumulado", calc.formatBRL(periodo.totais.entregaReais), "R$ entregue", true);
    html += card("Romaneios no mês", String(periodo.totais.romaneioN), calc.formatQtd(periodo.totais.romaneioQtd) + " itens · " + calc.formatBRL(periodo.totais.romaneioReais), false);
    html += "</div>";
    html += "<h3>Por empreendimento</h3>";
    html += '<div class="grade-wrap"><table class="grade"><thead><tr><th>Empreendimento</th><th class="num">Projeção (qtd)</th><th class="num">Projeção (R$)</th><th class="num">Produzido (qtd)</th><th class="num">Produzido (R$)</th><th class="num">Real (qtd)</th><th class="num">Real (R$)</th><th class="num">Romaneios</th></tr></thead><tbody>';
    periodo.empreendimentos.forEach(function (e) {
      html += "<tr><td class=\"nome\">" + calc.esc(e.nome) + "</td>";
      html += nums([e.projetadoQtd, e.projetadoReais, e.produzidoQtd, e.produzidoReais, e.realQtd, e.realReais], [0, 1, 0, 1, 0, 1], true);
      html += '<td class="num">' + e.romaneioN + "</td></tr>";
    });
    html += "</tbody></table></div>";
    html += "<h3>Dia a dia, do início do mês até hoje</h3><p class=\"nota\">Em cada dia: o que foi produzido, os romaneios lançados e a projeção acumulada até aquele dia. Quantidade e R$ andam juntos.</p>";
    html += '<div class="grade-wrap"><table class="grade"><thead><tr><th>Dia</th><th class="num">Produzido no dia (qtd)</th><th class="num">Produzido no dia (R$)</th><th class="num">Produzido acumulado (qtd)</th><th class="num">Produzido acumulado (R$)</th><th class="num">Romaneios no dia</th><th class="num">Romaneios no dia (qtd)</th><th class="num">Romaneios no dia (R$)</th><th class="num">Romaneios acumulados (qtd)</th><th class="num">Romaneios acumulados (R$)</th><th class="num">Projeção do dia (qtd)</th><th class="num">Projeção do dia (R$)</th><th class="num">Projeção acumulada (qtd)</th><th class="num">Projeção acumulada (R$)</th></tr></thead><tbody>';
    periodo.dias.forEach(function (d) {
      html += '<tr class="' + (d.data === hoje ? "hoje" : "") + '"><td>' + calc.esc(calc.formatDataBR(d.data)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatQtd(d.produzidoQtd)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatBRL(d.produzidoReais)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatQtd(d.produzidoAcumuladoQtd)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatBRL(d.produzidoAcumuladoReais)) + "</td>";
      html += '<td class="num">' + d.romaneioN + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatQtd(d.romaneioQtd)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatBRL(d.romaneioReais)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatQtd(d.romaneioAcumuladoQtd)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatBRL(d.romaneioAcumuladoReais)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatQtd(d.projecaoQtd)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatBRL(d.projecaoReais)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatQtd(d.projecaoAcumuladaQtd)) + "</td>";
      html += '<td class="num">' + calc.esc(calc.formatBRL(d.projecaoAcumuladaReais)) + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    box.innerHTML = html;
    document.getElementById("ov-acumulado").classList.add("on");
    document.getElementById("ov-acumulado").hidden = false;
  }
  function fechar() {
    var ov = document.getElementById("ov-acumulado");
    ov.classList.remove("on");
    ov.hidden = true;
  }
  app.addEventListener("click", function (ev) {
    if (ev.target.id === "abrir-acumulado") { abrirModal(); return; }
    if (ev.target.id === "gerar-rel-pdf") {
      var bt = ev.target; bt.disabled = true;
      HGIRel.abrirGeral(semana).catch(function () { alert("Não foi possível ler os dados para o relatório."); }).then(function () { bt.disabled = false; });
      return;
    }
    if (ev.target.hasAttribute("data-nav")) {
      var nav = ev.target.getAttribute("data-nav");
      if (nav === "0") gravarSemana(calc.hojeSP());
      else gravarSemana(calc.somarDias(semana, Number(nav) * 7));
      render();
    }
  });
  document.getElementById("fechar-acumulado").onclick = fechar;
  document.getElementById("ov-acumulado").addEventListener("click", function (e) { if (e.target.id === "ov-acumulado") fechar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fechar(); });

  HGI.aoEntrar(function (s) {
    if (s.papel !== "total") { HGI.mostrarBloqueio("painel"); return; }
    document.body.classList.add("hgi-ok");
    HGI.montarChrome("painel");
    app.textContent = "Carregando…";
    var negou = function () { app.textContent = "Sem permissão para ler o painel."; };
    var pintar = HGI.agendarRender(app, render);
    function mostrar() { if (emps !== null && movs !== null && roms !== null) pintar(); }
    HGIDados.escutar("empreendimentos", function (v) { emps = v || {}; mostrar(); }, negou);
    HGIDados.escutar("producao", function (v) { movs = v || {}; mostrar(); }, negou);
    HGIDados.escutar("romaneios", function (v) { roms = v || {}; mostrar(); }, negou);
  });
})();
