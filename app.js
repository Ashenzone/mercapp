const API = '/api';

function formatarPreco(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

// Enquanto nao existe autenticacao (fase futura), guardamos a empresa
// "logada" no localStorage do navegador so para saber de quem sao os produtos.
function getEmpresaAtual() {
  return localStorage.getItem('mercapp_company_id');
}
function setEmpresaAtual(id) {
  localStorage.setItem('mercapp_company_id', id);
}

async function garantirEmpresa() {
  let id = getEmpresaAtual();
  if (id) return id;
  const resp = await fetch(`${API}/companies`);
  const empresas = await resp.json();
  if (empresas.length > 0) {
    setEmpresaAtual(empresas[0].id);
    return empresas[0].id;
  }
  const criar = await fetch(`${API}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Minha Empresa' }),
  });
  const nova = await criar.json();
  setEmpresaAtual(nova.id);
  return nova.id;
}

async function atualizarSaldoSidebar() {
  const id = await garantirEmpresa();
  const resp = await fetch(`${API}/companies/${id}`);
  if (!resp.ok) return;
  const empresa = await resp.json();
  const el = document.querySelector('[data-saldo]');
  if (el) el.textContent = formatarPreco(empresa.balance_cents);
}

document.addEventListener('DOMContentLoaded', () => {
  atualizarSaldoSidebar();
});
