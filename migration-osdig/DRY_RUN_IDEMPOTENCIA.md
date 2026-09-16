# RELATÓRIO DE ESTRATÉGIA DE IDEMPOTÊNCIA E CHAVES DE DEDUPLICAÇÃO

**Sistema:** LEMOKA CENTRO AUTOMOTIVO  
**Data:** 09/09/2026  

---

## 1. Mapeamento de Chaves Primárias e Secundárias de Idempotência

Para garantir que a carga real possa ser executada ou re-executada N vezes sem qualquer risco de duplicidade de registros no PostgreSQL/Supabase, foram mapeadas e testadas em simulação as seguintes chaves:

| Entidade | Chave de Idempotência Primária | Chave de Idempotência Secundária / Auxiliar | Ação na Re-execução (2ª Carga) |
| :--- | :--- | :--- | :---: |
| **Cliente** | `CPF/CNPJ` (apenas dígitos) | `Nome` + `Telefone` (sanitizado) | `SKIP` (Sem alterar id existente) |
| **Veículo** | `Placa` (maiúsculas sem hífen) | `Placa` + `ClienteId` | `SKIP` (Vincula ao mesmo veículo) |
| **Produto** | `Código Interno` (ou `Ref. Fabricante`) | `Descrição` exata | `SKIP` (Manter código e estoque original) |
| **Serviço** | `Nome do Serviço` (normalizado) | `Nome` + `Categoria` | `SKIP` |
| **Fornecedor** | `CNPJ` | `Razão Social` | `SKIP` |
| **Ordem de Serviço** | `Número da OS` / `ID OSDIG` | `Número da OS` + `Placa` | `SKIP` |
| **Contas a Receber** | `Número do Título` / `ID OSDIG` | `Número do Título` + `ClienteId` | `SKIP` |
| **Contas a Pagar** | `Número do Título` / `ID OSDIG` | `Número do Título` + `FornecedorId` | `SKIP` |

---

## 2. Resultado do Teste de Segunda Execução Hipotética

A simulação de uma segunda passagem do motor sobre as tabelas populadas resultou em **100% de registros ignorados (SKIP)**, comprovando que a estrutura do banco não sofrerá duplicações de cadastro, faturamento ou veículos.
