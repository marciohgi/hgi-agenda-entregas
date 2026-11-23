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
    if (e && e.aviso) return e.message;
    var c = e && (e.code || e.message) || "";
    if (String(c).indexOf("PERMISSION_DENIED") >= 0) return "Sem permissão para gravar isto com o seu papel.";
    return "Não foi possível gravar. Confira a conexão e as regras do banco.";
  }
  function aviso(msg) {
    var e = new Error(msg);
    e.aviso = true;
    return e;
  }
  function lerNumero(rotulo, bruto, obrigatorio) {
    if (bruto === null || bruto === undefined || String(bruto).trim() === "") {
      if (obrigatorio) throw aviso("Informe " + rotulo + ".");
      return null;
    }
    var n = calc.numOrNull(bruto);
    if (n === null) throw aviso(rotulo + " não é um número válido. Use 1000 ou 1.000,50.");
    if (n < 0) throw aviso(rotulo + " não pode ser negativo.");
    return n;
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
    var nums;
    try {
      nums = {
        estoqueMinimo: lerNumero("o estoque mínimo", dados.estoqueMinimo, false),
        entrada: lerNumero("a entrada", dados.entrada, false),
        saida: lerNumero("a saída", dados.saida, false)
      };
    } catch (e) { return Promise.reject(e); }
    var base = "almoxarifado/itens/" + id + "/";
    var o = {};
    o[base + "codigo"] = dados.codigo || "";
    o[base + "item"] = dados.item;
    o[base + "categoria"] = dados.categoria || "";
    o[base + "unidade"] = dados.unidade || "";
    o[base + "observacao"] = dados.observacao || "";
    o[base + "lancadoPorUid"] = HGI.exemplo ? "exemplo" : HGI.sessao.uid;
    o[base + "lancadoPorNome"] = HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email);
    o[base + "atualizadoEm"] = Date.now();
    if (!dados.criadoEm) o[base + "criadoEm"] = Date.now();
    ["estoqueMinimo", "entrada", "saida"].forEach(function (k) { o[base + k] = nums[k]; });
    return update(o);
  }
  function excluirItem(id) {
    return update((function () { var o = {}; o["almoxarifado/itens/" + id] = null; return o; })());
  }
  function salvarEmpreendimento(id, dados, novo) {
    var numeros;
    try {
      numeros = {
        valorKitEletrico: lerNumero("o valor do kit elétrico", dados.valorKitEletrico, false),
        valorKitQdc: lerNumero("o valor do kit QDC", dados.valorKitQdc, false),
        qtdContratada: lerNumero("a quantidade contratada", dados.qtdContratada, false)
      };
    } catch (e) { return Promise.reject(e); }
    var agora = Date.now();
    var base = "empreendimentos/" + id + "/";
    var o = {};
    o[base + "nome"] = dados.nome;
    o[base + "valorKitEletrico"] = numeros.valorKitEletrico;
    o[base + "valorKitQdc"] = numeros.valorKitQdc;
    o[base + "qtdContratada"] = numeros.qtdContratada;
    o[base + "lancadoPorUid"] = HGI.exemplo ? "exemplo" : HGI.sessao.uid;
    o[base + "lancadoPorNome"] = HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email);
    o[base + "atualizadoEm"] = agora;
    if (novo) o[base + "criadoEm"] = agora;
    o["filaRomaneio/" + id + "/nome"] = dados.nome;
    o["filaRomaneio/" + id + "/qtdContratada"] = numeros.qtdContratada;
    o["filaRomaneio/" + id + "/atualizadoEm"] = agora;
    if (novo) o["filaRomaneio/" + id + "/pronto"] = false;
    return update(o);
  }
  function salvarMovimento(id, dados) {
    var q;
    try { q = lerNumero("a quantidade", dados.qtd, true); }
    catch (e) { return Promise.reject(e); }
    var body = {
      tipo: dados.tipo,
      empreendimentoId: dados.empreendimentoId,
      data: dados.data,
      qtd: q,
      lancadoPorUid: HGI.exemplo ? "exemplo" : HGI.sessao.uid,
      lancadoPorNome: HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email),
      criadoEm: dados.criadoEm || Date.now()
    };
    var unit = calc.precos(dados.emp || {});
    if (unit.tem) {
      body.valorUnitario = unit.soma;
      body.valorTotal = q * unit.soma;
    }
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
  var romaneioPendente = {};
  function emitirRomaneio(dados) {
    var q;
    try { q = lerNumero("a quantidade", dados.qtd, true); }
    catch (e) { return Promise.reject(e); }
    if (!(q > 0)) return Promise.reject(aviso("Informe a quantidade do romaneio."));
    var hoje = calc.hojeSP();
    var ano = calc.ano2deIso(hoje);
    var obra = dados.empreendimentoId;
    function gravarNumero(n) {
      var payload = {
        numero: n,
        empreendimentoId: obra,
        nome: dados.nome,
        data: dados.data || hoje,
        qtd: q,
        observacao: dados.observacao || "",
        criadoEm: Date.now(),
        lancadoPorUid: HGI.exemplo ? "exemplo" : HGI.sessao.uid,
        lancadoPorNome: HGI.exemplo ? "Exemplo visual" : (HGI.sessao.nome || HGI.sessao.email)
      };
      var o = {};
      o["romaneios/" + n] = payload;
      o["filaRomaneio/" + obra + "/romaneioEm"] = payload.criadoEm;
      o["filaRomaneio/" + obra + "/lancadoPorUid"] = payload.lancadoPorUid;
      o["filaRomaneio/" + obra + "/lancadoPorNome"] = payload.lancadoPorNome;
      o["filaRomaneio/" + obra + "/atualizadoEm"] = payload.criadoEm;
      o["filaRomaneio/" + obra + "/pronto"] = true;
      return update(o).then(function () { delete romaneioPendente[obra]; return n; });
    }
    if (romaneioPendente[obra] === "reservando") return Promise.reject(aviso("O romaneio desta obra já está sendo gerado."));
    if (romaneioPendente[obra]) return gravarNumero(romaneioPendente[obra]);
    romaneioPendente[obra] = "reservando";
    if (HGI.exemplo) {
      var fila = (mem.filaRomaneio && mem.filaRomaneio[obra]) || {};
      if (fila.romaneioNumero) { delete romaneioPendente[obra]; return Promise.reject(aviso("Esta obra já tem romaneio.")); }
      var n = calc.proximoRomaneio(mem.contadores.romaneio, ano);
      if (n == null) { delete romaneioPendente[obra]; return Promise.reject(aviso("Sequência do ano esgotada.")); }
      if (!calc.regraContadorAceita(mem.contadores.romaneio, n)) { delete romaneioPendente[obra]; return Promise.reject(aviso("Número recusado.")); }
      mem.contadores.romaneio = n;
      if (!mem.filaRomaneio[obra]) mem.filaRomaneio[obra] = {};
      mem.filaRomaneio[obra].romaneioNumero = n;
      romaneioPendente[obra] = n;
      return gravarNumero(n);
    }
    var refC = firebase.database().ref("contadores/romaneio");
    return refC.transaction(function (cur) {
      return calc.proximoRomaneio(cur, ano);
    }).then(function (res) {
      if (!res.committed) { delete romaneioPendente[obra]; throw aviso("Não foi possível reservar o número."); }
      var n = res.snapshot.val();
      var filaRef = firebase.database().ref("filaRomaneio/" + obra + "/romaneioNumero");
      return filaRef.transaction(function (cur) {
        if (cur == null || cur === n) return n;
      }).then(function (fr) {
        if (!fr.committed && fr.snapshot.val() !== n) { delete romaneioPendente[obra]; throw aviso("Esta obra já tem romaneio."); }
        romaneioPendente[obra] = n;
        return gravarNumero(n);
      });
    }).catch(function (e) {
      if (romaneioPendente[obra] === "reservando") delete romaneioPendente[obra];
      throw e;
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
