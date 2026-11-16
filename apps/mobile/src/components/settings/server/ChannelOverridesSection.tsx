import React from 'react'
import { View } from 'react-native'
import { OVERRIDE_CHOICES, useChannelOverridesAdmin, type Channel, type Role } from '@discordia/core'
import { makeStyles } from '../../../theme'
import { ActionLink, BlockButton, Choice, Skeleton, Text } from '../../../ui'
import { Feedback, SettingsCell } from '../SettingsScreen'

interface ChannelOverridesSectionProps {
  serverId: string
  role: Role
  channels: Channel[]
  index: number
}

/**
 * PERMISOS POR CANAL del rol elegido (#18): se elige el canal y cada permiso se niega, se hereda o se
 * permite. Vale solo en ese canal; los permisos generales del rol no cambian. Estado y reglas de core
 * (useChannelOverridesAdmin), los mismos que la web. Montarlo con key={role.id}.
 */
export function ChannelOverridesSection({ serverId, role, channels, index }: ChannelOverridesSectionProps) {
  const styles = useStyles()
  const o = useChannelOverridesAdmin(serverId, role, channels)
  const { channel, overridesQuery } = o

  return (
    <SettingsCell title={`Permisos por canal — ${role.name}`} index={index}>
      {channels.length === 0 ? (
        <Text variant="meta" tone="muted">
          / El servidor no tiene canales.
        </Text>
      ) : (
        <>
          <Text variant="meta" tone="muted">
            Lo que cambies acá vale solo en el canal elegido: los permisos generales del rol no cambian.
          </Text>
          <Choice
            label="Canal"
            options={channels.map(ch => ({ value: ch.id, label: `•${ch.name}`, disabled: o.busy }))}
            value={o.channelId}
            onChange={o.selectChannel}
          />

          {overridesQuery.isLoading && <Skeleton lines={3} label="Cargando permisos del canal" />}
          {overridesQuery.isError && (
            <View style={styles.links}>
              <Feedback tone="error">No se pudieron cargar los permisos del canal.</Feedback>
              <ActionLink onPress={() => overridesQuery.refetch()}>reintentar</ActionLink>
            </View>
          )}

          {channel &&
            overridesQuery.isSuccess &&
            o.permissions.map(permission => (
              <View key={permission.id} style={styles.permission}>
                <Text variant="bodySmall" bold>
                  {permission.name}
                </Text>
                <Text variant="meta" tone="muted">
                  {permission.desc}
                </Text>
                <Choice
                  label={`${permission.name} en •${channel.name}`}
                  options={OVERRIDE_CHOICES}
                  value={o.stateOf(permission.id)}
                  onChange={state => o.setState(permission.id, state)}
                />
              </View>
            ))}

          {(o.dirty || o.hasOverride) && (
            <View style={styles.links}>
              {o.hasOverride && !o.dirty && (
                <ActionLink onPress={o.handleRemove} disabled={o.busy}>
                  quitar excepción
                </ActionLink>
              )}
              {o.dirty && (
                <ActionLink onPress={o.discard} disabled={o.busy}>
                  descartar
                </ActionLink>
              )}
            </View>
          )}
          {o.dirty && (
            <BlockButton onPress={o.handleSave} loading={o.busy}>
              Guardar permisos del canal
            </BlockButton>
          )}
          {o.error && <Feedback tone="error">{o.error}</Feedback>}
          {o.notice && <Feedback>{o.notice}</Feedback>}
        </>
      )}
    </SettingsCell>
  )
}

const useStyles = makeStyles(t => ({
  permission: {
    gap: t.space[1],
    paddingVertical: t.space[3],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[5], rowGap: t.space[2] },
}))
