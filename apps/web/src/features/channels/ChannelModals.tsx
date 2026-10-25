import { useState } from 'react';
import { isLocalCategoryId, type EditChannelRequest } from '@discordia/core';
import type { Category, Channel } from '../../types';
import { ActionLink, BlockButton, Choice, Modal, ModalActions, ModalForm, UnderlineInput } from '../../ui';
import { createCategoryError, createChannelError, deleteChannelError, editChannelError } from './channelErrors';
import styles from './ChannelModals.module.css';

const CHANNEL_TYPES = [
  { value: 'text' as const, label: 'Texto' },
  { value: 'voice' as const, label: 'Voz' },
];

/** Error que no es de un campo (permisos, servidor): sobre las acciones, con barra inicial. */
function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className={styles.error}>
      / {message}
    </p>
  ) : null;
}

/** Envío de un formulario de modal: estado de carga y el error del backend, ya traducido. */
function useSubmit(toMessage: (err: unknown) => string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(toMessage(err));
      setBusy(false);
    }
  };

  return { busy, error, run };
}

interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (name: string, type: 'text' | 'voice', categoryId?: string) => Promise<void>;
  categoryId?: string;
}

/** Crear canal (rediseño): tipo como palabras (texto / voz) y el nombre. */
export function CreateChannelModal({ onClose, onCreate, categoryId }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const { busy, error, run } = useSubmit(createChannelError);

  const submit = () => {
    if (!name.trim() || busy) return;
    run(async () => {
      await onCreate(name.trim(), type, categoryId);
      onClose();
    });
  };

  return (
    <Modal title="Crear canal" onClose={onClose}>
      <ModalForm onSubmit={submit}>
        <div className={styles.field}>
          <p className={styles.label}>Tipo</p>
          <Choice label="Tipo de canal" options={CHANNEL_TYPES} value={type} onChange={setType} />
          <p className={styles.hint}>
            / {type === 'text' ? 'Mensajes, imágenes y archivos.' : 'Llamadas de voz con los que estén conectados.'}
          </p>
        </div>
        <UnderlineInput
          label="Nombre del canal"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nuevo-canal"
          maxLength={100}
          autoFocus
        />
        <FormError message={error} />
        <ModalActions>
          <ActionLink onPress={onClose}>cancelar</ActionLink>
          <BlockButton type="submit" disabled={!name.trim()} loading={busy}>
            Crear
          </BlockButton>
        </ModalActions>
      </ModalForm>
    </Modal>
  );
}

interface EditChannelModalProps {
  channel: Channel;
  categories?: Category[];
  onClose: () => void;
  onEdit: (channelId: string, changes: EditChannelRequest) => Promise<void>;
  onDelete: (channelId: string) => Promise<void>;
}

/**
 * Editar canal (rediseño): nombre, tema y categoría. Eliminar pide confirmación adentro del mismo modal
 * (el título pasa a ¿ELIMINAR CANAL?), sin el confirm del navegador.
 */
export function EditChannelModal({ channel, categories, onClose, onEdit, onDelete }: EditChannelModalProps) {
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic || '');
  const [categoryId, setCategoryId] = useState(channel.categoryId || '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useSubmit(editChannelError);
  const remove = useSubmit(deleteChannelError);

  // Solo categorías reales: la sección general es local y equivale a "sin categoría"
  const categoryOptions = [
    { value: '', label: 'sin categoría' },
    ...(categories || []).filter((c) => !isLocalCategoryId(c.id)).map((c) => ({ value: c.id, label: c.name })),
  ];

  const submit = () => {
    if (!name.trim() || save.busy) return;
    save.run(async () => {
      await onEdit(channel.id, { name: name.trim(), topic: topic.trim(), categoryId: categoryId || null });
      onClose();
    });
  };

  if (confirmingDelete) {
    return (
      <Modal title="¿Eliminar canal?" role="alertdialog" onClose={onClose}>
        <p>Se borra •{channel.name} con todos sus mensajes. No se puede deshacer.</p>
        <FormError message={remove.error} />
        <ModalActions>
          {/* El foco pasa a volver (no a eliminar: un Enter de más no tiene que borrar el canal) */}
          <ActionLink onPress={() => setConfirmingDelete(false)} autoFocus>
            volver
          </ActionLink>
          <BlockButton
            tone="danger"
            loading={remove.busy}
            onPress={() =>
              remove.run(async () => {
                await onDelete(channel.id);
                onClose();
              })
            }
          >
            Eliminar
          </BlockButton>
        </ModalActions>
      </Modal>
    );
  }

  return (
    <Modal title="Editar canal" description={`•${channel.name}`} onClose={onClose}>
      <ModalForm onSubmit={submit}>
        <UnderlineInput label="Nombre del canal" required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        <UnderlineInput
          label="Tema"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="¿De qué se habla en este canal?"
          maxLength={1024}
        />
        <div className={styles.field}>
          <p className={styles.label}>Categoría</p>
          <Choice label="Categoría" options={categoryOptions} value={categoryId} onChange={setCategoryId} />
        </div>
        <FormError message={save.error} />
        <ModalActions>
          <ActionLink onPress={() => setConfirmingDelete(true)} className={styles.deleteLink}>
            eliminar canal
          </ActionLink>
          <ActionLink onPress={onClose}>cancelar</ActionLink>
          <BlockButton type="submit" disabled={!name.trim()} loading={save.busy}>
            Guardar
          </BlockButton>
        </ModalActions>
      </ModalForm>
    </Modal>
  );
}

interface CreateCategoryModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

/** Crear categoría (rediseño): solo el nombre. */
export function CreateCategoryModal({ onClose, onCreate }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const { busy, error, run } = useSubmit(createCategoryError);

  const submit = () => {
    if (!name.trim() || busy) return;
    run(async () => {
      await onCreate(name.trim());
      onClose();
    });
  };

  return (
    <Modal title="Crear categoría" onClose={onClose}>
      <ModalForm onSubmit={submit}>
        <UnderlineInput
          label="Nombre de la categoría"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nueva categoría"
          maxLength={100}
          autoFocus
        />
        <FormError message={error} />
        <ModalActions>
          <ActionLink onPress={onClose}>cancelar</ActionLink>
          <BlockButton type="submit" disabled={!name.trim()} loading={busy}>
            Crear
          </BlockButton>
        </ModalActions>
      </ModalForm>
    </Modal>
  );
}
