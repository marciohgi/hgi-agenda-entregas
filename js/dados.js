(function () {
  var calc = window.HGICalc;
  var mem = { empreendimentos: {}, producao: {}, almoxarifado: { itens: {} }, filaRomaneio: {}, romaneios: {}, contadores: { romaneio: null }, usuarios: {} };
  var ouvintes = [];

  function clonar(v) { return JSON.parse(JSON.stringify(v)); }
  function semear() {
    var seed = calc.seedExemplo(calc.hojeSP());
    seed.empreendimentos.forEach(function (e) { mem.empreendimentos[e.id] = clonar(e); });
    mem.producao = {};
    seed.movimentos.forEach(function (m) { mem.producao[m.id] = clonar(m); });
    mem.filaRomaneio = clonar(seed.fila);
    seed.romaneios.forEach(function (r) { mem.romaneios[String(r.numero)] = clonar(r); });
    mem.contadores.romaneio = seed.contador;
    mem._aviso = seed.aviso;
  }
  if (window.HGI && HGI.exemplo) semear();

  function ler(path) {
    var parts = path.split("/").filter(Boolean);
    var cur = mem;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== "object") return null;
      cur = cur[parts[i]];
    }
    return cur == null ? null : cur;
  }
  function gravar(path, valor) {
    var parts = path.split("/").filter(Boolean);
    var cur = mem;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    if (valor === null) delete cur[parts[parts.length - 1]];
    else cur[parts[parts.length - 1]] = valor;
  }
  function avisar() {
    ouvintes.forEach(function (o) { o.cb(ler(o.path)); });
  }
  function escutar(path, cb, onErro) {
    if (HGI.exemplo) {
      var o = { path: path, cb: cb };
      ouvintes.push(o);
      cb(ler(path));
      return function () {};
    }
    var ref = firebase.database().ref(path);
    var fn = ref.on("value", function (s) { cb(s.val()); }, function () { if (onErro) onErro(); });
    return function () { ref.off("value", fn); };
  }
  function carimbo() {
    return {
      lancadoPorUid: HGI.sessao.uid,
      lancadoPorNome: HGI.sessao.nome || HGI.sessao.email || "Usuário",
      atualizadoEm: Date.now()
    };
  }
  function falha(e) {
    var c = e && (e.code || e.message) || "";
    if (String(c).indexOf("PERMISSION_DENIED") >= 0) return "Sem permissão para gravar isto com o seu papel.";
    return "Não foi possível gravar. Confira a conexão e as regras do banco.";
  }
  function update(obj) {
    if (HGI.exemplo) {
      Object.keys(obj).forEach(function (k) { gravar(k, obj[k]); });
      avisar();
      return Promise.resolve();
    }
    return firebase.database().ref().update(obj);
  }
  function salvarItem(id, dados) {
    var body = {
      codigo: dados.codigo || "",
      item: dados.item,
      categoria: dados.categoria || "",
      unidade: dados.unidade || "",
      observacao: dados.observacao || "",
      lancadoPorUid: HGI.exemplo ? "exemplo" : HGI.sessao.uid,
      lancadoPorNome: HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email),
      atualizadoEm: Date.now(),
      criadoEm: dados.criadoEm || Date.now()
    };
    ["estoqueMinimo", "entrada", "saida"].forEach(function (k) {
      var n = calc.numOrNull(dados[k]);
      if (n !== null) body[k] = n;
    });
    return update((function () { var o = {}; o["almoxarifado/itens/" + id] = body; return o; })());
  }
  function excluirItem(id) {
    return update((function () { var o = {}; o["almoxarifado/itens/" + id] = null; return o; })());
  }
  function salvarEmpreendimento(id, dados, novo) {
    var body = {
      nome: dados.nome,
      valorKitEletrico: calc.numOrNull(dados.valorKitEletrico),
      valorKitQdc: calc.numOrNull(dados.valorKitQdc),
      qtdContratada: calc.numOrNull(dados.qtdContratada),
      lancadoPorUid: HGI.exemplo ? "exemplo" : HGI.sessao.uid,
      lancadoPorNome: HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email),
      atualizadoEm: Date.now()
    };
    if (novo) body.criadoEm = body.atualizadoEm;
    Object.keys(body).forEach(function (k) { if (body[k] === null) delete body[k]; });
    var o = {};
    o["empreendimentos/" + id] = body;
    o["filaRomaneio/" + id + "/nome"] = dados.nome;
    var q = calc.numOrNull(dados.qtdContratada);
    o["filaRomaneio/" + id + "/qtdContratada"] = q === null ? null : q;
    o["filaRomaneio/" + id + "/atualizadoEm"] = body.atualizadoEm;
    if (novo) o["filaRomaneio/" + id + "/pronto"] = false;
    return update(o);
  }
  function salvarMovimento(id, dados) {
    var q = calc.numOrNull(dados.qtd);
    var body = {
      tipo: dados.tipo,
      empreendimentoId: dados.empreendimentoId,
      data: dados.data,
      qtd: q === null ? 0 : q,
      lancadoPorUid: HGI.exemplo ? "exemplo" : HGI.sessao.uid,
      lancadoPorNome: HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email),
      criadoEm: Date.now()
    };
    var o = {};
    o["producao/" + id] = body;
    return update(o);
  }
  function excluirMovimento(id) {
    var o = {};
    o["producao/" + id] = null;
    return update(o);
  }
  function novoId(caminho) {
    if (HGI.exemplo) return "loc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return firebase.database().ref(caminho).push().key;
  }
  function emitirRomaneio(dados) {
    var hoje = calc.hojeSP();
    var ano = calc.ano2deIso(hoje);
    function gravarNumero(n) {
      var payload = {
        numero: n,
        empreendimentoId: dados.empreendimentoId,
        nome: dados.nome,
        data: dados.data || hoje,
        observacao: dados.observacao || "",
        criadoEm: Date.now(),
        lancadoPorUid: HGI.exemplo ? "exemplo" : HGI.sessao.uid,
        lancadoPorNome: HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email)
      };
      var q = calc.numOrNull(dados.qtd);
      if (q !== null) payload.qtd = q;
      var o = {};
      o["romaneios/" + n] = payload;
      o["filaRomaneio/" + dados.empreendimentoId + "/romaneioNumero"] = n;
      o["filaRomaneio/" + dados.empreendimentoId + "/romaneioEm"] = payload.criadoEm;
      o["filaRomaneio/" + dados.empreendimentoId + "/lancadoPorUid"] = payload.lancadoPorUid;
      o["filaRomaneio/" + dados.empreendimentoId + "/lancadoPorNome"] = payload.lancadoPorNome;
      o["filaRomaneio/" + dados.empreendimentoId + "/atualizadoEm"] = payload.criadoEm;
      o["filaRomaneio/" + dados.empreendimentoId + "/pronto"] = true;
      return update(o).then(function () { return n; });
    }
    if (HGI.exemplo) {
      var n = calc.proximoRomaneio(mem.contadores.romaneio, ano);
      if (n == null) return Promise.reject(new Error("Sequência do ano esgotada."));
      if (!calc.regraContadorAceita(mem.contadores.romaneio, n)) return Promise.reject(new Error("Número recusado."));
      mem.contadores.romaneio = n;
      return gravarNumero(n);
    }
    var refC = firebase.database().ref("contadores/romaneio");
    return refC.transaction(function (cur) {
      return calc.proximoRomaneio(cur, ano);
    }).then(function (res) {
      if (!res.committed) throw new Error("Não foi possível reservar o número.");
      var n = res.snapshot.val();
      return gravarNumero(n).catch(function (e) {
        if (String(e && e.code).indexOf("PERMISSION_DENIED") >= 0 && mem) throw e;
        return refC.transaction(function (cur) { return calc.proximoRomaneio(cur, ano); }).then(function (r2) {
          if (!r2.committed) throw e;
          return gravarNumero(r2.snapshot.val());
        });
      });
    });
  }
  function marcarPronto(id, pronto) {
    var o = {};
    o["filaRomaneio/" + id + "/pronto"] = !!pronto;
    o["filaRomaneio/" + id + "/atualizadoEm"] = Date.now();
    return update(o);
  }
  function salvarPapel(uid, dados) {
    var body = {
      uid: uid,
      nome: dados.nome,
      email: dados.email || "",
      papel: dados.papel,
      atualizadoEm: Date.now(),
      atualizadoPor: HGI.exemplo ? "exemplo" : HGI.sessao.uid
    };
    var o = {};
    o["usuarios/" + uid] = body;
    return update(o);
  }

  window.HGIDados = {
    escutar: escutar,
    salvarItem: salvarItem,
    excluirItem: excluirItem,
    salvarEmpreendimento: salvarEmpreendimento,
    salvarMovimento: salvarMovimento,
    excluirMovimento: excluirMovimento,
    novoId: novoId,
    emitirRomaneio: emitirRomaneio,
    marcarPronto: marcarPronto,
    salvarPapel: salvarPapel,
    falha: falha,
    avisoExemplo: function () { return mem._aviso || ""; },
    carimbo: carimbo
  };
})();
