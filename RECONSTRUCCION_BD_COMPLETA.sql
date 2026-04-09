-- ============================================================
-- RECONSTRUCCION COMPLETA DE BASE DE DATOS - SOLARSUR
-- Preserva usuarios existentes y sus hashes.
-- Ejecutar en MySQL/MariaDB.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS inventory_movements;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS company;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS providers;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS user_dashboard_layout;
DROP TABLE IF EXISTS user_permissions;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- USERS
-- No se elimina ni se repuebla. Solo se asegura estructura.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('SUPERADMIN','ADMIN','SALES','WAREHOUSE') NOT NULL DEFAULT 'ADMIN',
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL;

-- ============================================================
-- USER PERMISSIONS
-- ============================================================

CREATE TABLE user_permissions (
  user_id INT NOT NULL,
  permission_key VARCHAR(80) NOT NULL,
  allowed TINYINT(1) DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_key),
  CONSTRAINT fk_user_permissions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- ============================================================
-- DASHBOARD LAYOUT
-- ============================================================

CREATE TABLE user_dashboard_layout (
  user_id INT NOT NULL,
  module_id VARCHAR(40) NOT NULL,
  position INT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, module_id),
  CONSTRAINT fk_user_dashboard_layout_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40),
  dni VARCHAR(15) NULL,
  ruc VARCHAR(11) NULL,
  email VARCHAR(160) NULL,
  address VARCHAR(255),
  district VARCHAR(100) NULL,
  city VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- PROVIDERS
-- ============================================================

CREATE TABLE providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  contact VARCHAR(160),
  phone VARCHAR(40),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(80),
  qty INT DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  provider_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_provider
    FOREIGN KEY (provider_id) REFERENCES providers(id)
    ON DELETE SET NULL
);

-- ============================================================
-- COMPANY
-- ============================================================

CREATE TABLE company (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) DEFAULT 'SolarSur',
  address VARCHAR(255),
  phone VARCHAR(40),
  email VARCHAR(160),
  ruc VARCHAR(20),
  logo LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO company (name)
SELECT 'SolarSur'
WHERE NOT EXISTS (SELECT 1 FROM company);

-- ============================================================
-- QUOTES
-- ============================================================

CREATE TABLE quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  total DECIMAL(10,2) DEFAULT 0,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quotes_client
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE quote_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote_id INT NOT NULL,
  inventory_id INT NULL,
  description VARCHAR(255),
  qty INT DEFAULT 1,
  price DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_items_quote
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_quote_items_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    ON DELETE SET NULL
);

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  total DECIMAL(10,2) DEFAULT 0,
  source_quote_id INT NULL,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_client
    FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT fk_sales_source_quote
    FOREIGN KEY (source_quote_id) REFERENCES quotes(id)
    ON DELETE SET NULL
);

CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  inventory_id INT NULL,
  description VARCHAR(255),
  qty INT DEFAULT 1,
  price DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sale_items_sale
    FOREIGN KEY (sale_id) REFERENCES sales(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    ON DELETE SET NULL
);

-- ============================================================
-- INVENTORY MOVEMENTS
-- ============================================================

CREATE TABLE inventory_movements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  inventory_id INT NOT NULL,
  user_id INT NULL,
  type ENUM('IN','OUT','ADJUST') NOT NULL,
  qty INT NOT NULL,
  reason VARCHAR(255),
  ref_entity VARCHAR(50),
  ref_id BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_movements_inventory
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  CONSTRAINT fk_inventory_movements_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','STOCK_IN','STOCK_OUT','RESTORE'),
  entity VARCHAR(50),
  entity_id BIGINT,
  before_json JSON,
  after_json JSON,
  ip VARCHAR(45),
  user_agent VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

-- ============================================================
-- FIN
-- ============================================================