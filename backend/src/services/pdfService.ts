import PDFDocument from 'pdfkit';
import { Atendimento, Mecanico, EmpresaConfig } from '@prisma/client';
import path from 'path';
import fs from 'fs';

type AtendimentoComMecanico = Atendimento & { mecanico?: Mecanico };

export const generateReceiptPDF = (atendimento: AtendimentoComMecanico): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (data) => buffers.push(data));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    // Header Background Accent
    doc.rect(0, 0, 595.28, 120).fill('#0f1117');

    // Draw Official Logo on Left
    const logoPath = path.join(__dirname, '../../public/logo.png');
    let hasLogo = false;
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, 20, { height: 78 });
        hasLogo = true;
      } catch (e) {
        console.error('Erro ao renderizar logo no PDF:', e);
      }
    }

    if (!hasLogo) {
      doc.fillColor('#e10600').fontSize(22).font('Helvetica-Bold').text('LEMOKA', 40, 30);
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('CENTRO AUTOMOTIVO', 40, 54);
      doc.fillColor('#94a3b8').fontSize(9).text('Pavuna - Rio de Janeiro, RJ', 40, 76);
    }

    // Receipt Number & Date (Formatted cleanly on the right)
    const formattedDate = new Date(atendimento.data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.fillColor('#e10600').fontSize(11).font('Helvetica-Bold').text(`ORDEM DE SERVIÇO / COMPROVANTE INTERNO #${atendimento.id.slice(0, 8).toUpperCase()}`, 260, 32, { align: 'right' });
    doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica').text(`Data: ${formattedDate}`, 260, 50, { align: 'right' });
    doc.fillColor('#cbd5e1').fontSize(9).text(`Forma de Pagamento: ${atendimento.formaPagamento}`, 260, 65, { align: 'right' });
    doc.fillColor('#94a3b8').fontSize(8).text(`(Este documento é um comprovante de serviço interno, não substitui NFS-e)`, 260, 82, { align: 'right' });

    doc.moveDown(4);

    // Section 1: Dados do Cliente e Veículo
    let y = 145;
    doc.fillColor('#0f1117').fontSize(12).font('Helvetica-Bold').text('DADOS DO CLIENTE E VEÍCULO', 40, y);
    doc.strokeColor('#e10600').lineWidth(1.5).moveTo(40, y + 16).lineTo(555, y + 16).stroke();

    y += 26;
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text('Cliente:', 40, y);
    doc.font('Helvetica').text(atendimento.nomeCliente + (atendimento.clienteDocumento ? ` (CPF/CNPJ: ${atendimento.clienteDocumento})` : ''), 100, y);

    doc.font('Helvetica-Bold').text('Telefone:', 340, y);
    doc.font('Helvetica').text(atendimento.telefoneCliente || 'Não informado', 400, y);

    y += 18;
    doc.font('Helvetica-Bold').text('Veículo:', 40, y);
    doc.font('Helvetica').text(atendimento.veiculo || 'Não informado', 100, y);

    doc.font('Helvetica-Bold').text('Mecânico:', 340, y);
    doc.font('Helvetica').text(atendimento.mecanico?.nome || 'Não especificado', 400, y);

    if (atendimento.clienteEndereco || atendimento.clienteCidade) {
      y += 18;
      doc.font('Helvetica-Bold').text('Endereço:', 40, y);
      const endStr = `${atendimento.clienteEndereco || ''} ${atendimento.clienteNumero || ''} ${atendimento.clienteBairro ? '- ' + atendimento.clienteBairro : ''} ${atendimento.clienteCidade ? '• ' + atendimento.clienteCidade : ''}`;
      doc.font('Helvetica').text(endStr.trim(), 100, y);
    }

    // Section 2: Descrição dos Serviços
    y += 35;
    doc.fillColor('#0f1117').fontSize(12).font('Helvetica-Bold').text('DETALHAMENTO DO SERVIÇO', 40, y);
    doc.strokeColor('#e10600').lineWidth(1.5).moveTo(40, y + 16).lineTo(555, y + 16).stroke();

    y += 26;
    // Box for description
    doc.roundedRect(40, y, 515, 80, 4).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#334155').fontSize(10).font('Helvetica').text(atendimento.descricaoServico, 52, y + 12, { width: 490 });

    // Section 3: Valores
    y += 100;
    doc.fillColor('#0f1117').fontSize(12).font('Helvetica-Bold').text('RESUMO FINANCEIRO', 40, y);
    doc.strokeColor('#e10600').lineWidth(1.5).moveTo(40, y + 16).lineTo(555, y + 16).stroke();

    y += 26;
    const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

    doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Valor das Peças:', 40, y);
    doc.fillColor('#0f1117').font('Helvetica-Bold').text(formatCurrency(atendimento.valorPecas), 460, y, { align: 'right' });

    y += 20;
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Valor da Mão de Obra / Serviço:', 40, y);
    doc.fillColor('#0f1117').font('Helvetica-Bold').text(formatCurrency(atendimento.valorServico), 460, y, { align: 'right' });

    y += 25;
    // Total Box
    doc.roundedRect(40, y, 515, 36, 6).fill('#0f1117');
    doc.fillColor('#e10600').fontSize(12).font('Helvetica-Bold').text('VALOR TOTAL:', 55, y + 10);
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(formatCurrency(atendimento.valorTotal), 440, y + 9, { align: 'right' });

    // Footer
    y += 110;
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, y).lineTo(555, y).stroke();
    y += 10;
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Lemoka Centro Automotivo — Qualidade e Velocidade em Cada Serviço', 40, y, { align: 'center' });
    doc.fillColor('#94a3b8').fontSize(8).text('Av. Prof. Bernardino Rocha, 92 - Pavuna, Rio de Janeiro - RJ, 21650-450 | (21) 96484-3565', 40, y + 14, { align: 'center' });

    doc.end();
  });
};

/**
 * GERAÇÃO DE PDF PROFISSIONAL A4 DA NOVA ORDEM DE SERVIÇO (ETAPA 3)
 */
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  AWAITING_APPROVAL: 'Aguardando Aprovação',
  APPROVED: 'Aprovada',
  IN_MAINTENANCE: 'Em Manutenção',
  AWAITING_PARTS: 'Aguardando Peças',
  COMPLETED: 'Pronta / Aguardando Retirada',
  BILLED: 'Faturada / Encerrada',
  CANCELLED: 'Cancelada',
};

export const generateOrdemServicoPDF = (
  os: any,
  empresa: EmpresaConfig | null
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    // PDF Document A4 com 40px de margem
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const buffers: Buffer[] = [];

    doc.on('data', (data) => buffers.push(data));
    doc.on('end', () => {
      // Adicionar rodapé paginado em todas as páginas ao finalizar
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        
        // Linha divisória do rodapé
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, 800).lineTo(555, 800).stroke();
        
        // Texto do Rodapé Institucional
        const empresaNome = empresa?.nomeFantasia || 'Lemoka Centro Automotivo';
        const empresaContato = `${empresa?.telefone || '(21) 96484-3565'} ${empresa?.email ? '| ' + empresa.email : ''}`;
        
        doc.fillColor('#64748b').fontSize(8).font('Helvetica')
           .text(`${empresaNome} — ${empresaContato}`, 40, 808, { align: 'left', width: 350 });
        
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Bold')
           .text(`OS #${os.numeroOs} | Página ${i + 1} de ${totalPages}`, 40, 808, { align: 'right', width: 515 });
      }
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', (err) => reject(err));

    const formatBRL = (val: any) => {
      const num = Number(val) || 0;
      return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // 1. CABEÇALHO DA EMPRESA E NUMERAÇÃO DA OS
    doc.rect(0, 0, 595.28, 115).fill('#0f172a');

    // Logo ou Nome da Oficina no topo esquerdo
    let logoInserted = false;
    if (empresa?.logoUrl && empresa.logoUrl.startsWith('http')) {
      // Se houver logo hospedada, ou fallback local
    }
    const logoLocal = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logoLocal)) {
      try {
        doc.image(logoLocal, 40, 18, { height: 75 });
        logoInserted = true;
      } catch (e) {}
    }

    if (!logoInserted) {
      doc.fillColor('#2563eb').fontSize(20).font('Helvetica-Bold').text(empresa?.nomeFantasia || 'LEMOKA CENTRO AUTOMOTIVO', 40, 24);
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica').text('CENTRO AUTOMOTIVO', 40, 48);
    }

    // Endereço e Contato da Oficina (Abaixo da logo)
    const empEnd = `${empresa?.endereco || 'Av. Prof. Bernardino Rocha'}, ${empresa?.numero || '92'} - ${empresa?.bairro || 'Pavuna'}, ${empresa?.cidade || 'Rio de Janeiro'}/${empresa?.uf || 'RJ'}`;
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(empEnd, 40, 78, { width: 280 });
    doc.fillColor('#94a3b8').fontSize(8).text(`CNPJ: ${empresa?.cnpj || '45.123.890/0001-12'} | Tel: ${empresa?.telefone || '(21) 96484-3565'}`, 40, 90);

    // Bloco Direito: Número da OS, Data e Status
    doc.fillColor('#38bdf8').fontSize(14).font('Helvetica-Bold').text(`ORDEM DE SERVIÇO Nº ${os.numeroOs}`, 280, 24, { align: 'right' });
    
    const dataAberturaFmt = new Date(os.dataAbertura).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica').text(`Data Abertura: ${dataAberturaFmt}`, 280, 46, { align: 'right' });
    
    if (os.previsaoEntrega) {
      const prevFmt = new Date(os.previsaoEntrega).toLocaleDateString('pt-BR');
      doc.fillColor('#cbd5e1').fontSize(9).text(`Previsão Entrega: ${prevFmt}`, 280, 60, { align: 'right' });
    }

    const statusPt = STATUS_LABELS[os.status] || os.status;
    doc.fillColor('#f59e0b').fontSize(9).font('Helvetica-Bold').text(`Status: ${statusPt.toUpperCase()}`, 280, 76, { align: 'right' });

    let y = 135;

    // 2. BLOCA DADOS DO CLIENTE E VEÍCULO
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('IDENTIFICAÇÃO DO CLIENTE E VEÍCULO', 40, y);
    doc.strokeColor('#2563eb').lineWidth(1.5).moveTo(40, y + 14).lineTo(555, y + 14).stroke();

    y += 22;
    // Box cinza de fundo para dados
    doc.roundedRect(40, y, 515, 62, 6).fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('CLIENTE:', 50, y + 10);
    doc.font('Helvetica').text(os.cliente?.nome || 'Não informado', 100, y + 10);

    doc.font('Helvetica-Bold').text('CPF/CNPJ:', 340, y + 10);
    doc.font('Helvetica').text(os.cliente?.documento || 'Não informado', 400, y + 10);

    doc.font('Helvetica-Bold').text('TELEFONE:', 50, y + 26);
    doc.font('Helvetica').text(os.cliente?.telefone || 'Não informado', 100, y + 26);

    doc.font('Helvetica-Bold').text('E-MAIL:', 340, y + 26);
    doc.font('Helvetica').text(os.cliente?.email || 'Não informado', 400, y + 26);

    doc.font('Helvetica-Bold').text('VEÍCULO:', 50, y + 42);
    doc.font('Helvetica').text(`${os.veiculo?.marca || ''} ${os.veiculo?.modelo || ''} ${os.veiculo?.versao || ''}`.trim() || 'Não informado', 100, y + 42);

    doc.font('Helvetica-Bold').text('PLACA:', 340, y + 42);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(os.veiculo?.placa || 'Sem placa', 400, y + 42);

    doc.font('Helvetica-Bold').fillColor('#334155').text('KM:', 465, y + 42);
    doc.font('Helvetica').text(`${os.veiculo?.quilometragemAtual || 0} KM`, 490, y + 42);

    y += 75;

    // 3. TABELA DE SERVIÇOS PRESTADOS
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('SERVIÇOS PRESTADOS', 40, y);
    doc.strokeColor('#2563eb').lineWidth(1.5).moveTo(40, y + 14).lineTo(555, y + 14).stroke();

    y += 22;

    // Cabeçalho da tabela de serviços
    doc.rect(40, y, 515, 18).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('DESCRIÇÃO DO SERVIÇO', 45, y + 5);
    doc.text('MECÂNICO', 260, y + 5);
    doc.text('QTD/HRS', 370, y + 5, { align: 'center', width: 45 });
    doc.text('VALOR UNIT.', 420, y + 5, { align: 'right', width: 65 });
    doc.text('SUBTOTAL', 490, y + 5, { align: 'right', width: 60 });

    y += 18;

    if (!os.servicos || os.servicos.length === 0) {
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text('Nenhum serviço lançado nesta OS.', 45, y + 5);
      y += 18;
    } else {
      os.servicos.forEach((s: any) => {
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica').text(s.descricao, 45, y + 4, { width: 210 });
        doc.fillColor('#64748b').text(s.mecanico?.nome || 'Oficina', 260, y + 4, { width: 105 });
        doc.fillColor('#1e293b').text(String(Number(s.quantidade)), 370, y + 4, { align: 'center', width: 45 });
        doc.text(formatBRL(s.precoUnitario), 420, y + 4, { align: 'right', width: 65 });
        doc.font('Helvetica-Bold').text(formatBRL(s.subtotal), 490, y + 4, { align: 'right', width: 60 });

        y += 18;
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, y).lineTo(555, y).stroke();
      });
    }

    y += 10;

    // 4. TABELA DE PEÇAS E PRODUTOS APLICADOS
    if (y > 700) { doc.addPage(); y = 40; }

    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('PEÇAS E PRODUTOS APLICADOS', 40, y);
    doc.strokeColor('#2563eb').lineWidth(1.5).moveTo(40, y + 14).lineTo(555, y + 14).stroke();

    y += 22;

    // Cabeçalho da tabela de produtos
    doc.rect(40, y, 515, 18).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('DESCRIÇÃO DA PEÇA / MARCA', 45, y + 5);
    doc.text('QTD', 340, y + 5, { align: 'center', width: 35 });
    doc.text('VALOR UNIT.', 380, y + 5, { align: 'right', width: 55 });
    doc.text('DESCONTO', 440, y + 5, { align: 'right', width: 50 });
    doc.text('SUBTOTAL', 495, y + 5, { align: 'right', width: 55 });

    y += 18;

    if (!os.produtos || os.produtos.length === 0) {
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica-Oblique').text('Nenhuma peça ou produto lançado nesta OS.', 45, y + 5);
      y += 18;
    } else {
      os.produtos.forEach((p: any) => {
        if (y > 720) {
          doc.addPage();
          y = 40;
        }
        const prodDescStr = p.marca ? `${p.descricao} (${p.marca})` : p.descricao;
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica').text(prodDescStr, 45, y + 4, { width: 285 });
        doc.text(String(Number(p.quantidade)), 340, y + 4, { align: 'center', width: 35 });
        doc.text(formatBRL(p.precoUnitario), 380, y + 4, { align: 'right', width: 55 });
        doc.fillColor('#dc2626').text(Number(p.desconto) > 0 ? `- ${formatBRL(p.desconto)}` : 'R$ 0,00', 440, y + 4, { align: 'right', width: 50 });
        doc.fillColor('#1e293b').font('Helvetica-Bold').text(formatBRL(p.subtotal), 495, y + 4, { align: 'right', width: 55 });

        y += 18;
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, y).lineTo(555, y).stroke();
      });
    }

    y += 15;

    // 5. OBSERVAÇÕES TÉCNICAS (Se houver)
    if (os.observacoes && os.observacoes.trim() !== '') {
      if (y > 680) { doc.addPage(); y = 40; }
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('OBSERVAÇÕES TÉCNICAS:', 40, y);
      y += 14;
      doc.roundedRect(40, y, 515, 45, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text(os.observacoes, 48, y + 8, { width: 498 });
      y += 55;
    }

    // 6. RESUMO FINANCEIRO E CAIXA DE TOTAL FINAL
    if (y > 660) { doc.addPage(); y = 40; }

    const subServicos = os.servicos?.reduce((acc: number, item: any) => acc + Number(item.subtotal), 0) || 0;
    const subProdutos = os.produtos?.reduce((acc: number, item: any) => acc + Number(item.subtotal), 0) || 0;

    doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Subtotal Serviços:', 330, y);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatBRL(subServicos), 460, y, { align: 'right', width: 95 });

    y += 14;
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Subtotal Peças:', 330, y);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatBRL(subProdutos), 460, y, { align: 'right', width: 95 });

    if (Number(os.desconto) > 0) {
      y += 14;
      doc.fillColor('#dc2626').fontSize(8.5).font('Helvetica').text('Desconto Geral:', 330, y);
      doc.font('Helvetica-Bold').text(`- ${formatBRL(os.desconto)}`, 460, y, { align: 'right', width: 95 });
    }

    if (Number(os.acrescimo) > 0) {
      y += 14;
      doc.fillColor('#2563eb').fontSize(8.5).font('Helvetica').text('Acréscimo Geral:', 330, y);
      doc.font('Helvetica-Bold').text(`+ ${formatBRL(os.acrescimo)}`, 460, y, { align: 'right', width: 95 });
    }

    y += 20;
    // Caixa em destaque do Total Final
    doc.roundedRect(320, y, 235, 32, 6).fill('#0f172a');
    doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold').text('TOTAL DA OS:', 335, y + 9);
    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold').text(formatBRL(os.valorTotal), 440, y + 8, { align: 'right', width: 105 });

    y += 50;

    // 7. ASSINATURAS
    if (y > 700) { doc.addPage(); y = 50; }

    const dataHojeStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(`Data de Emissão do Documento: ${dataHojeStr}`, 40, y, { align: 'center' });

    y += 35;
    doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(60, y).lineTo(250, y).stroke();
    doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(345, y).lineTo(535, y).stroke();

    y += 6;
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold').text('ASSINATURA DO CLIENTE', 60, y, { width: 190, align: 'center' });
    doc.text('RESPONSÁVEL PELA OFICINA', 345, y, { width: 190, align: 'center' });

    doc.end();
  });
};
