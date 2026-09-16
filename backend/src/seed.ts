import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados Lemoka Centro Automotivo...');

  // 1. Criar Usuários
  const senhaOperacional = await bcrypt.hash('lemoka123', 10);
  const senhaAdmin = await bcrypt.hash('admin123', 10);

  const userOp = await prisma.usuario.upsert({
    where: { email: 'operacional@lemoka.com.br' },
    update: {},
    create: {
      email: 'operacional@lemoka.com.br',
      senhaHash: senhaOperacional,
      papel: 'OPERACIONAL'
    }
  });

  const userAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@lemoka.com.br' },
    update: {},
    create: {
      email: 'admin@lemoka.com.br',
      senhaHash: senhaAdmin,
      papel: 'ADMIN'
    }
  });

  console.log('✅ Usuários criados:');
  console.log('   Operacional: operacional@lemoka.com.br / lemoka123');
  console.log('   Admin: admin@lemoka.com.br / admin123');

  // 2. Criar Mecânicos
  const mecanico1 = await prisma.mecanico.create({
    data: { nome: 'Marcos Souza', especialidade: 'Suspensão, Freios & Alinhamento' }
  });

  const mecanico2 = await prisma.mecanico.create({
    data: { nome: 'Carlos Eduardo', especialidade: 'Injeção Eletrônica & Motor' }
  });

  const mecanico3 = await prisma.mecanico.create({
    data: { nome: 'Roberto Lima', especialidade: 'Ar Condicionado & Elétrica' }
  });

  console.log('✅ Mecânicos cadastrados.');

  // 3. Despesas Fixas
  await prisma.despesaFixa.createMany({
    data: [
      { nome: 'Aluguel do Galpão', categoria: 'Imóvel', valor: 3500.00 },
      { nome: 'Energia Elétrica (Light)', categoria: 'Utilidades', valor: 680.00 },
      { nome: 'Água e Esgoto (Águas do Rio)', categoria: 'Utilidades', valor: 190.00 },
      { nome: 'Internet Fibra 600MB', categoria: 'Telecom', valor: 149.90 },
      { nome: 'Contabilidade Mensal', categoria: 'Serviços', valor: 500.00 }
    ]
  });

  console.log('✅ Despesas fixas cadastradas.');

  // 4. Sample Atendimentos
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const semanaPassada = new Date(hoje);
  semanaPassada.setDate(hoje.getDate() - 4);

  await prisma.atendimento.createMany({
    data: [
      {
        data: hoje,
        nomeCliente: 'João Pedro Silva',
        telefoneCliente: '(21) 98765-4321',
        veiculo: 'Chevrolet Onix 1.0 2021',
        mecanicoId: mecanico1.id,
        descricaoServico: 'Troca de pastilhas de freio dianteiras, discos e sangria do sistema de freios.',
        valorPecas: 280.00,
        valorServico: 220.00,
        valorTotal: 500.00,
        percentualComissao: 25.0,
        valorComissao: 55.00, // 25% de 220
        formaPagamento: 'PIX'
      },
      {
        data: hoje,
        nomeCliente: 'Mariana Costa',
        telefoneCliente: '(21) 97123-8899',
        veiculo: 'Hyundai HB20 1.6 2019',
        mecanicoId: mecanico2.id,
        descricaoServico: 'Limpeza de bicos injetores, troca de velas de ignição e filtro de combustível.',
        valorPecas: 190.00,
        valorServico: 260.00,
        valorTotal: 450.00,
        percentualComissao: 30.0,
        valorComissao: 78.00, // 30% de 260
        formaPagamento: 'CREDITO'
      },
      {
        data: ontem,
        nomeCliente: 'Fernando Ribeiro',
        telefoneCliente: '(21) 99876-1122',
        veiculo: 'Volkswagen Gol G6 2015',
        mecanicoId: mecanico1.id,
        descricaoServico: 'Troca dos 4 amortecedores, kit batente e alinhamento 3D.',
        valorPecas: 950.00,
        valorServico: 450.00,
        valorTotal: 1400.00,
        percentualComissao: 20.0,
        valorComissao: 90.00,
        formaPagamento: 'CREDITO'
      },
      {
        data: semanaPassada,
        nomeCliente: 'Patricia Souza',
        telefoneCliente: '(21) 98877-6655',
        veiculo: 'Fiat Toro 2.0 Diesel 2020',
        mecanicoId: mecanico3.id,
        descricaoServico: 'Higienização do ar condicionado, recarga de gás R134a e troca de filtro de cabine.',
        valorPecas: 120.00,
        valorServico: 230.00,
        valorTotal: 350.00,
        percentualComissao: 25.0,
        valorComissao: 57.50,
        formaPagamento: 'PIX'
      }
    ]
  });

  console.log('✅ Atendimentos de teste inseridos.');

  // 5. Sample Tráfego Semanal (Meta Ads)
  const mondayThisWeek = new Date(hoje);
  mondayThisWeek.setDate(hoje.getDate() - (hoje.getDay() === 0 ? 6 : hoje.getDay() - 1));

  await prisma.trafegoSemanal.create({
    data: {
      semanaReferencia: mondayThisWeek,
      mensagensRecebidas: 48,
      valorInvestido: 350.00
    }
  });

  console.log('✅ Registro de tráfego inserido.');
  console.log('🚀 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
