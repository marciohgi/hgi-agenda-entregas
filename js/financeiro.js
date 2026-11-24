(function () {
  var calc = HGICalc;
  var app = document.getElementById("app");
  var emps = null, movs = null;
  var semana = lerSemana();
  var movPendente = null;

  function lerSemana() {
    var s = "";
    try { s = sessionStorage.getItem("hgi-semana-vista") || ""; } catch (e) {}
    if (!calc.parseISO(s)) s = calc.segundaDe(calc.hojeSP());
    return calc.segundaDe(s);
  }
  function gravarSemana(s) {
    semana = s;
    try { sessionStorage.setItem("hgi-semana-vista", s); } catch (e) {}
  }
  function arrEmps() {
    return calc.entradas(emps).sort(function (a, b) { return (a.nome || "").localeCompare(b.nome || "", "pt"); });
  }
  function arrMovs() {
    return calc.entradas(movs).sort(function (a, b) { return (b.data || "").localeCompare(a.data || "") || ((b.criadoEm || 0) - (a.criadoEm || 0)); });
  }
  function render() {
    if (emps === null || movs === null) return;
    var dias = calc.diasDaSemana(semana);
    var hoje = calc.hojeSP();
    var atual = semana === calc.segundaDe(hoje);
    var linhas = calc.linhasFinanceiras(arrEmps(), arrMovs(), dias[0], dias[6]);
    var html = "";
    if (HGI.exemplo) html += '<p class="aviso-exemplo">' + calc.esc(HGIDados.avisoExemplo()) + " A obra pendente está de propósito sem valor e sem quantidade.</p>";
    html += '<div class="painel-semana' + (atual ? " atual" : "") + '"><div class="semana-nav">';
    html += '<button type="button" class="btn sec" data-nav="-1">◀ Semana anterior</button>';
    html += '<button type="button" class="btn sec" data-nav="0">Esta semana</button>';
    html += '<button type="button" class="btn sec" data-nav="1">Próxima semana ▶</button>';
    html += "<strong>" + calc.esc(calc.formatSemana(semana)) + "</strong>";
    if (atual) html += '<span class="selo-semana">Semana atual</span>';
    html += "</div><p class=\"nota\">Valor projetado da semana = quantidade projetada × (kit elétrico + kit QDC). Valor real = o que foi entregue na semana, nos mesmos dois níveis: quantidade e R$.</p></div>";

    html += '<div class="bloco"><h2>Empreendimento</h2><p class="nota">Zé é quem normalmente lança valor, quantidade e entrega. Qualquer acesso total pode lançar, e o registro guarda o nome de quem salvou.</p>';
    html += '<div class="form-grid">';
    html += '<label class="full">Obra<select id="emp-sel"><option value="">— nova obra —</option>';
    arrEmps().forEach(function (e) { html += '<option value="' + calc.esc(e.id) + '">' + calc.esc(e.nome || e.id) + "</option>"; });
    html += '</select></label>';
    html += '<label>Nome da obra<input id="emp-nome" maxlength="120" placeholder="Ex.: Residencial da fábrica"></label>';
    html += '<label>Valor kit elétrico<input id="emp-ve" inputmode="decimal" placeholder="em branco se não houver"></label>';
    html += '<label>Valor kit QDC<input id="emp-vq" inputmode="decimal" placeholder="em branco se não houver"></label>';
    html += '<label>Qtd total contratada<input id="emp-qtd" inputmode="decimal" placeholder="itens / aptos"></label>';
    html += '</div><div class="form-acoes"><button type="button" class="btn lar" id="emp-salvar">Salvar obra</button><span class="hgi-okmsg" id="msg-emp"></span><span class="hgi-erro" id="erro-emp"></span></div></div>';

    html += '<div class="grade-wrap"><table class="grade"><thead><tr>';
    ["Empreendimento", "Valor kit elétrico", "Valor kit QDC", "Qtd contratada", "Qtd entregue", "Saldo", "Qtd projetada da semana", "Valor projetado da semana", "Qtd real da semana", "Valor real da semana", "Lançado por"].forEach(function (h, i) {
      html += '<th' + (i ? ' class="num"' : "") + ">" + h + "</th>";
    });
    html += "</tr></thead><tbody>";
    if (!linhas.length) {
      html += '<tr><td colspan="11" class="vazio">Nenhuma obra cadastrada.</td></tr>';
    }
    linhas.forEach(function (l) {
      var saldoCls = l.saldo !== null && l.saldo < 0 ? "neg" : "";
      html += "<tr>";
      html += '<td class="nome">' + calc.esc(l.nome) + (l.id.indexOf("ex-") === 0 ? '<span class="badge-ex">EXEMPLO</span>' : "") + "</td>";
      html += td(calc.formatBRL(l.valorKitEletrico));
      html += td(calc.formatBRL(l.valorKitQdc));
      html += td(calc.formatQtd(l.qtdContratada));
      html += td(calc.formatQtd(l.qtdEntregue));
      html += '<td class="num ' + saldoCls + '">' + calc.esc(vz(calc.formatQtd(l.saldo))) + "</td>";
      html += td(calc.formatQtd(l.qtdProjetadaSemana));
      html += td(calc.formatBRL(l.valorProjetadoSemana));
      html += td(calc.formatQtd(l.qtdRealSemana));
      html += td(calc.formatBRL(l.valorRealSemana));
      html += "<td class=\"quem\">lançado por: " + calc.esc(l.lancadoPorNome || "") + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table></div>";

    html += '<div class="bloco"><h2>Lançar quantidade</h2><p class="nota">Entrega alimenta o valor real. Produção é o que foi produzido. Projeção é o que estava previsto naquele dia. Os três entram no acumulado do mês, em quantidade e em R$.</p>';
    html += '<div class="form-grid">';
    html += '<label>Tipo<select id="mov-tipo"><option value="entrega">Entrega (real)</option><option value="produzido">Produzido</option><option value="projecao">Projeção</option></select></label>';
    html += '<label>Obra<select id="mov-emp"><option value="">Escolha</option>';
    arrEmps().forEach(function (e) { html += '<option value="' + calc.esc(e.id) + '">' + calc.esc(e.nome || e.id) + "</option>"; });
    html += '</select></label>';
    html += '<label>Data<input id="mov-data" type="date" value="' + calc.esc(hoje) + '"></label>';
    html += '<label>Quantidade<input id="mov-qtd" inputmode="decimal" placeholder="itens / aptos"></label>';
    html += '</div><div class="form-acoes"><button type="button" class="btn" id="mov-salvar">Lançar</button><span class="hgi-okmsg" id="msg-mov"></span><span class="hgi-erro" id="erro-mov"></span></div>';
    html += '<div class="lista-lanc" id="lista-mov">';
    var recentes = arrMovs().slice(0, 12);
    if (!recentes.length) html += '<p class="vazio">Nenhum lançamento.</p>';
    recentes.forEach(function (m) {
      var emp = (emps && emps[m.empreendimentoId]) || {};
      var rot = m.tipo === "entrega" ? "Entrega" : (m.tipo === "produzido" ? "Produzido" : "Projeção");
      html += '<div class="item"><span>' + calc.esc(calc.formatDataBR(m.data)) + " · " + calc.esc(rot) + " · " + calc.esc(emp.nome || "Obra") + " · " + calc.esc(calc.formatQtd(m.qtd)) + ' <span class="quem">lançado por: ' + calc.esc(m.lancadoPorNome || "—") + "</span></span>";
      html += '<button type="button" class="btn verm" data-del="' + calc.esc(m.id) + '">Excluir</button></div>';
    });
    html += "</div></div>";
    if (!HGI.exemplo && !linhas.length) html += '<p><a href="financeiro.html?exemplo=1">Ver exemplo visual</a> — números fictícios, rotulados, fora do banco.</p>';
    app.innerHTML = html;
    if (location.hash === "#emp-nome" && !render.foiHash) { render.foiHash = true; var en = document.getElementById("emp-nome"); if (en) setTimeout(function () { en.scrollIntoView({ block: "center" }); en.focus(); }, 50); }
    var sel = document.getElementById("emp-sel");
    sel.addEventListener("change", function () {
      var e = emps[sel.value];
      document.getElementById("emp-nome").value = e ? (e.nome || "") : "";
      document.getElementById("emp-ve").value = e && e.valorKitEletrico != null ? e.valorKitEletrico : "";
      document.getElementById("emp-vq").value = e && e.valorKitQdc != null ? e.valorKitQdc : "";
      document.getElementById("emp-qtd").value = e && e.qtdContratada != null ? e.qtdContratada : "";
    });
  }
  function vz(t) { return t === "—" ? "" : t; }
  function td(texto) { return '<td class="num">' + calc.esc(vz(texto)) + "</td>"; }
  function dizer(id, ok, texto) {
    var a = document.getElementById(ok ? "msg-" + id : "erro-" + id);
    var b = document.getElementById(ok ? "erro-" + id : "msg-" + id);
    if (a) a.textContent = texto;
    if (b) b.textContent = "";
  }
  app.addEventListener("click", function (ev) {
    var nav = ev.target.getAttribute && ev.target.getAttribute("data-nav");
    if (nav !== null && nav !== undefined && ev.target.hasAttribute("data-nav")) {
      if (nav === "0") gravarSemana(calc.segundaDe(calc.hojeSP()));
      else gravarSemana(calc.somarDias(semana, Number(nav) * 7));
      render();
      return;
    }
    if (ev.target.id === "emp-salvar") {
      var nome = document.getElementById("emp-nome").value.trim();
      if (!nome) { dizer("emp", false, "Informe o nome da obra."); return; }
      var sel = document.getElementById("emp-sel").value;
      var id = sel || HGIDados.novoId("empreendimentos");
      ev.target.disabled = true;
      HGIDados.salvarEmpreendimento(id, {
        nome: nome,
        valorKitEletrico: document.getElementById("emp-ve").value,
        valorKitQdc: document.getElementById("emp-vq").value,
        qtdContratada: document.getElementById("emp-qtd").value
      }, !sel).then(function () {
        ev.target.disabled = false;
        dizer("emp", true, "Obra salva. lançado por: " + (HGI.sessao.setor || HGI.sessao.nome || "") + ". Ela entra na fila de romaneio sem os valores.");
      }).catch(function (e) { ev.target.disabled = false; dizer("emp", false, HGIDados.falha(e)); });
      return;
    }
    if (ev.target.id === "mov-salvar") {
      var emp = document.getElementById("mov-emp").value;
      var data = document.getElementById("mov-data").value;
      var qtd = calc.numOrNull(document.getElementById("mov-qtd").value);
      if (!emp) { dizer("mov", false, "Escolha a obra."); return; }
      if (!calc.parseISO(data)) { dizer("mov", false, "Informe a data."); return; }
      if (qtd === null || qtd < 0) { dizer("mov", false, qtd === null && String(document.getElementById("mov-qtd").value).trim() ? "A quantidade não é um número válido." : "Informe a quantidade."); return; }
      if (!movPendente) movPendente = { id: HGIDados.novoId("producao"), criadoEm: Date.now() };
      ev.target.disabled = true;
      HGIDados.salvarMovimento(movPendente.id, {
        tipo: document.getElementById("mov-tipo").value,
        empreendimentoId: emp,
        data: data,
        qtd: qtd,
        criadoEm: movPendente.criadoEm,
        emp: emps[emp] || {}
      }).then(function () {
        movPendente = null;
        ev.target.disabled = false;
        dizer("mov", true, "lançado por: " + (HGI.sessao.setor || HGI.sessao.nome || "") + ".");
      }).catch(function (e) { ev.target.disabled = false; dizer("mov", false, HGIDados.falha(e) + " Se o lançamento já apareceu na lista, não lance de novo."); });
      return;
    }
    var del = ev.target.getAttribute && ev.target.getAttribute("data-del");
    if (del) {
      if (!window.confirm("Excluir este lançamento?")) return;
      HGIDados.excluirMovimento(del).catch(function (e) { dizer("mov", false, HGIDados.falha(e)); });
    }
  });

  HGI.aoEntrar(function (s) {
    if (s.papel !== "total") { HGI.mostrarBloqueio("financeiro"); return; }
    document.body.classList.add("hgi-ok");
    HGI.montarChrome("financeiro");
    app.textContent = "Carregando…";
    var negou = function () { app.textContent = "Sem permissão para ler o financeiro."; };
    var pintar = HGI.agendarRender(app, render);
    HGIDados.escutar("empreendimentos", function (v) { emps = v || {}; if (movs !== null) pintar(); }, negou);
    HGIDados.escutar("producao", function (v) { movs = v || {}; if (emps !== null) pintar(); }, negou);
  });
})();
