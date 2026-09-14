const NAV_ITEMS = [
  ['dashboard.html', 'Dashboard'],
  ['index.html', 'Marketplace'],
  ['meus-produtos.html', 'Meus Produtos'],
  ['criar-produto.html', 'Criar Produto'],
  ['marketing.html', 'Marketing'],
  ['trafego-pago.html', 'Trafego Pago'],
  ['analytics.html', 'Analytics'],
  ['tendencias.html', 'Tendencias'],
  ['pedidos.html', 'Pedidos'],
  ['avaliacoes.html', 'Avaliacoes'],
  ['empresa.html', 'Empresa'],
  ['economia.html', 'Economia'],
  ['ranking.html', 'Ranking'],
];

function montarSidebar() {
  const el = document.querySelector('.sidebar');
  if (!el) return;
  const atual = location.pathname.split('/').pop() || 'index.html';
  const nav = NAV_ITEMS.map(
    ([href, label]) => `<a href="${href}" class="${href === atual ? 'active' : ''}">${label}</a>`
  ).join('');
  el.innerHTML = `
    <div class="brand">Merc<span>app</span></div>
    <div class="tagline">simulador de negocios digitais</div>
    <nav>${nav}</nav>
    <div class="balance">
      <div class="label">Saldo</div>
      <div class="value num" data-saldo>-</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', montarSidebar);
