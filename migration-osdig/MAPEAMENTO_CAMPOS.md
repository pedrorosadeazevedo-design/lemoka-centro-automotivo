# MAPEAMENTO COMPLETO DE CAMPOS OSDIG → LEMOKA

**Sistema:** LEMOKA CENTRO AUTOMOTIVO  
**Data:** 09/09/2026  

---

## 1. Mapeamento da Entidade CLIENTES

| CAMPO OSDIG | CAMPO DESTINO LEMOKA (`Cliente`) | TIPO | OBRIGATÓRIO? | REGRA DE CONVERSÃO / OBSERVAÇÃO |
| :--- | :--- | :--- | :---: | :--- |
| `Tipo` | `tipoPessoa` | String | SIM | Mapear `'Fisica'` → `'PF'`, `'Juridica'` → `'PJ'` |
| `CPF/CNPJ` | `documento` | String | NÃO | Sanitizar pontuações (manter apenas dígitos). Preservar nulo se ausente. |
| `RG/IE` | `rgIe` | String | NÃO | Copiar texto original limpo |
| `Nome/Razão Social` | `nome` | String | SIM | Se ausente, preencher com Nome Fantasia ou `'Cliente Não Identificado'` |
| `Nome Fantasia` | `nomeFantasia` | String | NÃO | Copiar texto original |
| `Email` | `email` | String | NÃO | Converter para minúsculas |
| `Celular` / `Telefone Comercial` | `telefone` | String | NÃO | Priorizar `Celular`, utilizar `Telefone Comercial` como fallback |
| `CEP(Principal)` | `cep` | String | NÃO | Manter apenas números |
| `Endereço(Principal)` | `endereco` | String | NÃO | Copiar texto original |
| `Nº(Principal)` | `numero` | String | NÃO | Copiar texto original |
| `Complemento(Principal)`| `complemento` | String | NÃO | Copiar texto original |
| `Bairro(Principal)` | `bairro` | String | NÃO | Copiar texto original |
| `Cidade(Principal)` | `cidade` | String | NÃO | Copiar texto original |
| `Estado(Principal)` | `uf` | String | NÃO | Converter para maiúsculas (2 letras UF) |
| `Observações` | `observacoes` | String | NÃO | Manter notas técnicas históricas do cliente |
| `Data de Cadastro` | `createdAt` | DateTime | SIM | Parse formato `DD/MM/YYYY` → ISO `DateTime` |

---

## 2. Mapeamento da Entidade VEÍCULOS (Provenientes da OS / Vendas OSDIG)

| CAMPO OSDIG (CSV) | CAMPO DESTINO LEMOKA (`Vehicle`) | TIPO | OBRIGATÓRIO? | REGRA DE CONVERSÃO / OBSERVAÇÃO |
| :--- | :--- | :--- | :---: | :--- |
| `PLACA` | `placa` | String | SIM | Sanitizar espaços/hífen. Converter para maiúsculas (ex: `LRW0D14`) |
| `VEÍCULO MARCA` | `marca` | String | SIM | Se ausente no CSV, preencher como `'NÃO INFORMADA'` |
| `VEÍCULO MODELO` | `modelo` | String | SIM | Se ausente no CSV, preencher como `'MODELO DESCONHECIDO'` |
| `VEÍCULO MOTORIZAÇÃO` | `motorizacao` | String | NÃO | Copiar texto original (ex: `'1.6'`, `'2.0'`) |
| `VEÍCULO ANO FABRICAÇÃO` | `anoModelo` / `anoFabricacao` | Int | NÃO | Parse numérico de ano de 4 dígitos |
| *Vínculo de Cliente* | `clienteId` | String (FK) | SIM | Vincular ao `Cliente.id` mapeado por CPF/CNPJ ou Nome |

---

## 3. Mapeamento da Entidade PRODUTOS

| CAMPO OSDIG | CAMPO DESTINO LEMOKA (`Produto`) | TIPO | OBRIGATÓRIO? | REGRA DE CONVERSÃO / OBSERVAÇÃO |
| :--- | :--- | :--- | :---: | :--- |
| `Código` | `codigoInterno` / `osdigId` | String | SIM | Manter ID numérico/código original |
| `Ref. Fabricante` | `referenciaFabricante` | String | NÃO | Copiar código de referência |
| `Localização` | `localizacao` | String | NÃO | Copiar prateleira/gaveta |
| `Descrição` | `descricao` | String | SIM | Descrição da peça |
| `Estoque` | `estoqueFisico` | Int | SIM | **Preservar valores negativos históricos** (sem converter para 0) |
| `Reservado` | `estoqueReservado` | Int | SIM | Converter para inteiro |
| `Marca` | `marca` | String | NÃO | Marca/Fabricante |
| `Valor` | `precoVenda` | Float | SIM | Parse numérico monetário |
| `Status` | `ativo` | Boolean | SIM | Mapear `'Ativo'` → `true`, outros → `false` |

---

## 4. Mapeamento da Entidade SERVIÇOS

| CAMPO OSDIG | CAMPO DESTINO LEMOKA (`Servico`) | TIPO | OBRIGATÓRIO? | REGRA DE CONVERSÃO / OBSERVAÇÃO |
| :--- | :--- | :--- | :---: | :--- |
| `Descrição` | `nome` | String | SIM | Nome do serviço de oficina |
| `Valor (R$)` | `preco` | Float | SIM | Tratar prefixo `R$` e vírgula decimal |
| `Família` | `categoria` | String | NÃO | Categoria do serviço (ex: `DIRECAO`, `SUSPENSAO`) |
| `Garantia` | `observacoes` | String | NÃO | Informação de garantia |
| `Status` | `ativo` | Boolean | SIM | Mapear `'Ativo'` → `true` |

---

## 5. Mapeamento da Entidade CONTAS A RECEBER

| CAMPO OSDIG | CAMPO DESTINO LEMOKA (`ContaReceber`) | TIPO | OBRIGATÓRIO? | REGRA DE CONVERSÃO / OBSERVAÇÃO |
| :--- | :--- | :--- | :---: | :--- |
| `Título` | `numeroTitulo` / `osdigId` | String | SIM | Número identificador do título no OSDIG |
| `Venda` | `ordemServicoId` | String | NÃO | ID/Número da OS/Venda vinculada |
| `Cliente` | `clienteId` | String (FK) | SIM | Vincular ao cliente correspondente no Lemoka |
| `Vencimento` | `dataVencimento` | DateTime | SIM | Parse data `DD/MM/YYYY` |
| `Data de emissão` | `dataEmissao` | DateTime | SIM | Parse data `DD/MM/YYYY` |
| `Valor Bruto` | `valorBruto` | Float | SIM | Valor do título |
| `Desconto` | `valorDesconto` | Float | SIM | Valor de desconto concedido |
| `Valor Líquido` | `valorLiquido` | Float | SIM | Valor final a receber |
| `Valor pago` | `valorPago` | Float | SIM | Valor já baixado |
| `Valor em aberto` | `valorEmAberto` | Float | SIM | Saldo devedor |
| `Status` | `status` | String | SIM | Mapear `'Aberto'` → `'PENDENTE'`, `'Pago'`/`'Finalizado'` → `'PAGO'` |
| `Data da baixa` | `dataPagamento` | DateTime | NÃO | Data de liquidação do título |

---

## 6. Mapeamento da Entidade FORNECEDORES & CONTAS A PAGAR

| CAMPO OSDIG | CAMPO DESTINO LEMOKA | TIPO | OBRIGATÓRIO? | REGRA DE CONVERSÃO |
| :--- | :--- | :--- | :---: | :--- |
| `CNPJ` | `Supplier.cnpj` | String | SIM | Sanitizar CNPJ do fornecedor |
| `Razão Social` | `Supplier.razaoSocial` | String | SIM | Razão Social |
| `Contas a Pagar -> Título` | `ContaPagar.numeroTitulo` | String | SIM | Número do título financeiro a pagar |
| `Contas a Pagar -> Fornecedor`| `ContaPagar.fornecedorId` | String (FK) | SIM | Vínculo com o fornecedor |
| `Contas a Pagar -> Status` | `ContaPagar.status` | String | SIM | `'Finalizado'` → `'PAGO'`, `'Aberto'` → `'PENDENTE'` |

---

## 7. Mapeamento da Entidade OS / VENDAS (CSV)

| CAMPO OSDIG (CSV) | CAMPO DESTINO LEMOKA (`OrdemServico`) | TIPO | OBRIGATÓRIO? | REGRA DE CONVERSÃO / OBSERVAÇÃO |
| :--- | :--- | :--- | :---: | :--- |
| `ID` / `NÚMERO DA OS` | `numeroOs` / `osdigId` | Int / String | SIM | Número identificador da OS original |
| `STATUS` / `ETAPA` | `status` | Enum | SIM | Mapear `'CONCLUÍDO'`/`'PÓS - VENDAS'` → `COMPLETED`/`BILLED`, `'NORMAL'` → `APPROVED` |
| `PLACA` | `veiculoId` | String (FK) | SIM | Vínculo com o `Vehicle` criado pela placa |
| `NOME` | `clienteId` | String (FK) | SIM | Vínculo com o `Cliente` criado |
| `VALOR` | `valorTotal` | Float | SIM | Valor total da OS |
| `CLIENTE DESDE` | `createdAt` | DateTime | SIM | Parse data de abertura da OS |
