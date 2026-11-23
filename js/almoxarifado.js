(function () {
  var calc = HGICalc;
  var app = document.getElementById("app");
  var itens = null;

  function catalogoMesclado() {
    var db = itens || {};
    var ordem = [];
    var visto = {};
    calc.CATALOGO_ALMOX.forEach(function (c) {
      visto[c.id] = 1;
      ordem.push(Object.assign({ exemplo: !db[c.id], codigo: "" }, c, db[c.id] || {}, { id: c.id }));
    });
    Object.keys(db).forEach(function (id) {
      if (visto[id]) return;
      ordem.push(Object.assign({ exemplo: false, id: id }, db[id]));
    });
    return ordem;
  }
  function campo(rot, html) {
    return "<label>" + calc.esc(rot) + html + "</label>";
  }
  function render() {
    var linhas = catalogoMesclado();
    var html = "";
    html += '<p class="aviso-exemplo">' + calc.esc(HGI.exemplo
      ? "Exemplo visual — itens no padrão da planilha, quantidades em branco. Nada é gravado no banco."
      : "Itens de exemplo no padrão da planilha. Código e quantidades começam em branco. Saldo = Entrada − Saída. Status fica Repor quando o saldo é menor que o estoque mínimo.") + "</p>";
    html += '<div class="legenda"><span><i class="st st-ok">OK</i> saldo dentro do mínimo, ou mínimo ainda em branco</span><span><i class="st st-repor">Repor</i> saldo abaixo do estoque mínimo</span><span><i class="st st-vazio">—</i> sem entrada e sem saída</span></div>';
    html += '<div class="grade-wrap"><table class="grade"><thead><tr>';
    ["Código", "Item", "Categoria", "Unidade", "Estoque mínimo", "Entrada", "Saída", "Saldo", "Status", "Observação", ""].forEach(function (h) {
      html += "<th>" + h + "</th>";
    });
    html += "</tr></thead><tbody>";
    linhas.forEach(function (it) {
      var sit = calc.situacaoEstoque(it.entrada, it.saida, it.estoqueMinimo);
      var st = sit.status === "Repor" ? "st-repor" : (sit.status === "OK" ? "st-ok" : "st-vazio");
      html += '<tr data-id="' + calc.esc(it.id) + '">';
      html += "<td>" + input("codigo", it.codigo, "código") + "</td>";
      html += '<td class="nome">' + calc.esc(it.item || "") + (it.exemplo ? '<span class="badge-ex">EXEMPLO</span>' : "") + "</td>";
      html += "<td>" + select("categoria", calc.CATEGORIAS, it.categoria) + "</td>";
      html += "<td>" + select("unidade", calc.UNIDADES, it.unidade) + "</td>";
      html += "<td>" + input("estoqueMinimo", it.estoqueMinimo, "mín.", "num") + "</td>";
      html += "<td>" + input("entrada", it.entrada, "entrada", "num") + "</td>";
      html += "<td>" + input("saida", it.saida, "saída", "num") + "</td>";
      html += '<td class="num saldo">' + calc.esc(calc.formatQtd(sit.saldo)) + "</td>";
      html += '<td><span class="st ' + st + '">' + calc.esc(sit.status || "—") + "</span></td>";
      html += "<td>" + input("observacao", it.observacao, "observação") + "</td>";
      html += '<td><button type="button" class="btn" data-acao="salvar">Salvar</button></td>';
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    html += '<div class="bloco"><h2>Novo item</h2><p class="nota">A linha entra em branco. Quem salvar aparece como lançado por: o setor que entrou.</p>';
    html += '<div class="form-grid">';
    html += campo("Item", '<input id="novo-item" maxlength="120" placeholder="Ex.: luva">');
    html += campo("Categoria", selectHtml("novo-cat", calc.CATEGORIAS, "Elétrico"));
    html += campo("Unidade", selectHtml("novo-un", calc.UNIDADES, "un"));
    html += "</div><div class=\"form-acoes\"><button type=\"button\" class=\"btn lar\" id=\"novo-ok\">Incluir item</button><span class=\"hgi-okmsg\" id=\"msg\"></span><span class=\"hgi-erro\" id=\"erro\"></span></div></div>";
    html += '<p class="quem">O saldo e o status são calculados na hora. Eles não são gravados, para ninguém alterar o resultado à mão.</p>';
    app.innerHTML = html;
    app.querySelectorAll("input[data-k]").forEach(function (inp) {
      inp.addEventListener("input", function () { atualizarLinha(inp.closest("tr")); });
    });
  }
  function input(k, val, ph, tipo) {
    var v = val === null || val === undefined ? "" : String(val);
    return '<input data-k="' + k + '" ' + (tipo === "num" ? 'inputmode="decimal"' : "") + ' maxlength="80" placeholder="' + calc.esc(ph) + '" value="' + calc.esc(v) + '">';
  }
  function select(k, ops, atual) {
    var h = '<select data-k="' + k + '">';
    ops.forEach(function (op) {
      h += '<option' + (op === atual ? " selected" : "") + ">" + calc.esc(op) + "</option>";
    });
    return h + "</select>";
  }
  function selectHtml(id, ops, atual) {
    var h = '<select id="' + id + '">';
    ops.forEach(function (op) {
      h += '<option' + (op === atual ? " selected" : "") + ">" + calc.esc(op) + "</option>";
    });
    return h + "</select>";
  }
  function atualizarLinha(tr) {
    if (!tr) return;
    var e = tr.querySelector('[data-k="entrada"]').value;
    var s = tr.querySelector('[data-k="saida"]').value;
    var m = tr.querySelector('[data-k="estoqueMinimo"]').value;
    var sit = calc.situacaoEstoque(e, s, m);
    tr.querySelector(".saldo").textContent = calc.formatQtd(sit.saldo);
    var badge = tr.querySelector(".st");
    badge.textContent = sit.status || "—";
    badge.className = "st " + (sit.status === "Repor" ? "st-repor" : (sit.status === "OK" ? "st-ok" : "st-vazio"));
  }
  function dadosDaLinha(tr) {
    var id = tr.getAttribute("data-id");
    var base = (itens && itens[id]) || {};
    var cat = calc.CATALOGO_ALMOX.filter(function (c) { return c.id === id; })[0];
    var o = { item: (base.item || (cat && cat.item) || "").trim(), criadoEm: base.criadoEm };
    ["codigo", "categoria", "unidade", "estoqueMinimo", "entrada", "saida", "observacao"].forEach(function (k) {
      o[k] = tr.querySelector('[data-k="' + k + '"]').value;
    });
    return { id: id, dados: o };
  }
  function msg(ok, texto) {
    var a = document.getElementById(ok ? "msg" : "erro");
    var b = document.getElementById(ok ? "erro" : "msg");
    if (b) b.textContent = "";
    if (a) a.textContent = texto;
  }
  app.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-acao]");
    if (btn && btn.getAttribute("data-acao") === "salvar") {
      var pacote = dadosDaLinha(btn.closest("tr"));
      if (!pacote.dados.item) { msg(false, "Informe o item."); return; }
      btn.disabled = true;
      HGIDados.salvarItem(pacote.id, pacote.dados).then(function () {
        btn.disabled = false;
        msg(true, "Salvo. lançado por: " + (HGI.sessao.setor || HGI.sessao.nome || "") + ".");
      }).catch(function (e) { btn.disabled = false; msg(false, HGIDados.falha(e)); });
      return;
    }
    if (ev.target.id === "novo-ok") {
      var nome = document.getElementById("novo-item").value.trim();
      if (!nome) { msg(false, "Informe o nome do item."); return; }
      var id = HGIDados.novoId("almoxarifado/itens");
      ev.target.disabled = true;
      HGIDados.salvarItem(id, {
        item: nome,
        categoria: document.getElementById("novo-cat").value,
        unidade: document.getElementById("novo-un").value
      }).then(function () {
        ev.target.disabled = false;
        msg(true, "Item incluído.");
      }).catch(function (e) { ev.target.disabled = false; msg(false, HGIDados.falha(e)); });
    }
  });

  HGI.aoEntrar(function (s) {
    if (s.papel !== "total" && s.papel !== "almoxarife") { HGI.mostrarSemPapel(); return; }
    document.body.classList.add("hgi-ok");
    HGI.montarChrome("almoxarifado");
    app.textContent = "Carregando…";
    var pintar = HGI.agendarRender(app, render);
    HGIDados.escutar("almoxarifado/itens", function (v) { itens = v || {}; pintar(); }, function () {
      app.textContent = "Sem permissão para ler o almoxarifado.";
    });
  });
})();
