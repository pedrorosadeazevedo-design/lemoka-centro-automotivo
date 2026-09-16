# AUDITORIA DE INTEGRIDADE E RASTREABILIDADE PÓS-CARGA

**Sistema:** LEMOKA CENTRO AUTOMOTIVO  
**Data:** 09/09/2026  

---

## 1. Verificação de Integridade Referencial no Banco de Dados

- **OS sem Cliente:** **0** (100% das 1.827 OSs estão vinculadas a um `Cliente` no PostgreSQL).
- **OS sem Veículo:** **0** (100% das 1.827 OSs estão vinculadas a um `Vehicle` no PostgreSQL).
- **Contas a Receber sem Cliente:** **0** (100% dos 2.662 títulos vinculados a um `Cliente`).
- **Contas a Pagar sem Fornecedor:** **0** (100% dos 6 títulos vinculados a um `Fornecedor`).
- **Lote de Auditoria Registrado:** Registro `MigrationBatch` de ID único gravado na tabela `migration_batches` no PostgreSQL.
