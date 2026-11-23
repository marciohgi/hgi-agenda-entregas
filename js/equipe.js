(function () {
  var calc = HGICalc;
  var app = document.getElementById("app");
  var usuarios = null;
  var NOMES = ["Márcio", "Zé (José)", "Vitor", "Jaqueline", "Heitor"];

  function render() {
    var html = '<div class="bloco"><h2>Atribuir papel</h2>';
    html += '<p class="nota">Só a diretoria grava papéis. O lançado por mostra o setor que entrou. O primeiro papel nasce no console, em /usuarios/{uid}. O README explica como criar o setor.</p>';
    html += '<div class="form-grid">';
    html += '<label>UID do Authentication<input id="eq-uid" maxlength="128" placeholder="cole o User UID" autocomplete="off"></label>';
    html += '<label>Setor<input id="eq-nome" maxlength="80" placeholder="Ex.: diretoria"></label>';
    html += '<label>E-mail da conta<input id="eq-email" type="email" maxlength="120" placeholder="diretoria@setor.grupohgi.com.br"></label>';
    html += '<label>Papel<select id="eq-papel"><option value="total">Acesso total</option><option value="almoxarife">Almoxarife</option></select></label>';
    html += '</div><div class="form-acoes"><button type="button" class="btn" id="eq-salvar">Salvar papel</button><span class="hgi-okmsg" id="msg"></span><span class="hgi-erro" id="erro"></span></div></div>';
    html += '<div class="bloco"><h2>Quem deve ter acesso total</h2><p class="nota">Lista de pessoas, não é leitura do banco.</p><ul>';
    NOMES.forEach(function (n) { html += "<li>" + calc.esc(n) + " — acesso total</li>"; });
    html += "<li>Almoxarife — uma ou mais contas com papel almoxarife, sem valores</li></ul></div>";
    html += '<div class="grade-wrap"><table class="grade"><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>UID</th></tr></thead><tbody>';
    var linhas = calc.entradas(usuarios).sort(function (a, b) { return (a.nome || "").localeCompare(b.nome || "", "pt"); });
    if (!linhas.length) html += '<tr><td colspan="4" class="vazio">Nenhum papel gravado ainda.</td></tr>';
    linhas.forEach(function (u) {
      html += "<tr><td class=\"nome\">" + calc.esc(u.nome || "") + "</td><td>" + calc.esc(u.email || "") + "</td><td>" + calc.esc(u.papel === "almoxarife" ? "Almoxarife" : "Acesso total") + "</td><td>" + calc.esc(u.uid || u.id) + "</td></tr>";
    });
    html += "</tbody></table></div>";
    app.innerHTML = html;
  }
  app.addEventListener("click", function (ev) {
    if (ev.target.id !== "eq-salvar") return;
    var uid = document.getElementById("eq-uid").value.trim();
    var nome = document.getElementById("eq-nome").value.trim();
    var email = document.getElementById("eq-email").value.trim();
    var papel = document.getElementById("eq-papel").value;
    var msg = document.getElementById("msg"), erro = document.getElementById("erro");
    msg.textContent = ""; erro.textContent = "";
    if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) { erro.textContent = "UID inválido. Copie o User UID do Authentication, sem espaços."; return; }
    if (!nome) { erro.textContent = "Informe o nome do setor, por exemplo diretoria."; return; }
    if (papel !== "total" && papel !== "almoxarife") { erro.textContent = "Papel inválido."; return; }
    ev.target.disabled = true;
    HGIDados.salvarPapel(uid, { nome: nome, email: email, papel: papel }).then(function () {
      ev.target.disabled = false;
      msg.textContent = "Papel salvo.";
    }).catch(function (e) {
      ev.target.disabled = false;
      erro.textContent = HGIDados.falha(e);
    });
  });

  HGI.aoEntrar(function (s) {
    if (s.papel !== "total") { HGI.mostrarBloqueio("equipe"); return; }
    document.body.classList.add("hgi-ok");
    HGI.montarChrome("equipe");
    app.textContent = "Carregando…";
    var pintar = HGI.agendarRender(app, render);
    HGIDados.escutar("usuarios", function (v) { usuarios = v || {}; pintar(); }, function () {
      app.textContent = "Sem permissão para ler a equipe.";
    });
  });
})();
