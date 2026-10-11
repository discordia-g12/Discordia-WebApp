import React, { useState } from 'react';
import { ModalOverlay } from './Modals';
import { Hash, Volume2, X } from 'lucide-react';
import { Channel, Category } from '../types';
import { errorMessageFor } from '../api/errors';
import { isLocalCategoryId } from '../api/servers';

const FormError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" style={{ color: 'var(--danger)', fontSize: 14, marginTop: -8, marginBottom: 16 }}>
      {message}
    </div>
  ) : null;

interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (name: string, type: 'text' | 'voice', categoryId?: string) => Promise<void>;
  categoryId?: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  onClose,
  onCreate,
  categoryId,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(name, type, categoryId);
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        errorMessageFor(
          err,
          {
            400: 'Ya existe un canal con ese nombre en esta categoría.',
            403: 'No tenés permisos para crear canales en este servidor.',
            404: 'La categoría ya no existe.',
          },
          'No se pudo crear el canal.'
        )
      );
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ backgroundColor: 'var(--bg-primary)', width: 440, borderRadius: 8, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: 'var(--header-primary)', fontSize: 20 }}>Crear canal</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Tipo de canal</label>
              
              <div
                onClick={() => setType('text')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 4, cursor: 'pointer',
                  backgroundColor: type === 'text' ? 'var(--bg-modifier-selected)' : 'var(--bg-secondary)',
                  marginBottom: 8
                }}
              >
                <Hash size={24} color="var(--text-muted)" />
                <div>
                  <div style={{ color: 'var(--text-normal)', fontWeight: 500 }}>Texto</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Envía mensajes, imágenes, GIFs, emojis y más</div>
                </div>
                <input type="radio" checked={type === 'text'} readOnly style={{ marginLeft: 'auto' }} />
              </div>
              
              <div
                onClick={() => setType('voice')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 4, cursor: 'pointer',
                  backgroundColor: type === 'voice' ? 'var(--bg-modifier-selected)' : 'var(--bg-secondary)'
                }}
              >
                <Volume2 size={24} color="var(--text-muted)" />
                <div>
                  <div style={{ color: 'var(--text-normal)', fontWeight: 500 }}>Voz</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Reúnanse con voz y video</div>
                </div>
                <input type="radio" checked={type === 'voice'} readOnly style={{ marginLeft: 'auto' }} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Nombre del canal</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>
                  {type === 'text' ? <Hash size={18} /> : <Volume2 size={18} />}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="nuevo-canal"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 4, border: 'none',
                    backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-normal)', fontSize: 16, boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>
            </div>
            <FormError message={error} />
          </form>
        </div>
        
        <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-normal)', cursor: 'pointer', padding: '10px 16px', fontWeight: 500 }}>Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
            style={{ 
              backgroundColor: 'var(--brand)', color: 'white', border: 'none', borderRadius: 4, padding: '10px 24px', fontWeight: 500, cursor: (!name.trim() || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!name.trim() || isSubmitting) ? 0.5 : 1
            }}
          >
            Crear canal
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};

interface EditChannelModalProps {
  channel: Channel;
  categories?: Category[];
  onClose: () => void;
  onEdit: (channelId: string, name: string, categoryId?: string | null) => Promise<void>;
  onDelete: (channelId: string) => Promise<void>;
}

export const EditChannelModal: React.FC<EditChannelModalProps> = ({
  channel,
  categories,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [name, setName] = useState(channel.name);
  const [categoryId, setCategoryId] = useState<string | null>(channel.categoryId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onEdit(channel.id, name.trim(), categoryId);
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        errorMessageFor(
          err,
          {
            400: 'Ya existe un canal con ese nombre en la categoría elegida.',
            403: 'No tenés permisos para editar o mover canales en este servidor.',
            404: 'La categoría elegida ya no existe.',
          },
          'No se pudieron guardar los cambios.'
        )
      );
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este canal?')) return;
    setError(null);
    try {
      await onDelete(channel.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        errorMessageFor(
          err,
          { 403: 'No tenés permisos para eliminar canales en este servidor.' },
          'No se pudo eliminar el canal.'
        )
      );
    }
  };

  // Solo categorías reales: la sección general es local y equivale a "sin categoría"
  const selectableCategories = (categories || []).filter((c) => !isLocalCategoryId(c.id));

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ backgroundColor: 'var(--bg-primary)', width: 440, borderRadius: 8, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: 'var(--header-primary)', fontSize: 20 }}>Editar canal</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Nombre del canal</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>
                  {channel.type === 'text' ? <Hash size={18} /> : <Volume2 size={18} />}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 4, border: 'none',
                    backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-normal)', fontSize: 16, boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Categoría</label>
              <select
                value={categoryId || ''}
                onChange={e => setCategoryId(e.target.value ? e.target.value : null)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 4, border: 'none',
                  backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-normal)', fontSize: 14, boxSizing: 'border-box'
                }}
              >
                <option value="">(Sin categoría / Sección general)</option>
                {selectableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <FormError message={error} />
          </form>
        </div>
        
        <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={handleDelete}
            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '10px 16px', fontWeight: 500 }}
          >
            Eliminar canal
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-normal)', cursor: 'pointer', padding: '10px 16px', fontWeight: 500 }}>Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
            style={{ 
              backgroundColor: 'var(--brand)', color: 'white', border: 'none', borderRadius: 4, padding: '10px 24px', fontWeight: 500, cursor: (!name.trim() || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!name.trim() || isSubmitting) ? 0.5 : 1
            }}
          >
            Guardar cambios
          </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
};

interface CreateCategoryModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        errorMessageFor(
          err,
          {
            400: 'Ya existe una categoría con ese nombre.',
            403: 'No tenés permisos para crear categorías en este servidor.',
            422: 'El nombre de la categoría no es válido.',
          },
          'No se pudo crear la categoría.'
        )
      );
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ backgroundColor: 'var(--bg-primary)', width: 440, borderRadius: 8, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: 'var(--header-primary)', fontSize: 20 }}>Crear categoría</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Nombre de la categoría</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="NUEVA CATEGORÍA"
                maxLength={100}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 4, border: 'none',
                  backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-normal)', fontSize: 16, boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>
            <FormError message={error} />
          </form>
        </div>
        
        <div style={{ padding: 16, backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-normal)', cursor: 'pointer', padding: '10px 16px', fontWeight: 500 }}>Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
            style={{ 
              backgroundColor: 'var(--brand)', color: 'white', border: 'none', borderRadius: 4, padding: '10px 24px', fontWeight: 500, cursor: (!name.trim() || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!name.trim() || isSubmitting) ? 0.5 : 1
            }}
          >
            Crear categoría
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
