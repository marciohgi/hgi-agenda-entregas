/* Dashboard do Heitor: copos semanais de FATURADO e RECEBIDO.
   FATURADO = entregue e com NF-e emitida, aguardando pagamento. RECEBIDO = contrato pago, entrou no caixa.
   Regra de semanas do mês (4 copos por mês, iguais ao rascunho do Márcio):
     S1 = dias 1 a 7 · S2 = 8 a 14 · S3 = 15 a 21 · S4 = 22 ao último dia do mês.
   FATURADO na semana N do mês M = soma das obras da Agenda com entrega nessa faixa
     (real quando a obra já foi entregue/concluída; previsto quando ainda não foi).
     É a previsão de recebimento da semana N do mês M+1.
   RECEBIDO na semana N do mês M = o que foi faturado na semana N do mês M-1 (o dinheiro que entra agora).
   Meta: R$ 200 mil por semana = 100% (por copo). Acumulado do mês: 4 × R$ 200 mil.
   Valor de cada obra: as mesmas regras do "Valor da semana" da Agenda (valor do kit × quantidade,
   valor projetado/real digitado na obra quando existe). Obra sem valor de kit fica fora da soma e é listada. */
(function () {
  var calc = HGICalc, X = window.HGIKitsExtra;
  var app = document.getElementById("app");
  var META = 200000, MARCA = 150000;
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var MES3 = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  var ents = null, emps = null;
  var hoje = calc.hojeSP();
  var mesSel = lerMes();
  var semSel = null;
  var animar = true, tvTimer = null, uid = 0;

  function lerMes() {
    var m = /(?:\?|&)mes=(\d{4}-\d{2})(?:&|$)/.exec(location.search);
    if (m) return m[1];
    try { var s = sessionStorage.getItem("hgi-heitor-mes"); if (/^\d{4}-\d{2}$/.test(s || "")) return s; } catch (e) {}
    return hoje.slice(0, 7);
  }
  function gravarMes(m) { mesSel = m; semSel = null; animar = true; try { sessionStorage.setItem("hgi-heitor-mes", m); } catch (e) {} }
  function somarMes(ym, n) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + "-" + (m < 9 ? "0" : "") + (m + 1);
  }
  function ultimoDia(ym) { return new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(); }
  function nomeMes(ym) { return MESES[+ym.slice(5, 7) - 1] + "/" + ym.slice(0, 4); }
  function mes3(ym) { return MES3[+ym.slice(5, 7) - 1]; }
  function semanas(ym) {
    var u = ultimoDia(ym), f = function (d) { return ym + "-" + (d < 10 ? "0" : "") + d; };
    return [[1, 7], [8, 14], [15, 21], [22, u]].map(function (r, i) { return { n: i + 1, ini: f(r[0]), fim: f(r[1]), d0: r[0], d1: r[1] }; });
  }
  function semanaDe(iso) { var d = +iso.slice(8, 10); return d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : 4; }
  function faixa(s) { return s.d0 + " a " + s.d1 + "/" + s.ini.slice(5, 7); }

  /* Uma obra num período [ini, fim]: parte real (entregue) e parte prevista. */
  function obraNoPeriodo(id, o, ini, fim, mapa) {
    var ks = X.kitsDe(o), bl = Object.keys(ks).map(function (k) { return ks[k]; });
    var main = X.chaveTotal(o), temParc = X.parciais(o).length > 0;
    var datas = X.datasNaSemana(o, hoje).filter(function (d) { return d >= ini && d <= fim; });
    var base = { id: id, nome: o.nome || id, status: o.status || o.statusCodigo || "", qtd: X.qnum(o) };
    if (!datas.length) {
      var mb = ks[main]; if (!mb) return null;
      var q = X.entregueNaSemana(o, ini, fim); if (!q) return null;
      var pv = X.precoKit(o, mb, mapa);
      base.data = ""; X.parciais(o).forEach(function (p) { if (p.data >= ini && p.data <= fim) base.data = p.data; });
      base.real = pv === null ? 0 : q * pv; base.prev = 0; base.semValor = pv === null; base.entregue = true; base.qtdPer = q;
      return base;
    }
    base.data = X.dataFinal(o) || datas[0];
    var tp = X.numV(o.valorProjetado), tr = X.numV(o.valorReal);
    var vp = 0, algum = false, falta = false, vr = 0, algumR = false, faltaR = false, resto = 0, qr = 0, qp = 0;
    bl.forEach(function (b) {
      var pr = X.precoKit(o, b, mapa);
      if (b.qtdPedido) { qp += b.qtdPedido; if (pr === null) falta = true; else { algum = true; vp += b.qtdPedido * pr; resto += Math.max(0, b.qtdPedido - (b.qtdEntregue || 0)) * pr; } }
      var qe = (b.id === main && temParc) ? X.entregueNaSemana(o, ini, fim) : (b.qtdEntregue || 0);
      if (qe > 0) { qr += qe; if (pr === null) faltaR = true; else { algumR = true; vr += qe * pr; } }
    });
    if (!bl.length && X.qnum(o)) { qp = X.qnum(o); falta = true; }
    var fechado = X.estaConcluido(o) || X.integral(o) || tr !== null;
    base.qtdPer = qp;
    if (fechado) {
      base.entregue = true;
      base.real = tr !== null ? tr : (algumR ? vr : 0);
      base.prev = 0;
      base.semValor = tr === null && (!algumR || faltaR);
    } else if (qr > 0) {
      base.entregue = true;
      base.real = algumR ? vr : 0;
      base.prev = resto;
      base.semValor = faltaR || falta;
    } else {
      base.entregue = false;
      base.real = 0;
      base.prev = tp !== null ? tp : (algum ? vp : 0);
      base.semValor = tp === null && (!algum || falta);
    }
    return base;
  }
  function periodo(ini, fim) {
    var mapa = X.mapaEmps(emps || {}), r = { ini: ini, fim: fim, real: 0, prev: 0, total: 0, obras: [], semValor: 0 };
    Object.keys(ents || {}).forEach(function (id) {
      var o = ents[id]; if (!o || typeof o !== "object") return;
      var x = obraNoPeriodo(id, o, ini, fim, mapa); if (!x) return;
      r.obras.push(x); r.real += x.real; r.prev += x.prev; if (x.semValor) r.semValor++;
    });
    r.total = r.real + r.prev;
    r.obras.sort(function (a, b) { return (a.data || "").localeCompare(b.data || "") || a.nome.localeCompare(b.nome); });
    return r;
  }
  function mesDados(ym) {
    var ss = semanas(ym);
    return { ym: ym, semanas: ss.map(function (s) { var p = periodo(s.ini, s.fim); p.s = s; return p; }) };
  }
  function somaMes(md) {
    var t = { real: 0, prev: 0, total: 0, semValor: 0, obras: 0 };
    md.semanas.forEach(function (p) { t.real += p.real; t.prev += p.prev; t.total += p.total; t.semValor += p.semValor; t.obras += p.obras.length; });
    return t;
  }
  function temDados(md) { return md.semanas.some(function (p) { return p.obras.length; }); }

  /* ---------- formatos ---------- */
  function brl(n) { return calc.formatBRL(n || 0); }
  function k(n) {
    n = n || 0;
    if (Math.abs(n) >= 1e6) return "R$ " + (n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi";
    if (Math.abs(n) >= 1e3) return "R$ " + (n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil";
    return brl(n);
  }
  function pct(v, meta) { return meta ? Math.round((v || 0) / meta * 100) : 0; }
  function esc(s) { return calc.esc(s); }

  /* ---------- copo (SVG) ---------- */
  function copo(p, opt) {
    opt = opt || {};
    var id = "hz" + (++uid), H = 150, T = 12, B = 160, alt = B - T;
    var real = p ? p.real : 0, prev = p ? p.prev : 0, tot = real + prev;
    var fr = Math.min(1, real / META), ft = Math.min(1, tot / META);
    var vazio = !p || (!p.obras.length);
    var y150 = T + alt * (1 - MARCA / META);
    var glass = "M8," + T + " L112," + T + " L98," + B + " Q97," + (B + 6) + " 90," + (B + 6) + " L30," + (B + 6) + " Q23," + (B + 6) + " 22," + B + " Z";
    var s = '<svg class="hz-copo-svg" viewBox="0 0 120 172" role="img" aria-label="' + esc((opt.rot || "") + " " + brl(tot) + " de R$ 200 mil") + '">';
    s += '<defs><clipPath id="' + id + 'c"><path d="' + glass + '"/></clipPath>';
    s += '<pattern id="' + id + 'h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="rgba(232,119,49,.28)"/><rect width="3.2" height="8" fill="rgba(232,119,49,.75)"/></pattern>';
    s += '<linearGradient id="' + id + 'g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff9a52"/><stop offset="1" stop-color="#c85d1c"/></linearGradient></defs>';
    s += '<path d="' + glass + '" class="hz-vidro"/>';
    s += '<g clip-path="url(#' + id + 'c)">';
    s += '<g class="hz-liq" data-f="' + ft + '" style="transform:translateY(175px)"><rect x="0" y="' + T + '" width="120" height="' + (alt + 10) + '" fill="url(#' + id + 'h)"/>' + (fr >= ft ? "" : onda("rgba(232,119,49,.75)", T)) + "</g>";
    s += '<g class="hz-liq" data-f="' + fr + '" style="transform:translateY(175px)"><rect x="0" y="' + T + '" width="120" height="' + (alt + 10) + '" fill="url(#' + id + 'g)"/>' + onda("#ff9a52", T) + "</g>";
    s += "</g>";
    s += '<line x1="4" x2="116" y1="' + T + '" y2="' + T + '" class="hz-l200"/>';
    s += '<line x1="12" x2="108" y1="' + y150 + '" y2="' + y150 + '" class="hz-l150"/>';
    s += '<text x="116" y="' + (T - 3) + '" class="hz-tm" text-anchor="end">200k</text>';
    s += '<text x="106" y="' + (y150 - 3) + '" class="hz-tm hz-tm2" text-anchor="end">150k</text>';
    s += '<path d="' + glass + '" class="hz-borda"/>';
    var pc = pct(tot, META);
    s += '<text x="60" y="' + (T + alt * 0.58) + '" text-anchor="middle" class="hz-pc' + (vazio ? " vz" : "") + '">' + (vazio ? "—" : pc + "%") + "</text>";
    s += "</svg>";
    if (tot > META) s += '<span class="hz-over">+' + (pc - 100) + "% acima</span>";
    return s;
  }
  function onda(cor, y) {
    return '<g class="hz-onda"><path d="M-120,' + (y + 3) + ' q15,-6 30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 V' + (y + 8) + ' H-120 Z" fill="' + cor + '"/></g>';
  }

  /* ---------- blocos ---------- */
  function kpi(rot, val, sub, cls, num) {
    return '<article class="hz-kpi ' + (cls || "") + '"><div class="hz-kpi-rot">' + esc(rot) + '</div><div class="hz-kpi-val"' + (num !== undefined ? ' data-count="' + num + '"' : "") + ">" + esc(val) + '</div><div class="hz-kpi-sub">' + sub + "</div></article>";
  }
  function barra(v, meta, real) {
    var p = Math.min(100, (v / meta) * 100), pr = Math.min(100, ((real || 0) / meta) * 100);
    return '<div class="hz-barra"><i class="hz-barra-prev" data-w="' + p + '"></i><i class="hz-barra-real" data-w="' + pr + '"></i><span class="hz-barra-75" style="left:' + (MARCA / META * 100) + '%"></span></div>';
  }
  function legenda() {
    return '<div class="hz-leg"><span><i class="lg-real"></i>Faturado (real: entregue, NF-e emitida)</span><span><i class="lg-prev"></i>Previsto na agenda (ainda não entregue)</span><span><i class="lg-150"></i>Marca 150k</span><span><i class="lg-200"></i>Meta 200k = 100%</span></div>';
  }
  function tendencia(lista) {
    var w = 960, h = 260, pl = 56, pr = 16, pt = 16, pb = 46, n = lista.length;
    var max = META * 1.25; lista.forEach(function (p) { max = Math.max(max, p.total * 1.1); });
    var x = function (i) { return pl + (n === 1 ? 0 : i * (w - pl - pr) / (n - 1)); };
    var y = function (v) { return pt + (h - pt - pb) * (1 - v / max); };
    function area(key) {
      var pts = lista.map(function (p, i) { return [x(i), y(key === "t" ? p.total : p.real)]; });
      var d = "M" + pts[0][0] + "," + pts[0][1];
      for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2; d += " C" + mx + "," + a[1] + " " + mx + "," + b[1] + " " + b[0] + "," + b[1]; }
      return { linha: d, area: d + " L" + pts[pts.length - 1][0] + "," + y(0) + " L" + pts[0][0] + "," + y(0) + " Z" };
    }
    var t = area("t"), r = area("r");
    var s = '<svg class="hz-trend" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" role="img" aria-label="Tendência semanal">';
    s += '<defs><linearGradient id="hzTA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E87731" stop-opacity=".55"/><stop offset="1" stop-color="#E87731" stop-opacity="0"/></linearGradient></defs>';
    [0, 0.25, 0.5, 0.75, 1, 1.25].forEach(function (f) { var v = META * f; if (v > max) return; s += '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="hz-grid"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="hz-ax">' + (v ? Math.round(v / 1000) + "k" : "0") + "</text>"; });
    s += '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + y(META) + '" y2="' + y(META) + '" class="hz-meta"/><text x="' + (w - pr) + '" y="' + (y(META) - 6) + '" text-anchor="end" class="hz-ax hz-axm">meta 200k</text>';
    s += '<path d="' + t.area + '" class="hz-ar-t"/><path d="' + t.linha + '" class="hz-ln-t"/>';
    s += '<path d="' + r.area + '" fill="url(#hzTA)"/><path d="' + r.linha + '" class="hz-ln-r"/>';
    lista.forEach(function (p, i) {
      var atual = hoje >= p.ini && hoje <= p.fim;
      s += '<circle cx="' + x(i) + '" cy="' + y(p.total) + '" r="' + (atual ? 6 : 4) + '" class="hz-pt' + (atual ? " at" : "") + '"><title>' + esc(mes3(p.ini.slice(0, 7)) + " S" + p.s.n + " · " + brl(p.total) + " (real " + brl(p.real) + ")") + "</title></circle>";
      s += '<text x="' + x(i) + '" y="' + (h - pb + 18) + '" text-anchor="middle" class="hz-ax' + (p.ini.slice(0, 7) === mesSel ? " sel" : "") + '">S' + p.s.n + "</text>";
      if (p.s.n === 1) s += '<text x="' + x(i) + '" y="' + (h - pb + 36) + '" class="hz-ax hz-axmes">' + mes3(p.ini.slice(0, 7)) + "</text>";
      if (p.s.n === 1 && i) s += '<line x1="' + (x(i) - (x(1) - x(0)) / 2) + '" x2="' + (x(i) - (x(1) - x(0)) / 2) + '" y1="' + pt + '" y2="' + (h - pb) + '" class="hz-div"/>';
    });
    s += "</svg>";
    return s;
  }

  function render() {
    if (ents === null || emps === null) return;
    uid = 0;
    hoje = calc.hojeSP();
    var mesAtual = hoje.slice(0, 7);
    var ant = somarMes(mesSel, -1), prox = somarMes(mesSel, 1);
    var M = mesDados(mesSel), A = mesDados(ant), P = mesDados(prox);
    var tm = somaMes(M), ta = somaMes(A);
    var nAtual = mesSel === mesAtual ? semanaDe(hoje) : (mesSel < mesAtual ? 4 : 1);
    var nSel = semSel || nAtual;
    var eSem = M.semanas[nSel - 1], fSem = A.semanas[nSel - 1];
    var ehAtual = mesSel === mesAtual && nSel === semanaDe(hoje);
    var semAnt = !temDados(A);

    var h = "";
    if (HGI.exemplo && HGIDados.avisoExemplo && HGIDados.avisoExemplo()) h += '<p class="aviso-exemplo">' + esc(HGIDados.avisoExemplo()) + "</p>";
    /* barra de filtros */
    h += '<div class="hz-barra-topo">';
    h += '<div class="hz-mes"><button type="button" class="hz-bt" data-mes="-1" aria-label="Mês anterior">◀</button>';
    h += '<select id="hz-sel-mes" aria-label="Mês">' + opcoesMes() + "</select>";
    h += '<button type="button" class="hz-bt" data-mes="1" aria-label="Próximo mês">▶</button>';
    if (mesSel !== mesAtual) h += '<button type="button" class="hz-bt lar" data-mes="0">Mês atual</button>';
    h += "</div>";
    h += '<div class="hz-acoes"><button type="button" class="hz-bt' + (tvTimer ? " lar" : "") + '" id="hz-tv" title="Troca a semana em destaque a cada 8 segundos">' + (tvTimer ? "■ Parar modo TV" : "▶ Modo TV") + '</button><button type="button" class="hz-bt" id="hz-cheia">⤢ Tela cheia</button></div>';
    h += "</div>";

    /* KPIs */
    h += '<section class="hz-kpis">';
    h += kpi("Faturado · " + (ehAtual ? "semana atual" : "S" + nSel), k(eSem.total), pct(eSem.total, META) + "% da meta · real " + esc(k(eSem.real)) + (eSem.prev ? " + previsto " + esc(k(eSem.prev)) : ""), "lar", eSem.total);
    h += kpi("Recebido · " + (ehAtual ? "semana atual" : "S" + nSel), semAnt ? "sem dados" : k(fSem.total), semAnt ? "Nada faturado em " + esc(nomeMes(ant)) + " no banco" : pct(fSem.total, META) + "% da meta · faturado em " + esc(mes3(ant)) + " S" + nSel, "", semAnt ? undefined : fSem.total);
    h += kpi("Faturado acumulado · " + mes3(mesSel), k(tm.total), pct(tm.total, META * 4) + "% de R$ 800 mil · real " + esc(k(tm.real)), "lar", tm.total);
    h += kpi("Recebido acumulado · " + mes3(mesSel), semAnt ? "sem dados" : k(ta.total), semAnt ? "Nada faturado em " + esc(mes3(ant)) + " no banco" : pct(ta.total, META * 4) + "% de R$ 800 mil", "", semAnt ? undefined : ta.total);
    h += kpi("Previsão de recebimento · " + mes3(prox), k(tm.total), "= faturado em " + esc(mes3(mesSel)) + " (real " + esc(k(tm.real)) + ", previsto " + esc(k(tm.prev)) + ")", "esc", tm.total);
    h += kpi("Obras sem valor de kit", String(tm.semValor), tm.semValor ? "ficam fora da soma em " + esc(mes3(mesSel)) + " · lançar o valor na Agenda" : "todas as obras do mês têm valor", tm.semValor ? "alerta" : "");
    h += "</section>";

    /* destaque: semana atual com dois copos grandes */
    h += '<section class="hz-hero">';
    h += '<div class="hz-card hz-hero-copos"><div class="hz-card-cab"><h2>' + (ehAtual ? "Semana atual" : "Semana em destaque") + " · S" + nSel + " · " + esc(faixa(eSem.s)) + '</h2><span class="hz-tag">' + esc(nomeMes(mesSel)) + "</span></div>";
    h += '<div class="hz-par grande">';
    h += '<div class="hz-copo-box"><div class="hz-copo-tit">FATURADO nesta semana</div>' + copo(eSem, { rot: "Faturado" }) + '<div class="hz-copo-val">' + esc(brl(eSem.total)) + '</div><div class="hz-copo-sub">real ' + esc(brl(eSem.real)) + (eSem.prev ? " · previsto " + esc(brl(eSem.prev)) : "") + '</div><div class="hz-seta">→ recebimento previsto em <b>' + esc(mes3(prox)) + " S" + nSel + "</b> (" + esc(faixa(P.semanas[nSel - 1].s)) + ")</div></div>";
    h += '<div class="hz-copo-box"><div class="hz-copo-tit">RECEBIDO nesta semana</div>' + copo(fSem, { rot: "Recebido" }) + '<div class="hz-copo-val">' + (fSem.obras.length ? esc(brl(fSem.total)) : "sem dados") + '</div><div class="hz-copo-sub">' + (fSem.obras.length ? "real " + esc(brl(fSem.real)) + (fSem.prev ? " · previsto " + esc(brl(fSem.prev)) : "") : "nada faturado no banco em " + esc(mes3(ant)) + " S" + nSel) + '</div><div class="hz-seta">← faturado em <b>' + esc(mes3(ant)) + " S" + nSel + "</b> (" + esc(faixa(fSem.s)) + ")</div></div>";
    h += "</div>" + legenda() + "</div>";

    /* acumulados */
    h += '<div class="hz-card hz-acum"><div class="hz-card-cab"><h2>Acumulado de ' + esc(MESES[+mesSel.slice(5, 7) - 1]) + '</h2><span class="hz-tag">meta R$ 800 mil (4 × 200k)</span></div>';
    h += '<div class="hz-acum-l"><div class="hz-acum-rot">Faturado no mês <b>' + esc(brl(tm.total)) + "</b><em>" + pct(tm.total, META * 4) + "%</em></div>" + barra(tm.total, META * 4, tm.real) + '<div class="hz-acum-sub">real ' + esc(brl(tm.real)) + " · previsto " + esc(brl(tm.prev)) + " · " + tm.obras + " obra(s)</div></div>";
    h += '<div class="hz-acum-l"><div class="hz-acum-rot">Recebido no mês <b>' + (semAnt ? "sem dados" : esc(brl(ta.total))) + "</b><em>" + (semAnt ? "" : pct(ta.total, META * 4) + "%") + "</em></div>" + barra(ta.total, META * 4, ta.real) + '<div class="hz-acum-sub">' + (semAnt ? "nada faturado em " + esc(nomeMes(ant)) + " no banco" : "faturado em " + esc(nomeMes(ant))) + "</div></div>";
    h += '<div class="hz-acum-l"><div class="hz-acum-rot">Previsão de recebimento em ' + esc(MESES[+prox.slice(5, 7) - 1]) + " <b>" + esc(brl(tm.total)) + "</b><em>" + pct(tm.total, META * 4) + "%</em></div>" + barra(tm.total, META * 4, tm.real) + '<div class="hz-acum-sub">vem do faturado em ' + esc(mes3(mesSel)) + "; o previsto só entra se a entrega e a NF-e acontecerem</div></div>";
    h += '<div class="hz-mini">' + M.semanas.map(function (p, i) {
      return '<div class="hz-mini-c"><span>S' + p.s.n + "</span><b>" + esc(k(p.total)) + "</b><small>recebe " + esc(mes3(prox)) + " S" + p.s.n + "</small></div>";
    }).join("") + "</div>";
    h += "</div></section>";

    /* as 4 semanas, como no desenho */
    h += '<section class="hz-card hz-mes-grid"><div class="hz-card-cab"><h2>' + esc(nomeMes(mesSel)) + " por semana · FATURADO × RECEBIDO</h2>" + '<span class="hz-tag">toque num copo para destacar a semana</span></div>';
    h += '<div class="hz-semanas"><div class="hz-rot-mes"><b>' + mes3(mesSel) + "</b><span>faturado</span></div>";
    M.semanas.forEach(function (p, i) {
      var f = A.semanas[i], at = mesSel === mesAtual && hoje >= p.ini && hoje <= p.fim;
      h += '<button type="button" class="hz-sem' + (i + 1 === nSel ? " sel" : "") + (at ? " atual" : "") + '" data-sem="' + (i + 1) + '">';
      h += '<div class="hz-sem-cab"><b>S' + p.s.n + "</b><span>" + esc(faixa(p.s)) + "</span>" + (at ? '<em>agora</em>' : "") + "</div>";
      h += '<div class="hz-par"><div class="hz-copo-box pq"><div class="hz-copo-tit">Faturado</div>' + copo(p, { rot: "Faturado S" + p.s.n }) + '<div class="hz-copo-val">' + esc(k(p.total)) + "</div></div>";
      h += '<div class="hz-copo-box pq"><div class="hz-copo-tit">Recebido</div>' + copo(f, { rot: "Recebido S" + p.s.n }) + '<div class="hz-copo-val">' + (f.obras.length ? esc(k(f.total)) : "sem dados") + "</div></div></div>";
      h += '<svg class="hz-curva" viewBox="0 0 100 26" preserveAspectRatio="none"><path d="M22,2 C22,20 60,6 78,22" /><path d="M72,18 L78,22 L71,24" /></svg>';
      h += '<div class="hz-mc rec"><span>Previsão de recebimento · ' + esc(mes3(prox)) + " S" + p.s.n + "</span><b>" + esc(brl(p.total)) + "</b><small>" + p.obras.length + " obra(s)" + (p.semValor ? " · " + p.semValor + " sem valor" : "") + "</small></div>";
      h += "</button>";
    });
    h += '<div class="hz-rot-mes dir"><b>' + mes3(prox) + "</b><span>recebe</span></div></div></section>";

    /* tendência + composição */
    var lista = A.semanas.concat(M.semanas, P.semanas);
    h += '<section class="hz-duo">';
    h += '<div class="hz-card"><div class="hz-card-cab"><h2>Tendência semanal · faturado (R$)</h2><span class="hz-tag">' + esc(mes3(ant) + " · " + mes3(mesSel) + " · " + mes3(prox)) + '</span></div>' + tendencia(lista) + '<div class="hz-leg"><span><i class="lg-real"></i>Faturado (real)</span><span><i class="lg-prev"></i>Faturado + previsto</span><span><i class="lg-200"></i>Meta 200k</span></div></div>';
    h += '<div class="hz-card hz-comp"><div class="hz-card-cab"><h2>Obras da S' + nSel + " · " + esc(faixa(eSem.s)) + '</h2><span class="hz-tag">' + eSem.obras.length + " obra(s)</span></div>";
    if (!eSem.obras.length) h += '<p class="hz-vazio">Nada faturado nem previsto na Agenda nesta semana.</p>';
    else {
      h += '<div class="hz-tab-wrap"><table class="hz-tab"><thead><tr><th>Obra</th><th>Data</th><th>Situação</th><th class="num">Valor</th></tr></thead><tbody>';
      eSem.obras.forEach(function (o) {
        var v = o.real + o.prev;
        h += "<tr><td>" + esc(o.nome) + (o.qtdPer ? ' <small>' + esc(calc.formatQtd(o.qtdPer)) + " kits</small>" : "") + "</td><td>" + esc(o.data ? calc.formatDataBR(o.data).slice(0, 5) : "") + '</td><td><span class="hz-st ' + (o.entregue ? "real" : "prev") + '">' + (o.entregue ? "Faturado" : "Previsto") + "</span></td>";
        h += '<td class="num">' + (o.semValor && !v ? '<span class="hz-sv">sem valor</span>' : esc(brl(v)) + (o.semValor ? ' <span class="hz-sv">parcial</span>' : "")) + "</td></tr>";
      });
      h += '</tbody><tfoot><tr><td colspan="3">Total da semana</td><td class="num">' + esc(brl(eSem.total)) + "</td></tr></tfoot></table></div>";
    }
    h += "</div></section>";

    /* legenda: termos e siglas que aparecem na tela */
    var ss = M.semanas, mm = mesSel.slice(5, 7);
    var L = [
      ["FATURADO", "Entregue ao cliente e com NF-e emitida, aguardando pagamento. Aqui: obras da Agenda entregues/concluídas na semana."],
      ["RECEBIDO", "Contrato pago, o valor entrou no caixa. Aqui: o que foi faturado na mesma semana do mês anterior (recebimento 4 semanas depois)."],
      ["Previsão de recebimento", "O faturado deste mês, que deve entrar no caixa na mesma semana do mês seguinte."],
      ["Previsto (listrado)", "Obra agendada na semana que ainda não foi entregue nem faturada. Só vira faturado quando a entrega e a NF-e acontecem."],
      ["Real (cheio)", "Parte já faturada: obra entregue/concluída na Agenda."],
      ["S1 · S2 · S3 · S4", "Semanas do mês: S1 = 1 a 7/" + mm + " · S2 = 8 a 14/" + mm + " · S3 = 15 a 21/" + mm + " · S4 = 22 a " + ss[3].s.d1 + "/" + mm + " (a S4 vai até o último dia do mês)."],
      ["JAN … DEZ", "Meses abreviados (ex.: " + mes3(mesSel) + " = " + MESES[+mm - 1] + ")."],
      ["NF-e", "Nota Fiscal eletrônica."],
      ["R$ · k · mil · mi", "Reais. k = mil reais (200k = R$ 200 mil); mi = milhões de reais."],
      ["Meta 200k", "Linha pontilhada branca no topo do copo = 100% da semana. Meta do mês = 4 × 200k = R$ 800 mil."],
      ["Marca 150k", "Linha laranja tracejada: meta semanal gravada no sistema até 31/12/2026. A partir de 01/01/2027 o sistema passa a usar 200k."],
      ["%", "Valor da semana ÷ R$ 200 mil (no mês, ÷ R$ 800 mil). \u201c+X% acima\u201d = passou da meta."],
      ["— · sem dados", "\u201c—\u201d no copo = nenhuma obra na semana. \u201csem dados\u201d = nada registrado no banco para o período."],
      ["sem valor · parcial", "Obra sem valor de kit lançado na Agenda; fica fora da soma (parcial = só parte dos kits tem valor)."],
      ["Tendência", "Linha cheia = faturado (real). Linha tracejada = faturado + previsto. Ponto maior = semana de hoje (\u201cagora\u201d)."]
    ];
    h += '<section class="hz-card hz-legenda" id="legenda"><div class="hz-card-cab"><h2>Legenda</h2><span class="hz-tag">termos e siglas desta página</span></div><dl class="hz-leg-grid">';
    L.forEach(function (x) { h += "<div><dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd></div>"; });
    h += '</dl><p class="hz-regra">Dados da Agenda de Entregas em tempo real · obra sem valor de kit fica fora da soma · hoje ' + esc(calc.formatDataBR(hoje)) + ".</p></section>";

    app.innerHTML = h;
    encher(animar);
    animar = false;
  }
  function opcoesMes() {
    var ms = {}, atual = hoje.slice(0, 7);
    for (var i = -6; i <= 3; i++) ms[somarMes(atual, i)] = 1;
    Object.keys(ents || {}).forEach(function (id) { var d = ents[id] && ents[id].data; if (/^\d{4}-\d{2}/.test(d || "")) ms[d.slice(0, 7)] = 1; });
    ms[mesSel] = 1;
    return Object.keys(ms).sort().map(function (m) { return '<option value="' + m + '"' + (m === mesSel ? " selected" : "") + ">" + esc(nomeMes(m)) + "</option>"; }).join("");
  }
  function encher(comAnim) {
    var liq = app.querySelectorAll(".hz-liq"), bars = app.querySelectorAll("[data-w]"), nums = app.querySelectorAll("[data-count]");
    function aplicar() {
      liq.forEach(function (g) { var f = +g.getAttribute("data-f"); g.style.transform = "translateY(" + (f > 0 ? 148 * (1 - f) : 175) + "px)"; });
      bars.forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
    }
    if (!comAnim) { app.classList.add("sem-anim"); aplicar(); requestAnimationFrame(function () { app.classList.remove("sem-anim"); }); return; }
    requestAnimationFrame(function () { requestAnimationFrame(aplicar); });
    nums.forEach(function (el) {
      var alvo = +el.getAttribute("data-count"), t0 = null, dur = 1100;
      if (!alvo) return;
      function passo(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = k(alvo * e); if (p < 1) requestAnimationFrame(passo); else el.textContent = k(alvo); }
      requestAnimationFrame(passo);
    });
  }
  function modoTV() {
    if (tvTimer) { clearInterval(tvTimer); tvTimer = null; render(); return; }
    tvTimer = setInterval(function () { var n = (semSel || (mesSel === hoje.slice(0, 7) ? semanaDe(hoje) : 1)); semSel = n % 4 + 1; animar = true; render(); }, 8000);
    render();
  }
  app.addEventListener("click", function (ev) {
    var t = ev.target.closest("button"); if (!t) return;
    if (t.hasAttribute("data-mes")) { var n = +t.getAttribute("data-mes"); gravarMes(n === 0 ? hoje.slice(0, 7) : somarMes(mesSel, n)); render(); return; }
    if (t.hasAttribute("data-sem")) { semSel = +t.getAttribute("data-sem"); animar = true; render(); var hero = app.querySelector(".hz-hero"); if (hero && window.innerWidth < 900) hero.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (t.id === "hz-tv") { modoTV(); return; }
    if (t.id === "hz-cheia") {
      var d = document;
      if (d.fullscreenElement) d.exitFullscreen(); else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen();
    }
  });
  app.addEventListener("change", function (ev) { if (ev.target.id === "hz-sel-mes") { gravarMes(ev.target.value); render(); } });
  document.addEventListener("fullscreenchange", function () { document.body.classList.toggle("hz-tela-cheia", !!document.fullscreenElement); });

  HGI.aoEntrar(function (s) {
    if (s.papel !== "total") { HGI.mostrarBloqueio("heitor"); return; }
    document.body.classList.add("hgi-ok");
    HGI.montarChrome("heitor");
    app.innerHTML = '<p class="hz-vazio">Carregando…</p>';
    var negou = function () { app.innerHTML = '<p class="hz-vazio">Sem permissão para ler a agenda.</p>'; };
    var pintar = HGI.agendarRender(app, render);
    HGIDados.escutar("entregas", function (v) { ents = v || {}; pintar(); }, negou);
    HGIDados.escutar("empreendimentos", function (v) { emps = v || {}; pintar(); }, function () { emps = {}; pintar(); });
  });
})();
