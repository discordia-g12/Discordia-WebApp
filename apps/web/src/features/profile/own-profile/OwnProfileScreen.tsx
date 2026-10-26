import type { Status } from '../../../types';
import { ActionLink, BlockButton, SquareAvatar, UnderlineInput } from '../../../ui';
import { Choice, SettingsCell, SettingsScreen, SoonFieldset } from '../../settings/SettingsScreen';
import type { OwnProfileViewProps } from './useOwnProfileState';
import { PRESET_BANNER_COLORS } from './shared';
import { useOwnProfileState } from './useOwnProfileState';
import styles from './OwnProfileScreen.module.css';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'online', label: 'Conectado' },
  { value: 'idle', label: 'Ausente' },
  { value: 'dnd', label: 'No molestar' },
  { value: 'invisible', label: 'Invisible' },
];

const STATUS_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Invisible',
  offline: 'Invisible',
};

/**
 * Perfil propio del rediseño, sobre el mismo marco que los ajustes (SettingsScreen): a la izquierda la
 * vista previa en vivo, como la ven los demás; a la derecha avatar, banner, nombre, bio y estado. El
 * estado es el de useOwnProfileState (compartido con la vista anterior).
 */
export function OwnProfileScreen(props: OwnProfileViewProps) {
  const s = useOwnProfileState(props);
  const user = s.baseUser;
  const saving = s.mode === 'saving';

  return (
    <SettingsScreen
      title="Mi perfil"
      identity={
        <div className={styles.identity}>
          <SquareAvatar user={{ ...user, displayName: s.displayName || user.displayName, avatar: s.avatarUrl }} size={32} />
          <div>
            <p className={styles.name}>{s.displayName || user.displayName}</p>
            <p className={styles.meta}>@{user.username}</p>
          </div>
        </div>
      }
      sections={[{ id: 'profile', label: 'Perfil', items: ['Vista previa', 'Avatar y banner', 'Nombre y bio', 'Estado'] }]}
      active="profile"
      onSelect={() => {}}
      onClose={() => props.onBack?.()}
    >
      <SettingsCell title="Vista previa">
        <article className={styles.card} aria-label="Así ven tu perfil">
          {/* Sin banner guardado, la franja neutra del tema (el estado arranca con el azul de Discord, que es
              el valor por defecto del diseño anterior) */}
          <div className={styles.banner} style={user.bannerColor ? { background: s.bannerColor } : undefined} />
          <div className={styles.cardBody}>
            <SquareAvatar user={{ ...user, displayName: s.displayName || user.displayName, avatar: s.avatarUrl }} size="lg" status={s.status} />
            <p className={styles.cardName}>{s.displayName || 'Sin nombre'}</p>
            <p className={styles.meta}>
              @{user.username} · {STATUS_LABEL[s.status]}/
            </p>
            {s.customStatus && <p className={styles.cardStatus}>{s.customStatus}</p>}
            <p className={styles.cardLabel}>Sobre mí /</p>
            <p className={styles.cardBio}>{s.bio || '/ todavía no escribiste nada.'}</p>
          </div>
        </article>
      </SettingsCell>

      <SettingsCell title="Editar perfil">
        <div className={styles.avatarRow}>
          <SquareAvatar user={{ ...user, avatar: s.avatarUrl }} size={48} />
          <label className={styles.fileAction}>
            _cambiar avatar
            <input type="file" accept="image/*" onChange={s.handleAvatarFileChange} className={styles.srOnly} />
          </label>
          {s.avatarUrl !== s.defaultAvatar && <ActionLink onPress={s.handleResetAvatar}>restablecer</ActionLink>}
        </div>

        <SoonFieldset note="El banner todavía no se guarda en el servidor.">
          <p className={styles.fieldLabel}>banner</p>
          <div className={styles.swatches} role="radiogroup" aria-label="Color del banner">
            {PRESET_BANNER_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={s.bannerColor === color}
                aria-label={color}
                className={styles.swatch}
                style={{ background: color }}
                onClick={() => s.setBannerColor(color)}
              />
            ))}
            <input
              type="color"
              aria-label="Otro color de banner"
              className={styles.colorInput}
              value={s.bannerColor}
              onChange={(e) => s.setBannerColor(e.target.value)}
            />
          </div>
        </SoonFieldset>

        <UnderlineInput
          label="nombre visible"
          required
          value={s.displayName}
          maxLength={32}
          onChange={(e) => s.setDisplayName(e.target.value)}
          error={s.isDisplayNameValid ? undefined : 'Entre 2 y 32 caracteres.'}
        />
        <UnderlineInput label="sobre mí" value={s.bio} maxLength={190} onChange={(e) => s.setBio(e.target.value)} hint={`${s.bio.length}/190`} />
        <Choice label="Estado" options={STATUS_OPTIONS} value={s.status === 'offline' ? 'invisible' : s.status} onChange={s.setStatus} />
        <p className={styles.meta}>/ La presencia vale para esta sesión: todavía no se guarda en el servidor.</p>
        <UnderlineInput
          label="estado personalizado"
          value={s.customStatus}
          maxLength={64}
          placeholder="¿En qué andás?"
          onChange={(e) => s.setCustomStatus(e.target.value)}
        />

        <div className={styles.actions}>
          <BlockButton onPress={s.handleSave} loading={saving} disabled={!s.isDisplayNameValid}>
            Guardar
          </BlockButton>
          <ActionLink onPress={s.handleDiscard} disabled={saving}>
            descartar
          </ActionLink>
        </div>
      </SettingsCell>
    </SettingsScreen>
  );
}
