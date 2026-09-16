# CLASSIFICAÇÃO DE OCORRÊNCIAS E CONFLITOS DO DRY RUN

**Sistema:** LEMOKA CENTRO AUTOMOTIVO  
**Data:** 09/09/2026  

---

## 1. Classificação das Ocorrências Encontradas por Nível de Risco

### Nível: CRÍTICO (Bloqueia Carga Real)
- **Status:** **NENHUM (0 OCORRÊNCIAS CRÍTICAS)**.
- **Análise:** Todos os dados fonte e relacionamentos de chave primária/estrangeira foram validados sem erros impeditivos.

---

### Nível: ALTO (Requer Atenção de Regra de Negócio)
1. **Produtos com Estoque Físico Negativo (243 Produtos):**
   - *Descrição:* 243 produtos possuem saldo em estoque negativo vindo do OSDIG (ex: `-38`, `-2`).
   - *Resolução:* Conforme regra aprovada, **não converter para zero**. Manter os saldos negativos originais e registrar no log `MigrationAuditRecord` sob o status `ALERTA`.

---

### Nível: MÉDIO (Tratado Automaticamente por Regra Mapeada)
1. **Clientes sem Documento CPF/CNPJ (758 Clientes):**
   - *Tratamento:* Associados via chave auxiliar (`Nome` + `Telefone`).
2. **OSs sem Placa de Veículo no Registro Original (24 OSs):**
   - *Tratamento:* Associadas diretamente ao cadastro do cliente sem criar veículo falso com placa fictícia.
3. **Mesma Placa com Nomes de Clientes Diferentes (9 Casos):**
   - *Tratamento:* Tratados como histórico legítimo de troca de proprietário do veículo.

---

### Nível: BAIXO (Apenas Informativo)
1. **Formatação de Moeda no Arquivo CSV:**
   - *Tratamento:* Sanitizados prefixos `R$` e espaços nas colunas de valor antes da conversão para `Float`.
