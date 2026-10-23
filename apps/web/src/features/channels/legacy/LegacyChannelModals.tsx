import React, { useState } from 'react';
import { ModalOverlay } from '../../../ui/legacy/ModalOverlay';
import { Hash, Volume2, X } from 'lucide-react';
import { Channel, Category } from '../../../types';
import { isLocalCategoryId, EditChannelRequest } from '@discordia/core';
import { createCategoryError, createChannelError, deleteChannelError, editChannelError } from '../channelErrors';
import styles from './LegacyChannelModals.module.css';

const FormError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className={styles.formErrorRoot}>
      {message}
    </div>
  ) : null;

interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (name: string, type: 'text' | 'voice', categoryId?: string) => Promise<void>;
  categoryId?: string;
}

export const LegacyCreateChannelModal: React.FC<CreateChannelModalProps> = ({
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
        createChannelError(err)
      );
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className={styles.createChannelModalDiv} onClick={e => e.stopPropagation()}>
        <div className={styles.createChannelModalDivDiv}>
          <div className={styles.createChannelModalDivDivDiv}>
            <h2 className={styles.crearCanal}>Crear canal</h2>
            <button onClick={onClose} className={styles.createChannelModalDivDivDivButton}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.createChannelModalDivDivDiv2}>
              <label className={styles.tipoCanal}>Tipo de canal</label>
              
              <div
                onClick={() => setType('text')}
                className={styles.createChannelModalDivDivDiv2Div} style={{ backgroundColor: type === 'text' ? 'var(--bg-modifier-selected)' : 'var(--bg-secondary)' }}
              >
                <Hash size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.texto}>Texto</div>
                  <div className={styles.createChannelModalDivDivDiv2DivDiv}>Envía mensajes, imágenes, GIFs, emojis y más</div>
                </div>
                <input type="radio" checked={type === 'text'} readOnly className={styles.createChannelModalDivDivDiv2DivInput} />
              </div>
              
              <div
                onClick={() => setType('voice')}
                className={styles.createChannelModalDivDivDiv2Div2} style={{ backgroundColor: type === 'voice' ? 'var(--bg-modifier-selected)' : 'var(--bg-secondary)' }}
              >
                <Volume2 size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.texto}>Voz</div>
                  <div className={styles.createChannelModalDivDivDiv2DivDiv}>Reúnanse con voz y video</div>
                </div>
                <input type="radio" checked={type === 'voice'} readOnly className={styles.createChannelModalDivDivDiv2DivInput} />
              </div>
            </div>

            <div className={styles.createChannelModalDivDivDiv3}>
              <label className={styles.tipoCanal}>Nombre del canal</label>
              <div className={styles.createChannelModalDivDivDiv3Div}>
                <span className={styles.createChannelModalDivDivDiv3DivSpan}>
                  {type === 'text' ? <Hash size={18} /> : <Volume2 size={18} />}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="nuevo-canal"
                  className={styles.nuevoCanal}
                  autoFocus
                />
              </div>
            </div>
            <FormError message={error} />
          </form>
        </div>
        
        <div className={styles.createChannelModalDivDiv2}>
          <button onClick={onClose} className={styles.cancelar}>Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
            className={styles.crearCanal2} style={{ cursor: (!name.trim() || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!name.trim() || isSubmitting) ? 0.5 : 1 }}
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
  onEdit: (channelId: string, changes: EditChannelRequest) => Promise<void>;
  onDelete: (channelId: string) => Promise<void>;
}

export const LegacyEditChannelModal: React.FC<EditChannelModalProps> = ({
  channel,
  categories,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic || '');
  const [categoryId, setCategoryId] = useState<string | null>(channel.categoryId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onEdit(channel.id, { name: name.trim(), topic: topic.trim(), categoryId });
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        editChannelError(err)
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
        deleteChannelError(err)
      );
    }
  };

  // Solo categorías reales: la sección general es local y equivale a "sin categoría"
  const selectableCategories = (categories || []).filter((c) => !isLocalCategoryId(c.id));

  return (
    <ModalOverlay onClose={onClose}>
      <div className={styles.createChannelModalDiv} onClick={e => e.stopPropagation()}>
        <div className={styles.createChannelModalDivDiv}>
          <div className={styles.createChannelModalDivDivDiv}>
            <h2 className={styles.crearCanal}>Editar canal</h2>
            <button onClick={onClose} className={styles.createChannelModalDivDivDivButton}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.createChannelModalDivDivDiv2}>
              <label className={styles.tipoCanal}>Nombre del canal</label>
              <div className={styles.createChannelModalDivDivDiv3Div}>
                <span className={styles.createChannelModalDivDivDiv3DivSpan}>
                  {channel.type === 'text' ? <Hash size={18} /> : <Volume2 size={18} />}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={styles.nuevoCanal}
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.createChannelModalDivDivDiv2}>
              <label className={styles.tipoCanal}>Tema del canal (opcional)</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="¿De qué se habla en este canal?"
                maxLength={1024}
                rows={3}
                className={styles.queSeHablaEste}
              />
            </div>

            <div className={styles.createChannelModalDivDivDiv2}>
              <label className={styles.tipoCanal}>Categoría</label>
              <select
                value={categoryId || ''}
                onChange={e => setCategoryId(e.target.value ? e.target.value : null)}
                className={styles.createChannelModalDivDivDiv2Select}
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
        
        <div className={styles.createChannelModalDivDiv3}>
          <button 
            onClick={handleDelete}
            className={styles.eliminarCanal}
          >
            Eliminar canal
          </button>
          <div className={styles.createChannelModalDivDiv3Div}>
          <button onClick={onClose} className={styles.cancelar}>Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
            className={styles.crearCanal2} style={{ cursor: (!name.trim() || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!name.trim() || isSubmitting) ? 0.5 : 1 }}
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

export const LegacyCreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
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
        createCategoryError(err)
      );
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className={styles.createChannelModalDiv} onClick={e => e.stopPropagation()}>
        <div className={styles.createChannelModalDivDiv}>
          <div className={styles.createChannelModalDivDivDiv}>
            <h2 className={styles.crearCanal}>Crear categoría</h2>
            <button onClick={onClose} className={styles.createChannelModalDivDivDivButton}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.createChannelModalDivDivDiv3}>
              <label className={styles.tipoCanal}>Nombre de la categoría</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="NUEVA CATEGORÍA"
                maxLength={100}
                className={styles.nuevaCategoria}
                autoFocus
              />
            </div>
            <FormError message={error} />
          </form>
        </div>
        
        <div className={styles.createChannelModalDivDiv2}>
          <button onClick={onClose} className={styles.cancelar}>Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim() || isSubmitting}
            className={styles.crearCanal2} style={{ cursor: (!name.trim() || isSubmitting) ? 'not-allowed' : 'pointer', opacity: (!name.trim() || isSubmitting) ? 0.5 : 1 }}
          >
            Crear categoría
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
