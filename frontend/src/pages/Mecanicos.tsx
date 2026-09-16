import React, { useEffect, useState } from 'react';
import { Mecanico } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Edit2, Trash2, Award, DollarSign } from 'lucide-react';

export const Mecanicos: React.FC = () => {
  const { isAdmin } = useAuth();
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');

  const loadMecanicos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/mecanicos');
      setMecanicos(res.data);
    } catch (err) {
      console.error('Erro ao carregar mecânicos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMecanicos();
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setNome('');
    setEspecialidade('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Mecanico) => {
    setEditingId(m.id);
    setNome(m.nome);
    setEspecialidade(m.especialidade);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/mecanicos/${editingId}`, { nome, especialidade });
      } else {
        await api.post('/mecanicos', { nome, especialidade });
      }
      setIsModalOpen(false);
      loadMecanicos();
    } catch (err) {
      alert('Erro ao salvar dados do mecânico.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir este mecânico?')) return;
    try {
      await api.delete(`/mecanicos/${id}`);
      loadMecanicos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir mecânico.');
    }
  };

  const formatCurrency = (val?: number) =>
    `R$ ${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Mecânicos & Equipe</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Gerenciamento da equipe e comissões acumuladas em atendimentos.
          </p>
        </div>

        <button onClick={handleOpenNew} className="btn btn-gold">
          <Plus size={18} /> Cadastrar Mecânico
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Carregando mecânicos...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {mecanicos.map((m) => (
            <div key={m.id} className="card card-gold" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{m.nome}</h3>
                    <span className="badge badge-pix" style={{ marginTop: '0.2rem' }}>
                      {m.especialidade}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => handleOpenEdit(m)} className="btn btn-secondary btn-sm" title="Editar">
                      <Edit2 size={14} color="var(--blue)" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(m.id)} className="btn btn-danger btn-sm" title="Excluir (Admin)">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-sm)', margin: '1rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total de Carros Atendidos:</span>
                    <strong style={{ color: 'var(--purple)', fontSize: '0.9rem' }}>{m.totalAtendimentos || 0} veículos</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Faturamento Gerado:</span>
                    <strong style={{ fontSize: '0.9rem' }}>{formatCurrency(m.totalFaturamento)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--gold)' }}>Comissões Acumuladas:</span>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green)' }}>
                      {formatCurrency(m.totalComissoes)}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Ativo na oficina Lemoka Centro Automotivo
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Mecânico' : 'Cadastrar Mecânico'}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Carlos Eduardo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Especialidade Principal</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Suspensão, Injeção Eletrônica, Freios"
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-gold" style={{ width: '100%', marginTop: '1rem' }}>
            Salvar Mecânico
          </button>
        </form>
      </Modal>
    </div>
  );
};
