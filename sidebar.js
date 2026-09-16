const NAV_ITEMS = [
  ['dashboard.html', 'Dashboard'],
  ['index.html', 'Marketplace'],
  ['marketchat.html', 'MarketChat'],
  ['meus-produtos.html', 'Meus Produtos'],
  ['criar-produto.html', 'Criar Produto'],
  ['marketing.html', 'Marketing'],
  ['trafego-pago.html', 'Trafego Pago'],
  ['afiliados.html', 'Afiliados'],
  ['analytics.html', 'Analytics'],
  ['tendencias.html', 'Tendencias'],
  ['pedidos.html', 'Pedidos'],
  ['avaliacoes.html', 'Avaliacoes'],
  ['equipe.html', 'Equipe'],
  ['socios.html', 'Socios'],
  ['casa.html', 'Casa e Moveis'],
  ['impostos.html', 'Impostos e Contas'],
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
      <div class="label" style="margin-top:12px;">Tempo de jogo</div>
      <div class="num" style="font-size:13px;color:#b7bacb;" data-relogio>-</div>
      <div style="margin-top:14px;font-size:12px;color:#6d7284;" data-empresa-nome></div>
      <a href="#" onclick="sair();return false;" style="display:block;margin-top:8px;font-size:12px;color:#6d7284;">Sair</a>
    </div>`;
}

document.addEventListener('DOMContentLoaded', montarSidebar);
