const API = '/api';

function formatarPreco(centavos) {
  return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

function getEmpresaAtual() {
  return localStorage.getItem('mercapp_company_id');
}
function getEmailAtual() {
  return localStorage.getItem('mercapp_email');
}
function sair() {
  localStorage.removeItem('mercapp_company_id');
  localStorage.removeItem('mercapp_email');
  location.href = 'login.html';
}

// Agora cada jogador tem a propria empresa, ligada ao e-mail dele.
// Sem login, manda pra tela de login em vez de cair numa empresa compartilhada.
async function garantirEmpresa() {
  const id = getEmpresaAtual();
  if (!id) {
    if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
    throw new Error('sem login');
  }
  return id;
}

// Converte um arquivo escolhido (PC ou galeria do celular) em base64,
// envia pro servidor e devolve a URL interna da imagem.
async function enviarImagem(file) {
  if (!file) return null;
  const base64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(new Error('Falha ao ler o arquivo.'));
    r.readAsDataURL(file);
  });
  const resp = await fetch(`${API}/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: base64, mime_type: file.type }),
  });
  const dados = await resp.json();
  if (!resp.ok) throw new Error(dados.erro || 'Erro ao enviar imagem.');
  return dados.url;
}

// Liga um <input type="file"> a um preview + campo escondido com a URL final.
function ligarSeletorDeImagem(inputFile, inputHidden, preview) {
  inputFile.addEventListener('change', async () => {
    const file = inputFile.files[0];
    if (!file) return;
    if (preview) {
      preview.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
      preview.textContent = '';
    }
    try {
      toast('Enviando imagem...');
      const url = await enviarImagem(file);
      inputHidden.value = url;
      toast('Imagem pronta.');
    } catch (err) {
      toast(err.message);
    }
  });
}

async function atualizarSaldoSidebar() {
  const id = getEmpresaAtual();
  if (!id) return;
  const resp = await fetch(`${API}/companies/${id}`);
  if (!resp.ok) return;
  const empresa = await resp.json();
  const el = document.querySelector('[data-saldo]');
  if (el) el.textContent = formatarPreco(empresa.balance_cents);
  const elNome = document.querySelector('[data-empresa-nome]');
  if (elNome) elNome.textContent = empresa.name;
}

async function mostrarRelogio() {
  const el = document.querySelector('[data-relogio]');
  if (!el) return;
  try {
    const resp = await fetch(`${API}/simulation/status`);
    const s = await resp.json();
    if (s.game_day) el.textContent = `Mes ${s.game_month} · Dia ${s.game_day}/7`;
  } catch (e) { /* silencioso */ }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('login.html') && !getEmpresaAtual()) {
    location.href = 'login.html';
    return;
  }
  atualizarSaldoSidebar();
  mostrarRelogio();
});
