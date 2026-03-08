-- Products table (synced from WooCommerce)
create table products (
  id integer primary key,
  name text not null,
  slug text unique not null,
  type text default 'simple',
  description text,
  short_description text,
  price numeric(10,2),
  regular_price numeric(10,2),
  sale_price numeric(10,2),
  on_sale boolean default false,
  stock_status text default 'instock',
  images jsonb default '[]',
  categories jsonb default '[]',
  wc_updated_at timestamptz,
  synced_at timestamptz default now()
);

-- Product variations (cached from WC API, refreshed on demand)
create table product_variations (
  id integer primary key,
  product_id integer references products(id) on delete cascade,
  price numeric(10,2),
  regular_price numeric(10,2),
  sale_price numeric(10,2),
  on_sale boolean default false,
  stock_status text default 'instock',
  stock_quantity integer,
  attributes jsonb default '[]',
  image jsonb,
  cached_at timestamptz default now()
);

create index idx_product_variations_product_id on product_variations(product_id);

-- Product attributes (flattened for filtering)
create table product_attributes (
  id serial primary key,
  product_id integer references products(id) on delete cascade,
  attribute_name text not null,
  attribute_value text not null
);

-- Product categories (flattened for filtering)
create table product_categories (
  id serial primary key,
  product_id integer references products(id) on delete cascade,
  category_id integer not null,
  category_name text not null,
  category_slug text not null
);

-- Sync state
create table sync_state (
  id integer primary key default 1,
  last_synced_at timestamptz,
  status text default 'idle' check (status in ('idle', 'syncing', 'error')),
  products_synced integer default 0,
  errors text,
  started_at timestamptz,
  completed_at timestamptz
);

-- Insert initial sync state row
insert into sync_state (id, status) values (1, 'idle');

-- Indexes for fast filtering
create index idx_products_stock_status on products(stock_status);
create index idx_products_price on products(price);
create index idx_products_on_sale on products(on_sale);
create index idx_products_slug on products(slug);
create index idx_product_attributes_name_value on product_attributes(attribute_name, attribute_value);
create index idx_product_categories_category_id on product_categories(category_id);

-- Full text search
alter table products add column fts tsvector
  generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(short_description, ''))) stored;
create index idx_products_fts on products using gin(fts);
