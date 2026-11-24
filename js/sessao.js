(function () {
  var cfg = window.HGI_FIREBASE || {};
  var calc = window.HGICalc;
  var EQUIPE_OCULTA = true;
  if (EQUIPE_OCULTA && /equipe\.html$/i.test(location.pathname)) { location.replace("index.html"); return; }
  var paginaNova = /(?:almoxarifado|romaneio|financeiro|painel|equipe)\.html$/i.test(location.pathname);
  var exemplo = paginaNova && /(?:\?|&)exemplo=1(?:&|$)/.test(location.search);
  var papelExemplo = /(?:\?|&)papel=almoxarife(?:&|$)/.test(location.search) ? "almoxarife" : "total";
  var state = { pronto: false, uid: "", email: "", nome: "", setor: "", papel: "", token: "" };
  var waiters = [];
  var avisados = false;
  var sdk = null;
  var geracao = 0;

  window.HGI = window.HGI || {};
  HGI.exemplo = exemplo;
  HGI.sessao = state;

  function configOk() {
    return !!(cfg.apiKey && cfg.appId && cfg.projectId && cfg.databaseURL);
  }
  function erroGate(msg) {
    var el = document.getElementById("hgi-gate-erro");
    if (el) el.textContent = msg || "";
  }
  function mostrarGate() {
    document.body.classList.remove("hgi-ok");
    var gate = document.getElementById("hgi-gate");
    if (gate) gate.hidden = false;
  }
  function qs() {
    if (!exemplo) return "";
    return "?exemplo=1" + (state.papel === "almoxarife" ? "&papel=almoxarife" : "");
  }
  var LINKS = [
    { id: "agenda", href: "index.html", rot: "Agenda", papeis: ["total"] },
    { id: "almoxarifado", href: "almoxarifado.html", rot: "Almoxarifado", papeis: ["total", "almoxarife"] },
    { id: "romaneio", href: "romaneio.html", rot: "Romaneio", papeis: ["total", "almoxarife"] },
    { id: "financeiro", href: "financeiro.html", rot: "Resumo por Empreendimento", papeis: ["total"] },
    { id: "painel", href: "painel.html", rot: "Painel", papeis: ["total"] },
    // Equipe escondida da barra por enquanto (pedido do Márcio, 24/11). Para voltar: oculto: false.
    { id: "equipe", href: "equipe.html", rot: "Equipe", papeis: ["total"], oculto: EQUIPE_OCULTA }
  ];
  function montarChrome(pagina) {
    var nav = document.getElementById("hgi-nav");
    if (nav) {
      nav.innerHTML = "";
      LINKS.forEach(function (l) {
        if (l.papeis.indexOf(state.papel) < 0 || l.oculto) return;
        var a = document.createElement("a");
        a.href = l.href + qs();
        a.textContent = l.rot;
        if (l.id === pagina) a.setAttribute("aria-current", "page");
        nav.appendChild(a);
      });
    }
    var quem = document.getElementById("hgi-quem");
    if (quem) {
      quem.innerHTML = "";
      var nome = document.createElement("span");
      nome.textContent = (state.setor || state.nome || "") + (state.papel === "almoxarife" ? " · Almoxarifado" : " · Diretoria");
      var sair = document.createElement("button");
      sair.type = "button";
      sair.textContent = exemplo ? "Sair do exemplo" : "Sair";
      sair.onclick = function () {
        if (exemplo) { location.href = "index.html"; return; }
        if (firebase.apps && firebase.apps.length) firebase.auth().signOut().then(function () { location.href = "index.html"; });
      };
      quem.appendChild(nome);
      quem.appendChild(sair);
    }
  }
  function mostrarSemPapel() {
    mostrarGate();
    var box = document.querySelector("#hgi-gate .hgi-gate-corpo") || document.getElementById("hgi-gate-form");
    if (!box) return;
    box.innerHTML = "";
    var h = document.createElement("p");
    h.className = "sub";
    h.textContent = "Este setor ainda não foi liberado. Peça ao Márcio para definir o papel em /usuarios/" + (state.uid || "{uid}") + ".";
    var sair = document.createElement("button");
    sair.type = "button";
    sair.textContent = "Sair e usar outra conta";
    sair.onclick = function () {
      var fim = function () { location.reload(); };
      if (window.firebase && firebase.apps && firebase.apps.length) firebase.auth().signOut().then(fim, fim);
      else fim();
    };
    box.appendChild(h);
    box.appendChild(sair);
  }
  function mostrarBloqueio(destino) {
    document.body.classList.add("hgi-ok");
    montarChrome(destino || "");
    var main = document.getElementById("app");
    if (!main) return;
    main.innerHTML = "";
    var box = document.createElement("div");
    box.className = "bloqueio";
    var h = document.createElement("h2");
    h.textContent = "Este módulo não faz parte do seu acesso";
    var p = document.createElement("p");
    p.textContent = "O almoxarife vê o almoxarifado e o que está pronto ou ainda precisa de romaneio. Valores, quantidades contratadas em R$ e o painel ficam só no acesso total.";
    box.appendChild(h);
    box.appendChild(p);
    main.appendChild(box);
  }
  function fecharEscutas() {
    (window.HGI_FECHAR || []).forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function publicar() {
    HGI.sessao = state;
    window.HGI_TOKEN = state.token || "";
    if (!avisados) {
      avisados = true;
      waiters.splice(0).forEach(function (cb) { cb(state); });
    } else if (window.HGI_REOUVIR) {
      window.HGI_REOUVIR.forEach(function (fn) { fn(); });
    }
  }
  HGI.agendarRender = function (app, render) {
    var pendente = false;
    function editando() {
      var a = document.activeElement;
      return !!(a && app.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));
    }
    app.addEventListener("focusout", function () {
      setTimeout(function () {
        if (!pendente || editando()) return;
        pendente = false;
        render();
      }, 0);
    });
    return function () {
      if (editando()) { pendente = true; return; }
      pendente = false;
      render();
    };
  };
  function aoEntrar(cb) {
    if (state.pronto) cb(state);
    else waiters.push(cb);
  }
  function carregarSdk() {
    if (sdk) return sdk;
    if (!configOk()) return Promise.reject(new Error("config"));
    var p = new Promise(function (resolve, reject) {
      var fontes = [
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js"
      ];
      function prox(i) {
        if (i >= fontes.length) {
          if (!firebase.apps.length) firebase.initializeApp(cfg);
          resolve();
          return;
        }
        var s = document.createElement("script");
        s.src = fontes[i];
        s.onload = function () { prox(i + 1); };
        s.onerror = function () { reject(new Error("sdk")); };
        document.head.appendChild(s);
      }
      prox(0);
    });
    sdk = p;
    p.catch(function () { if (sdk === p) sdk = null; });
    return p;
  }
  function msgAuth(e) {
    var c = e && e.code || "";
    if (c === "auth/invalid-email" || c === "auth/user-not-found" || c === "auth/wrong-password" || c === "auth/invalid-credential" || c === "auth/invalid-login-credentials") return "Usuário ou senha incorretos.";
    if (c === "auth/too-many-requests") return "Muitas tentativas. Espere um pouco e tente de novo.";
    if (c === "auth/invalid-api-key" || c === "auth/api-key-not-valid") return "A configuração do projeto não foi aceita. Confira js/firebase-config.js.";
    if (e && e.message === "config") return "Configuração incompleta. Veja o README.";
    if (e && e.message === "sdk") return "Não foi possível carregar o Firebase. Verifique a conexão.";
    if (e && e.aviso) return e.message;
    return "Não foi possível entrar. Tente de novo.";
  }
  function aplicarUsuario(user) {
    var g = ++geracao;
    if (!user) {
      fecharEscutas();
      state = { pronto: false, uid: "", email: "", nome: "", setor: "", papel: "", token: "" };
      HGI.sessao = state;
      window.HGI_TOKEN = "";
      if (avisados) { location.reload(); return; }
      mostrarGate();
      return;
    }
    user.getIdToken().then(function (token) {
      if (g !== geracao) return null;
      window.HGI_TOKEN = token;
      state.token = token;
      return firebase.database().ref("usuarios/" + user.uid).once("value");
    }).then(function (snap) {
      if (!snap || g !== geracao) return;
      var p = snap.val() || {};
      var setor = (calc && calc.setorDoEmail(user.email)) || "";
      state = {
        pronto: true,
        uid: user.uid,
        email: user.email || p.email || "",
        nome: setor || p.nome || "",
        setor: setor,
        papel: p.papel || "",
        token: window.HGI_TOKEN
      };
      if (!state.papel) { HGI.sessao = state; mostrarSemPapel(); return; }
      publicar();
    }).catch(function () {
      if (g !== geracao) return;
      erroGate("Entrou na conta, mas não foi possível ler o papel. Confira as regras e o nó usuarios.");
    });
  }
  function entrar(setor, senha) {
    erroGate("");
    var email = calc.emailDoSetor(setor);
    if (!email) { erroGate("Informe o setor."); return; }
    if (!senha) { erroGate("Informe a senha."); return; }
    carregarSdk().then(function () {
      return firebase.auth().signInWithEmailAndPassword(email, senha);
    }).catch(function (e) { erroGate(msgAuth(e)); });
  }

  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    if (!f || f.id !== "hgi-gate-form") return;
    ev.preventDefault();
    var setor = (document.getElementById("hgi-setor") || {}).value || "";
    var senha = (document.getElementById("hgi-senha") || {}).value || "";
    entrar(setor, senha);
  });

  if (exemplo) {
    state = {
      pronto: true,
      uid: "exemplo",
      email: "",
      nome: "Exemplo visual",
      setor: "exemplo",
      papel: papelExemplo,
      token: ""
    };
    HGI.sessao = state;
    document.body.classList.add("hgi-ok");
  } else {
    carregarSdk().then(function () {
      firebase.auth().onIdTokenChanged(aplicarUsuario);
    }).catch(function () { /* o formulário aparece; o erro surge ao tentar entrar */ });
  }

  HGI.aoEntrar = aoEntrar;
  HGI.montarChrome = montarChrome;
  HGI.mostrarSemPapel = mostrarSemPapel;
  HGI.mostrarBloqueio = mostrarBloqueio;
  HGI.configOk = configOk;
  HGI.entrar = entrar;
  HGI.calc = calc;
})();
