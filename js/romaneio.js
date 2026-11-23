(function () {
  var calc = HGICalc;
  var app = document.getElementById("app");
  var fila = null, romaneios = null, contador = undefined;

  function lista() {
    return calc.entradas(fila).sort(function (a, b) { return (a.nome || "").localeCompare(b.nome || "", "pt"); });
  }
  function render() {
    if (fila === null || romaneios === null || contador === undefined) return;
    var ano = calc.ano2deIso(calc.hojeSP());
    var prox = calc.proximoRomaneio(contador, ano);
    var grupos = { pendente: [], pronto: [], feito: [] };
    lista().forEach(function (o) {
      if (o.romaneioNumero) grupos.feito.push(o);
      else if (o.pronto) grupos.pronto.push(o);
      else grupos.pendente.push(o);
    });
    var html = "";
    if (HGI.exemplo) html += '<p class="aviso-exemplo">' + calc.esc(HGIDados.avisoExemplo()) + "</p>";
    html += '<div class="bloco"><h2>Fila de romaneio</h2>';
    html += '<p class="nota">Quando uma obra é cadastrada no Financeiro, ela aparece aqui sem valores. O almoxarife marca o que está pronto e gera o romaneio do que ainda vai sair. O número é AA + 4 dígitos (ano ' + ano + '), a partir de ' + calc.formatRomaneio(ano * 10000 + 1) + ', e não se repete.</p>';
    html += '<p><strong>Próximo número:</strong> ' + (prox ? calc.formatRomaneio(prox) : "sequência do ano esgotada") + "</p></div>";
    html += '<div class="colunas">';
    html += coluna("Ainda não está pronto", "falta", grupos.pendente, "pendente");
    html += coluna("Pronto — falta romaneio", "pronta", grupos.pronto, "pronto");
    html += coluna("Romaneio gerado", "feita", grupos.feito, "feito");
    html += "</div>";
    html += '<p class="hgi-erro" id="erro"></p><p class="hgi-okmsg" id="msg"></p>';
    html += '<p class="quem">Valores em R$ não aparecem nesta tela. Eles ficam no Financeiro, só para o acesso total.</p>';
    app.innerHTML = html;
  }
  function coluna(tit, cls, itens, tipo) {
    var h = '<section class="coluna ' + cls + '"><h2>' + calc.esc(tit) + "</h2>";
    if (!itens.length) h += '<p class="vazio">Nenhuma obra neste grupo.</p>';
    itens.forEach(function (o) {
      var rom = romaneios && (romaneios[String(o.romaneioNumero)] || null);
      h += '<article class="obra" data-id="' + calc.esc(o.id) + '">';
      h += '<div class="nome">' + calc.esc(o.nome || o.id) + (String(o.id).indexOf("ex-") === 0 ? '<span class="badge-ex">EXEMPLO</span>' : "") + "</div>";
      h += '<div class="meta">Quantidade contratada: ' + calc.esc(calc.formatQtd(o.qtdContratada)) + "</div>";
      if (tipo === "feito") {
        h += '<div class="num-rom">' + calc.esc(calc.formatRomaneio(o.romaneioNumero)) + "</div>";
        h += '<div class="meta">' + calc.esc(calc.formatRomaneio(o.romaneioNumero).slice(0, 2) + " " + calc.formatRomaneio(o.romaneioNumero).slice(2)) + "</div>";
        if (rom) {
          h += '<div class="meta">Quantidade: ' + calc.esc(calc.formatQtd(rom.qtd)) + " · " + calc.esc(calc.formatDataBR(rom.data)) + "</div>";
          h += '<div class="quem">lançado por: ' + calc.esc(rom.lancadoPorNome || o.lancadoPorNome || "—") + "</div>";
          if (rom.observacao) h += '<div class="meta">' + calc.esc(rom.observacao) + "</div>";
        } else if (o.lancadoPorNome) {
          h += '<div class="quem">lançado por: ' + calc.esc(o.lancadoPorNome) + "</div>";
        }
      } else if (tipo === "pronto") {
        h += '<div class="form-grid" style="grid-template-columns:1fr 1fr">';
        h += '<label>Quantidade<input data-k="qtd" inputmode="decimal" placeholder="itens / aptos"></label>';
        h += '<label>Data<input data-k="data" type="date" value="' + calc.esc(calc.hojeSP()) + '"></label>';
        h += '</div><label>Observação<input data-k="obs" maxlength="500"></label>';
        h += '<div class="form-acoes"><button type="button" class="btn lar" data-acao="gerar">Gerar romaneio</button>';
        h += '<button type="button" class="btn sec" data-acao="desmarcar">Voltar para não pronto</button></div>';
      } else {
        h += '<button type="button" class="btn" data-acao="pronto">Marcar como pronto</button>';
      }
      h += "</article>";
    });
    return h + "</section>";
  }
  function dizer(ok, texto) {
    var a = document.getElementById(ok ? "msg" : "erro");
    var b = document.getElementById(ok ? "erro" : "msg");
    if (a) a.textContent = texto;
    if (b) b.textContent = "";
  }
  app.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-acao]");
    if (!btn) return;
    var art = btn.closest(".obra");
    var id = art.getAttribute("data-id");
    var o = (fila && fila[id]) || {};
    var acao = btn.getAttribute("data-acao");
    btn.disabled = true;
    var fim = function (p, ok, texto) {
      p.then(function (n) {
        btn.disabled = false;
        dizer(true, ok === "num" ? "Romaneio " + calc.formatRomaneio(n) + " gerado. lançado por: " + (HGI.sessao.setor || HGI.sessao.nome || "") + "." : texto);
      }).catch(function (e) {
        btn.disabled = false;
        dizer(false, HGIDados.falha(e));
      });
    };
    if (acao === "pronto") fim(HGIDados.marcarPronto(id, true), "txt", "Marcado como pronto.");
    else if (acao === "desmarcar") fim(HGIDados.marcarPronto(id, false), "txt", "Voltou para não pronto.");
    else if (acao === "gerar") {
      fim(HGIDados.emitirRomaneio({
        empreendimentoId: id,
        nome: o.nome || id,
        qtd: art.querySelector('[data-k="qtd"]').value,
        data: art.querySelector('[data-k="data"]').value,
        observacao: art.querySelector('[data-k="obs"]').value.trim()
      }), "num");
    }
  });
  var pintar = HGI.agendarRender(app, render);
  function chegou() {
    if (fila !== null && romaneios !== null && contador !== undefined) pintar();
  }
  HGI.aoEntrar(function (s) {
    if (s.papel !== "total" && s.papel !== "almoxarife") { HGI.mostrarSemPapel(); return; }
    document.body.classList.add("hgi-ok");
    HGI.montarChrome("romaneio");
    app.textContent = "Carregando…";
    var negou = function () { app.textContent = "Sem permissão para ler a fila de romaneio."; };
    HGIDados.escutar("filaRomaneio", function (v) { fila = v || {}; chegou(); }, negou);
    HGIDados.escutar("romaneios", function (v) { romaneios = v || {}; chegou(); }, negou);
    HGIDados.escutar("contadores/romaneio", function (v) { contador = v === undefined ? null : v; chegou(); }, negou);
  });
})();
