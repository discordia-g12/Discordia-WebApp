import { Check } from 'lucide-react';
import {
  errorMessageFor,
  notificationLevelLabel,
  useNotificationPreference,
  type NotificationLevel,
  type NotificationPreferenceTarget,
} from '@discordia/core';
import { ContextMenu, ContextMenuItem } from '../../ui';
import { showToast } from '../../app/uiStore';

const OPTIONS: { level: NotificationLevel | null; label: string }[] = [
  { level: 'all', label: 'Todos' },
  { level: 'mentions', label: 'Solo menciones' },
  { level: 'none', label: 'Nada' },
  { level: null, label: 'Heredar' },
];

export interface NotificationLevelMenuProps {
  target: NotificationPreferenceTarget;
  /** De qué es: "General", "#general", "Ana". */
  name: string;
  x: number;
  y: number;
  onClose: () => void;
}

/**
 * Click derecho sobre un servidor, un canal o un DM: qué avisos llegan de ahí (ADR-07 de Notification). La
 * opción elegida va marcada; "Heredar" muestra lo que vale si no se elige nada (lo del servidor o el
 * default) y el tilde va en el nivel que vale de verdad.
 */
export function NotificationLevelMenu({ target, name, x, y, onClose }: NotificationLevelMenuProps) {
  const pref = useNotificationPreference(target);

  const choose = (level: NotificationLevel | null) => {
    onClose();
    // Optimista: si falla vuelve a como estaba y avisamos
    pref.setLevel(level).catch((err) => showToast(errorMessageFor(err, {}, 'No se pudo guardar la preferencia'), 'danger'));
  };

  return (
    <ContextMenu x={x} y={y} label={`Notificaciones de ${name}`} title="Notificaciones" onClose={onClose}>
      {OPTIONS.map(({ level, label }) => (
        <ContextMenuItem
          key={label}
          role="menuitemradio"
          checked={pref.level === level}
          detail={level === null ? notificationLevelLabel(pref.inherited.level) : undefined}
          icon={
            level === pref.effective.level ? (
              <Check size={14} strokeWidth={1.5} aria-label="Nivel efectivo" />
            ) : (
              <span style={{ width: 14 }} aria-hidden="true" />
            )
          }
          onPress={() => choose(level)}
        >
          {label}
        </ContextMenuItem>
      ))}
      {/* Silenciado (desde la campana vieja o con fecha de fin): sin esto no habría cómo volver */}
      {pref.muted && (
        <ContextMenuItem
          onPress={() => {
            onClose();
            pref.setMuted(false).catch((err) => showToast(errorMessageFor(err, {}, 'No se pudo guardar la preferencia'), 'danger'));
          }}
        >
          Reactivar avisos
        </ContextMenuItem>
      )}
    </ContextMenu>
  );
}
