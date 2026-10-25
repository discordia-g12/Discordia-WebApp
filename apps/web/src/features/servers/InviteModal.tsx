import { useEffect, useRef, useState } from 'react';
import { createInvite } from '@discordia/core';
import type { Server } from '../../types';
import { ActionLink, BlockButton, Choice, Modal, ModalActions } from '../../ui';
import styles from './InviteModal.module.css';

export interface InviteModalProps {
  server: Server;
  onClose: () => void;
}

// Segundos hasta que vence ('0': nunca) y usos máximos ('0': sin límite). El backend pide al menos 60 s.
const EXPIRATION_OPTIONS = [
  { value: '1800', label: '30 min' },
  { value: '3600', label: '1 h' },
  { value: '21600', label: '6 h' },
  { value: '43200', label: '12 h' },
  { value: '86400', label: '1 día' },
  { value: '604800', label: '7 días' },
  { value: '0', label: 'nunca' },
];

const MAX_USES_OPTIONS = [
  { value: '0', label: 'sin límite' },
  { value: '1', label: '1' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

type LinkState = { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' };

/**
 * Invitar (rediseño): al abrirse genera un enlace con las opciones por defecto (7 días, sin límite).
 * Cambiar el vencimiento o los usos no crea otra invitación sola: marca el enlace como viejo y ofrece
 * generar uno nuevo, así no quedan invitaciones de más en el servidor (todavía no se pueden listar).
 */
export function InviteModal({ server, onClose }: InviteModalProps) {
  const [expiration, setExpiration] = useState('604800');
  const [maxUses, setMaxUses] = useState('0');
  const [link, setLink] = useState<LinkState>({ status: 'loading' });
  // Opciones con las que se generó el enlace que se muestra
  const [generatedWith, setGeneratedWith] = useState({ expiration, maxUses });
  const [copied, setCopied] = useState<'ok' | 'manual' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generate = async () => {
    setLink({ status: 'loading' });
    setCopied(null);
    try {
      const { code } = await createInvite(server.id, {
        maxUses: Number(maxUses),
        expiresInSeconds: Number(expiration),
      });
      setLink({ status: 'ready', url: `${window.location.origin}/invite/${code}` });
      setGeneratedWith({ expiration, maxUses });
    } catch {
      setLink({ status: 'error' });
    }
  };

  useEffect(() => {
    generate();
    // Solo al abrir: después se genera a pedido
  }, []);

  const stale = link.status === 'ready' && (generatedWith.expiration !== expiration || generatedWith.maxUses !== maxUses);

  const copy = async () => {
    if (link.status !== 'ready') return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied('ok');
    } catch {
      // Sin permiso para el portapapeles: se selecciona el enlace para copiarlo a mano
      inputRef.current?.select();
      setCopied('manual');
    }
  };

  const expirationLabel = EXPIRATION_OPTIONS.find((o) => o.value === generatedWith.expiration)?.label;

  return (
    <Modal title="Invitar" description={`a ${server.name}`} onClose={onClose}>
      <div className={styles.link}>
        <label htmlFor="invite-link" className={styles.label}>
          Enlace
        </label>
        <div className={`${styles.field} ${stale ? styles.stale : ''}`}>
          <input
            id="invite-link"
            ref={inputRef}
            readOnly
            value={link.status === 'ready' ? link.url : link.status === 'loading' ? 'generando…' : ''}
            aria-describedby="invite-link-status"
            onFocus={(e) => e.currentTarget.select()}
          />
          <ActionLink onPress={copy} disabled={link.status !== 'ready'}>
            copiar
          </ActionLink>
        </div>
        <p id="invite-link-status" className={styles.status} role="status">
          {link.status === 'error'
            ? '/ No se pudo generar la invitación.'
            : copied === 'ok'
              ? 'copiado/'
              : copied === 'manual'
                ? '/ No se pudo copiar: el enlace quedó seleccionado para copiarlo a mano.'
                : stale
                  ? '/ Cambiaste las opciones: este enlace es el anterior.'
                  : link.status === 'ready'
                    ? generatedWith.expiration === '0'
                      ? '/ No vence.'
                      : `/ Vence en ${expirationLabel}.`
                    : ''}
        </p>
      </div>

      <div className={styles.option}>
        <p className={styles.label}>Vence en</p>
        <Choice label="Vence en" options={EXPIRATION_OPTIONS} value={expiration} onChange={setExpiration} />
      </div>
      <div className={styles.option}>
        <p className={styles.label}>Usos</p>
        <Choice label="Usos máximos" options={MAX_USES_OPTIONS} value={maxUses} onChange={setMaxUses} />
      </div>

      <ModalActions>
        {(stale || link.status === 'error') && (
          <ActionLink onPress={generate}>{link.status === 'error' ? 'reintentar' : 'generar otro enlace'}</ActionLink>
        )}
        <BlockButton onPress={onClose}>Listo</BlockButton>
      </ModalActions>
    </Modal>
  );
}
