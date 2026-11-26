'use strict';
/* =====================================================================
   NÉCTAR — Autorização de saída (tela)
   Quem lê o Arduino, busca no Supabase e imprime é o programa
   "servidor_impressora.py". Esta página só mostra o que está acontecendo.
   Abra sempre pelo "Iniciar Néctar Impressão.bat" (endereço http://127.0.0.1:8137).
   ===================================================================== */
// Aberto pelo programa (127.0.0.1:8137) → mesmo endereço. Aberto pelo link do GitHub Pages
// ou direto do arquivo → fala com o programa da impressora que roda NESTE computador.
const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && location.port === '8137';
const SERVIDOR = LOCAL ? '' : 'http://127.0.0.1:8137';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function msg(txt, tipo = '') { $('msg').textContent = txt; $('msg').className = 'msg ' + tipo; }
function pill(id, txt, ok) { $(id).textContent = txt; $(id).className = 'pill ' + (ok ? 'on' : ''); }

async function api(rota, corpo) {
  const r = await fetch(SERVIDOR + rota, corpo === undefined ? {} : { method: 'POST', body: JSON.stringify(corpo) });
  return r.json();
}

// Prévia do comprovante na tela
$('ticketWrap').appendChild($('ticket'));
function preencher(nome, hora, data) {
  $('tNome').textContent = nome;
  $('tHora').textContent = hora;
  $('tData').textContent = data;
}

// ---------- DADOS DA AUTORIZAÇÃO (vão para o aviso dos pais, não para o papel) ----------
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignora */ } };
$('autPor').value = lsGet('nectar_aut_por', '');
$('limparMotivo').checked = lsGet('nectar_limpar_motivo', true);
function renderNomesSalvos() {
  $('autPorLista').innerHTML = lsGet('nectar_aut_nomes', []).map(n => `<option value="${esc(n)}">`).join('');
}
renderNomesSalvos();

let cfgTimer = null;
async function enviarConfig() {
  const autorizado_por = $('autPor').value.trim();
  const motivo = $('motivo').value.trim();
  lsSet('nectar_aut_por', autorizado_por);
  if (autorizado_por) {
    const nomes = [autorizado_por, ...lsGet('nectar_aut_nomes', []).filter(n => n !== autorizado_por)].slice(0, 10);
    lsSet('nectar_aut_nomes', nomes);
  }
  $('cfgMsg').textContent = autorizado_por ? '' : '⚠️ Informe quem está autorizando — o responsável verá esse nome.';
  $('cfgMsg').className = 'msg w';
  try { await api('/config', { autorizado_por, motivo }); } catch { /* o status mostra o problema */ }
}
function agendarConfig() { clearTimeout(cfgTimer); cfgTimer = setTimeout(enviarConfig, 250); }
$('autPor').addEventListener('input', agendarConfig);
$('autPor').addEventListener('change', () => { enviarConfig(); renderNomesSalvos(); });
$('motivo').addEventListener('input', agendarConfig);
$('limparMotivo').addEventListener('change', () => lsSet('nectar_limpar_motivo', $('limparMotivo').checked));
document.querySelectorAll('#chips .chip').forEach(b => b.onclick = () => { $('motivo').value = b.textContent; enviarConfig(); });

// ---------- STATUS (leitor e impressora) ----------
let online = false;
async function atualizarStatus() {
  try {
    const s = await api('/status');
    if (!online) enviarConfig();          // programa (re)abriu: manda os dados atuais
    online = true;
    $('programaBox').hidden = true;
    pill('arduinoStatus', (s.arduino ? '🟢 ' : '🟡 ') + s.arduino_msg, !!s.arduino);
    pill('impStatus', s.impressora ? `🟢 Impressora: ${s.impressora}` : `🔴 Impressora: ${s.erro_impressora}`, !!s.impressora);
  } catch {
    online = false;
    $('programaBox').hidden = false;
    pill('arduinoStatus', '🔴 Programa da impressora fechado', false);
    pill('impStatus', '🔴 Abra o "Iniciar Néctar Impressão.bat" neste computador', false);
  }
}

// ---------- EVENTOS (tag lida, impresso, erro) ----------
let ultimoId = 0, primeiraCarga = true;
const hist = [];
async function buscarEventos() {
  if (!online) return;
  try {
    const { eventos } = await api('/eventos?desde=' + ultimoId);
    for (const e of eventos) {
      ultimoId = e.id;
      if (e.tipo === 'ok') {
        hist.unshift(e);
        preencher(e.nome, e.hora, e.data);
        $('btnReimprimir').disabled = false;
      }
      if (!primeiraCarga) {
        const cls = e.tipo === 'ok' ? (e.aviso_ok ? 'ok' : 'w') : e.tipo === 'info' ? '' : 'bad';
        let t = (e.tipo === 'ok' ? '✅ ' : e.tipo === 'info' ? 'ℹ️ ' : '⛔ ') + e.msg + (e.hora ? ` — ${e.hora}` : '');
        if (e.tipo === 'ok') t += e.aviso_ok ? ' · aviso enviado ao responsável 📣' : ` · ⚠️ aviso NÃO enviado: ${e.aviso_erro}`;
        msg(t, cls);
        if (e.tipo === 'ok' && $('limparMotivo').checked) { $('motivo').value = ''; enviarConfig(); }
      }
    }
    if (eventos.length) renderHist();
    primeiraCarga = false;
  } catch { /* o status mostra o problema */ }
}
function renderHist() {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const h = hist.filter(e => e.data === hoje);
  $('hist').innerHTML = h.length
    ? h.map(e => `<div class="hi"><div><b>${esc(e.nome)}</b><small>${esc(e.motivo || 'sem motivo')} · por ${esc(e.autorizado_por || 'não informado')}${e.aviso_ok ? ' · 📣 avisado' : ' · ⚠️ sem aviso'}</small></div><span>${esc(e.hora)}</span></div>`).join('')
    : '<p class="s">Nenhuma ainda.</p>';
}

async function ciclo() { await atualizarStatus(); await buscarEventos(); }
ciclo();
setInterval(ciclo, 1000);

// ---------- BOTÕES ----------
async function enviarTag(tag) {
  tag = String(tag || '').trim();
  if (!tag) return;
  if (!online) return msg('⛔ O programa da impressora está fechado. Abra o "Iniciar Néctar Impressão.bat".', 'bad');
  msg(`Buscando a tag ${tag.toUpperCase()}…`);
  try {
    const r = await api('/tag', { tag });
    if (!r.ok) msg('⛔ ' + r.erro, 'bad');
    buscarEventos();
  } catch (e) { msg('⛔ ' + e.message, 'bad'); }
}
$('btnManual').onclick = () => { enviarTag($('tagManual').value); $('tagManual').value = ''; };
$('tagManual').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btnManual').click(); } });
$('btnReimprimir').onclick = async () => {
  try { const r = await api('/reimprimir', {}); msg(r.ok ? `✅ Reimpresso: ${r.nome}` : '⛔ ' + r.erro, r.ok ? 'ok' : 'bad'); }
  catch { msg('⛔ O programa da impressora está fechado.', 'bad'); }
};
$('btnTeste').onclick = async () => {
  try { const r = await api('/teste', {}); msg(r.ok ? '✅ Teste enviado para ' + r.impressora : '⛔ ' + r.erro, r.ok ? 'ok' : 'bad'); }
  catch { msg('⛔ O programa da impressora está fechado.', 'bad'); }
};

// Leitor USB tipo teclado (se usar um): reconhece mesmo sem clicar no campo
let buf = '', ultTecla = 0;
document.addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const t = Date.now();
  if (t - ultTecla > 80) buf = '';
  ultTecla = t;
  if (e.key === 'Enter') { if (buf.length >= 4) enviarTag(buf); buf = ''; return; }
  if (e.key.length === 1) buf += e.key;
});

if (location.search.includes('teste')) preencher('Ana Souza', '14:35', new Date().toLocaleDateString('pt-BR'));
