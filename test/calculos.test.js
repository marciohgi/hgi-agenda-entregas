"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var c = require("../js/calculos.js");

function igual(a, b, msg) {
  assert.strictEqual(a, b, msg || (a + " !== " + b));
}

igual(c.situacaoEstoque("", "", "").saldo, null);
igual(c.situacaoEstoque("", "", "").status, "");
igual(c.situacaoEstoque(10, 4, "").saldo, 6);
igual(c.situacaoEstoque(10, 4, "").status, "OK");
igual(c.situacaoEstoque(10, 8, 5).saldo, 2);
igual(c.situacaoEstoque(10, 8, 5).status, "Repor");
igual(c.situacaoEstoque(10, 4, 5).status, "OK");
igual(c.situacaoEstoque(0, "", 1).saldo, 0);
igual(c.situacaoEstoque(0, "", 1).status, "Repor");
igual(c.situacaoEstoque("", 5, 0).saldo, -5);
igual(c.situacaoEstoque("", 5, 0).status, "Repor");

igual(c.saldoEntrega(10, 1), 9);
igual(c.saldoEntrega(10, null), null);
igual(c.saldoEntrega(null, 0), null);
igual(c.valorDeQtd(2, { valorKitEletrico: 1000 }), 2000);
igual(c.valorDeQtd(1, { valorKitEletrico: 500, valorKitQdc: 50 }), 550);
igual(c.valorDeQtd(1, {}), null);
igual(c.numOrNull("1.250,50"), 1250.5);
igual(c.numOrNull(0), 0);
igual(c.numOrNull(""), null);

igual(c.segundaDe("2026-11-23"), "2026-11-23");
igual(c.segundaDe("2026-11-22"), "2026-11-16");
igual(c.ano2deIso("2026-11-23"), 26);
igual(c.inicioMes("2026-11-23"), "2026-11-01");
igual(c.listarDias("2026-11-01", "2026-11-23").length, 23);
igual(c.formatRomaneio(260001), "260001");
igual(c.formatRomaneio(260001).slice(0, 2), "26");
igual(c.formatRomaneio(260001).slice(2), "0001");

igual(c.proximoRomaneio(null, 26), 260001);
igual(c.proximoRomaneio(260001, 26), 260002);
igual(c.proximoRomaneio(269999, 26), null);
igual(c.proximoRomaneio(260050, 27), 270001);
igual(c.proximoRomaneio(270010, 26), 270011);
igual(c.proximoRomaneio(null, 27), 270001);

var seq = null, vistos = {};
for (var i = 0; i < 20; i++) {
  seq = c.proximoRomaneio(seq, 26);
  assert.ok(c.regraContadorAceita(i === 0 ? null : seq - 1, seq));
  assert.ok(!vistos[seq], "número repetido " + seq);
  vistos[seq] = 1;
}
assert.ok(c.regraContadorAceita(260050, c.proximoRomaneio(260050, 27)));
assert.ok(!c.regraContadorAceita(260001, 260001));
assert.ok(!c.regraContadorAceita(260002, 260001));
assert.ok(!c.regraContadorAceita(260001, 260003));

var casos = [
  [null, 26], [260001, 26], [260050, 26], [269998, 26], [260050, 27], [269999, 27], [270010, 26], [null, 28]
];
casos.forEach(function (par) {
  var n = c.proximoRomaneio(par[0], par[1]);
  if (n === null) return;
  assert.ok(c.regraContadorAceita(par[0], n), "regra rejeitou " + par[0] + " → " + n);
});

var seed = c.seedExemplo("2026-11-23");
var movs = c.unirRomaneios(seed.movimentos, seed.romaneios);
var linhas = c.linhasFinanceiras(seed.empreendimentos, seed.movimentos, "2026-11-23", "2026-11-29");
var alfa = linhas.filter(function (l) { return l.id === "ex-alfa"; })[0];
var beta = linhas.filter(function (l) { return l.id === "ex-beta"; })[0];
var pend = linhas.filter(function (l) { return l.id === "ex-pendente"; })[0];
igual(alfa.qtdProjetadaSemana, 4);
igual(alfa.valorProjetadoSemana, 4000);
igual(alfa.qtdRealSemana, null);
igual(alfa.qtdEntregue, 1);
igual(alfa.saldo, 9);
igual(beta.qtdProjetadaSemana, 1);
igual(beta.valorProjetadoSemana, 550);
igual(beta.qtdRealSemana, 1);
igual(beta.valorRealSemana, 550);
igual(beta.saldo, 7);
igual(pend.valorProjetadoSemana, null);
igual(pend.qtdContratada, null);

var mes = c.periodoAcumulado(seed.empreendimentos, movs, "2026-11-01", "2026-11-23");
igual(mes.totais.projecaoQtd, 3);
igual(mes.totais.projecaoReais, 2550);
igual(mes.totais.produzidoQtd, 3);
igual(mes.totais.produzidoReais, 3000);
igual(mes.totais.entregaQtd, 2);
igual(mes.totais.entregaReais, 1550);
igual(mes.totais.romaneioN, 1);
igual(mes.totais.romaneioQtd, 1);
igual(mes.totais.romaneioReais, 550);
var dia23 = mes.dias.filter(function (d) { return d.data === "2026-11-23"; })[0];
igual(dia23.projecaoQtd, 3);
igual(dia23.projecaoAcumuladaQtd, 3);
igual(dia23.projecaoAcumuladaReais, 2550);
igual(dia23.produzidoAcumuladoQtd, 3);

var sem = c.periodoAcumulado(seed.empreendimentos, movs, "2026-11-23", "2026-11-29");
igual(sem.totais.projecaoQtd, 5);
igual(sem.totais.projecaoReais, 4550);
igual(sem.totais.entregaQtd, 1);
igual(sem.totais.entregaReais, 550);
igual(sem.totais.produzidoQtd, 2);

assert.strictEqual(c.CATALOGO_ALMOX.length, 9);
c.CATALOGO_ALMOX.forEach(function (item) {
  assert.ok(item.item && item.categoria && item.unidade);
  assert.ok(item.entrada === undefined && item.saida === undefined && item.estoqueMinimo === undefined);
});

var rules = JSON.parse(fs.readFileSync(path.join(__dirname, "../database.rules.json"), "utf8"));
var texto = JSON.stringify(rules);
assert.ok(!/"\.read"\s*:\s*true/.test(fs.readFileSync(path.join(__dirname, "../database.rules.json"), "utf8")));
assert.ok(texto.indexOf("almoxarife") >= 0);
assert.ok(rules.rules[".read"] === false);
assert.ok(rules.rules[".write"] === false);
assert.ok(rules.rules.entregas[".read"].indexOf("total") >= 0);
assert.ok(rules.rules.entregas[".read"].indexOf("almoxarife") < 0);
assert.ok(rules.rules.empreendimentos[".read"].indexOf("almoxarife") < 0);
assert.ok(rules.rules.producao[".read"].indexOf("almoxarife") < 0);
assert.ok(rules.rules.almoxarifado[".read"].indexOf("almoxarife") >= 0);
assert.ok(rules.rules.filaRomaneio[".read"].indexOf("almoxarife") >= 0);
assert.ok(rules.rules.romaneios[".read"].indexOf("almoxarife") >= 0);
assert.ok(JSON.stringify(rules.rules.filaRomaneio).indexOf("valorKit") < 0);
assert.ok(rules.rules.contadores.romaneio[".validate"].indexOf("260001") >= 0);

function walk(dir, acc) {
  fs.readdirSync(dir).forEach(function (name) {
    if (name === ".git" || name === "node_modules" || name === "test") return;
    var p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(html|js|css|json|md)$/.test(name)) acc.push(p);
  });
}
var arquivos = [];
walk(path.join(__dirname, ".."), arquivos);
arquivos.forEach(function (p) {
  var t = fs.readFileSync(p, "utf8");
  assert.ok(t.indexOf("AIza") < 0, "chave no arquivo " + p);
  assert.ok(!/Construapp/i.test(t), "outra empresa em " + p);
  assert.ok(!/\bAtum\b/.test(t), "Atum em " + p);
});

var readme = fs.readFileSync(path.join(__dirname, "../README.md"), "utf8");
["Márcio", "Jaqueline", "Heitor", "Vitor", "Zé", "almoxarife", "260001", "firebase login", "usuarios"].forEach(function (s) {
  assert.ok(readme.indexOf(s) >= 0, "README sem " + s);
});

console.log("ok", casos.length + 20, "checagens de romaneio e os totais do exemplo");
