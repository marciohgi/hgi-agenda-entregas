(function () {
  var cfg = window.HGI_FIREBASE || {};
  var calc = window.HGICalc;
  var paginaNova = /(?:almoxarifado|romaneio|financeiro|painel|equipe)\.html$/i.test(location.pathname);
  var exemplo = paginaNova && /(?:\?|&)exemplo=1(?:&|$)/.test(location.search);
  var papelExemplo = /(?:\?|&)papel=almoxarife(?:&|$)/.test(location.search) ? "almoxarife" : "total";
  var state = { pronto: false, uid: "", email: "", nome: "", papel: "", token: "" };
  var waiters = [];
  var avisados = false;
  var sdk = null;

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
    { id: "financeiro", href: "financeiro.html", rot: "Financeiro", papeis: ["total"] },
    { id: "painel", href: "painel.html", rot: "Painel", papeis: ["total"] },
    { id: "equipe", href: "equipe.html", rot: "Equipe", papeis: ["total"] }
  ];
  function montarChrome(pagina) {
    var nav = document.getElementById("hgi-nav");
    if (nav) {
      nav.innerHTML = "";
      LINKS.forEach(function (l) {
        if (l.papeis.indexOf(state.papel) < 0) return;
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
      nome.textContent = (state.nome || state.email || "") + (state.papel === "almoxarife" ? " · Almoxarife" : " · Acesso total");
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
    h.textContent = "Sua conta entrou, mas ainda não tem papel. Um acesso total precisa gravar /usuarios/" + (state.uid || "{uid}") + " com papel \"total\" ou \"almoxarife\". O README explica como criar o primeiro administrador no console do Firebase.";
    box.appendChild(h);
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
  function aoEntrar(cb) {
    if (state.pronto) cb(state);
    else waiters.push(cb);
  }
  function carregarSdk() {
    if (sdk) return sdk;
    if (!configOk()) return Promise.reject(new Error("config"));
    sdk = new Promise(function (resolve, reject) {
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
    return sdk;
  }
  function msgAuth(e) {
    var c = e && e.code || "";
    if (c === "auth/invalid-email") return "E-mail inválido.";
    if (c === "auth/user-not-found" || c === "auth/wrong-password" || c === "auth/invalid-credential") return "E-mail ou senha não conferem.";
    if (c === "auth/too-many-requests") return "Muitas tentativas. Espere um pouco e tente de novo.";
    if (c === "auth/invalid-api-key" || c === "auth/api-key-not-valid") return "A apiKey em js/firebase-config.js não é a deste projeto.";
    if (e && e.message === "config") return "Configuração incompleta. Preencha apiKey e appId em js/firebase-config.js (veja o README).";
    if (e && e.message === "sdk") return "Não foi possível carregar o Firebase. Verifique a conexão.";
    return "Não foi possível entrar. Tente de novo.";
  }
  function aplicarUsuario(user) {
    if (!user) {
      state = { pronto: false, uid: "", email: "", nome: "", papel: "", token: "" };
      HGI.sessao = state;
      window.HGI_TOKEN = "";
      mostrarGate();
      return;
    }
    user.getIdToken().then(function (token) {
      window.HGI_TOKEN = token;
      state.token = token;
      return firebase.database().ref("usuarios/" + user.uid).once("value");
    }).then(function (snap) {
      var p = snap.val() || {};
      state = {
        pronto: true,
        uid: user.uid,
        email: user.email || p.email || "",
        nome: p.nome || user.email || "",
        papel: p.papel || "",
        token: window.HGI_TOKEN
      };
      if (!state.papel) { HGI.sessao = state; mostrarSemPapel(); return; }
      publicar();
    }).catch(function () {
      erroGate("Entrou na conta, mas não foi possível ler o papel. Confira as regras e o nó usuarios.");
    });
  }
  function entrar(email, senha) {
    erroGate("");
    carregarSdk().then(function () {
      return firebase.auth().signInWithEmailAndPassword(email, senha);
    }).catch(function (e) { erroGate(msgAuth(e)); });
  }

  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    if (!f || f.id !== "hgi-gate-form") return;
    ev.preventDefault();
    var email = (document.getElementById("hgi-email") || {}).value || "";
    var senha = (document.getElementById("hgi-senha") || {}).value || "";
    entrar(String(email).trim(), senha);
  });

  if (exemplo) {
    state = {
      pronto: true,
      uid: "exemplo",
      email: "",
      nome: "Exemplo visual",
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
