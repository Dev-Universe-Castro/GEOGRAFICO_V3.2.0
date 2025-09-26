
-- Adiciona a coluna cnae na tabela revendas
ALTER TABLE revendas ADD COLUMN IF NOT EXISTS cnae VARCHAR(20);

-- Adiciona comentário para documentação
COMMENT ON COLUMN revendas.cnae IS 'Código CNAE da atividade econômica da revenda';
