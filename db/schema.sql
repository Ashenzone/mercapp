-- ============================================================
-- MERCAPP - FASE 1: NUCLEO DO MARKETPLACE
-- Empresas, categorias e produtos.
-- Tabelas de tendencias, bots, avaliacoes, trafego pago e
-- analytics virao nas proximas fases, mas os campos aqui ja
-- deixam espaco (reputation, views, sales) para nao precisar
-- de migração destrutiva depois.
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  logo_url      TEXT,
  description   TEXT,
  reputation    NUMERIC(3,2) NOT NULL DEFAULT 0,      -- media 0-5, calculada por avaliacoes (fase 5)
  balance_cents BIGINT NOT NULL DEFAULT 500000,        -- saldo inicial: R$ 5.000,00 em centavos
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(60) NOT NULL UNIQUE,
  slug  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id       INTEGER REFERENCES categories(id),
  name              VARCHAR(150) NOT NULL,
  description       TEXT,
  product_type      VARCHAR(30) NOT NULL DEFAULT 'ebook',
    -- ebook | curso | template | software | servico | fisico | digital | outro
  niche             VARCHAR(80),
  keywords          TEXT[],                     -- ex: {'ia','produtividade'}
  target_audience   VARCHAR(150),
  price_cents       INTEGER NOT NULL CHECK (price_cents >= 0),
  cost_cents        INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  stock_quantity    INTEGER,                    -- NULL = ilimitado (produtos digitais)
  cover_image_url   TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'active', -- active | paused | draft
  views_count       INTEGER NOT NULL DEFAULT 0,
  sales_count       INTEGER NOT NULL DEFAULT 0,
  rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_company  ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_status   ON products(status);

-- categorias iniciais
INSERT INTO categories (name, slug) VALUES
  ('Inteligencia Artificial', 'ia'),
  ('Games', 'games'),
  ('Tecnologia', 'tecnologia'),
  ('Fitness', 'fitness'),
  ('Educacao', 'educacao'),
  ('Financas', 'financas'),
  ('Programacao', 'programacao'),
  ('Redes Sociais', 'redes-sociais'),
  ('Marketing Digital', 'marketing-digital'),
  ('Design', 'design'),
  ('Produtividade', 'produtividade'),
  ('Outros', 'outros')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FASE 2: TENDENCIAS, BOTS, COMPRAS E AVALIACOES
-- ============================================================

CREATE TABLE IF NOT EXISTS trends (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(120) NOT NULL,
  category_id         INTEGER REFERENCES categories(id),
  popularity          NUMERIC(6,2) NOT NULL DEFAULT 30,  -- 0-100
  growth              NUMERIC(6,2) NOT NULL DEFAULT 0,   -- % de variacao no ultimo ciclo
  momentum            VARCHAR(20) NOT NULL DEFAULT 'estavel', -- subindo | estavel | caindo | pico | esgotada
  estimated_duration_days INTEGER NOT NULL DEFAULT 30,
  source              VARCHAR(20) NOT NULL DEFAULT 'seed',   -- seed | real
  history             JSONB NOT NULL DEFAULT '[]',           -- [{t, popularity}]
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category_id);

CREATE TABLE IF NOT EXISTS bots (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(80) NOT NULL,
  profile             VARCHAR(30) NOT NULL,
    -- curioso | economico | impulsivo | exigente | fiel | cacador_novidades | sensivel_preco | influenciado_avaliacoes
  favorite_category_id INTEGER REFERENCES categories(id),
  budget_cents        INTEGER NOT NULL DEFAULT 20000,
  loyalty_company_id  UUID REFERENCES companies(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  budget_cents      INTEGER NOT NULL CHECK (budget_cents > 0),
  duration_days     INTEGER NOT NULL DEFAULT 7,
  audience          VARCHAR(150),
  region            VARCHAR(80) DEFAULT 'Brasil',
  objective         VARCHAR(20) NOT NULL DEFAULT 'vendas', -- visualizacoes | cliques | vendas | reconhecimento
  status            VARCHAR(20) NOT NULL DEFAULT 'active', -- active | paused | finished
  impressions       INTEGER NOT NULL DEFAULT 0,
  clicks            INTEGER NOT NULL DEFAULT 0,
  spent_cents       INTEGER NOT NULL DEFAULT 0,
  revenue_cents     INTEGER NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_product ON campaigns(product_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company ON campaigns(company_id);

CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id),
  bot_id        INTEGER REFERENCES bots(id),
  campaign_id   UUID REFERENCES campaigns(id),
  price_cents   INTEGER NOT NULL,
  source        VARCHAR(20) NOT NULL DEFAULT 'organico', -- organico | anuncio
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id),
  bot_id        INTEGER REFERENCES bots(id),
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

CREATE TABLE IF NOT EXISTS market_events (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(30) NOT NULL, -- nova_tendencia | queda_interesse | viralizacao | crise | evento_global
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  category_id   INTEGER REFERENCES categories(id),
  effect        JSONB NOT NULL DEFAULT '{}', -- ex: {"popularity_delta": 20}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS simulation_state (
  id          BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  tick_count  BIGINT NOT NULL DEFAULT 0,
  last_tick   TIMESTAMPTZ,
  last_real_trends_fetch TIMESTAMPTZ
);
INSERT INTO simulation_state (id) VALUES (true) ON CONFLICT DO NOTHING;

-- tendencias iniciais (uma por categoria, para o mercado nao comecar vazio)
INSERT INTO trends (name, category_id, popularity, growth, momentum, estimated_duration_days)
SELECT 'Alta de ' || c.name, c.id, 30 + (random() * 30)::int, (random() * 10)::numeric(6,2), 'subindo', 30 + (random()*30)::int
FROM categories c
WHERE NOT EXISTS (SELECT 1 FROM trends);

-- bots iniciais (variedade de perfis e categorias favoritas)
INSERT INTO bots (name, profile, favorite_category_id, budget_cents)
SELECT
  'Bot-' || gs,
  (ARRAY['curioso','economico','impulsivo','exigente','fiel','cacador_novidades','sensivel_preco','influenciado_avaliacoes'])[1 + floor(random()*8)::int],
  (SELECT id FROM categories ORDER BY random() LIMIT 1),
  (5000 + floor(random()*45000))::int
FROM generate_series(1, 60) AS gs
WHERE NOT EXISTS (SELECT 1 FROM bots);
