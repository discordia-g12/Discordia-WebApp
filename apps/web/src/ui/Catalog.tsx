import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ActionLink,
  BlockButton,
  Choice,
  ConfirmDialog,
  ConnectionBanner,
  Modal,
  ModalActions,
  ModalForm,
  DisplayText,
  EmptyState,
  HairlineGrid,
  Logo,
  SectionLabel,
  ServerStrip,
  Skeleton,
  SquareAvatar,
  Tabs,
  Toast,
  UnderlineInput,
  useMotionPreset,
  type MotionPreset,
} from '.';
import styles from './Catalog.module.css';

/**
 * Catálogo del rediseño, solo en desarrollo: /?catalogo (se suma ?tema=oscuro para el modo noche).
 * Activa el flag por su cuenta: es una página de referencia, no parte de la app.
 */
export function Catalog() {
  document.documentElement.dataset.ui = 'nuevo';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Logo size={40} />
        <DisplayText active>Catálogo</DisplayText>
      </header>

      <HairlineGrid columns="repeat(auto-fit, minmax(320px, 1fr))">
        <Section title="DisplayText (nav)">
          <NavDemo />
        </Section>
        <Section title="DisplayText (watermark)">
          <WatermarkDemo />
        </Section>
        <Section title="SectionLabel">
          <CollapsibleDemo />
          <SectionLabel>Mensajes directos</SectionLabel>
        </Section>
        <Section title="UnderlineInput">
          <UnderlineInput label="correo electrónico" required placeholder="ejemplodiscordia@gmail.com" />
          <UnderlineInput label="contraseña" required secret placeholder="tu contraseña" hint="mínimo 8 caracteres" />
          <UnderlineInput label="nombre de usuario" required defaultValue="ju" error="mínimo 3 caracteres alfanuméricos" />
        </Section>
        <Section title="ActionLink / BlockButton">
          <div className={styles.row}>
            <ActionLink>editar</ActionLink>
            <ActionLink>mostrar</ActionLink>
            <ActionLink disabled>reintentar</ActionLink>
          </div>
          <div className={styles.row}>
            <BlockButton>Iniciar sesión</BlockButton>
            <BlockButton loading>Creando cuenta</BlockButton>
            <BlockButton tone="danger">Eliminar</BlockButton>
          </div>
        </Section>
        <Section title="Tabs">
          <TabsDemo />
        </Section>
        <Section title="SquareAvatar">
          <div className={styles.row}>
            <SquareAvatar user={{ displayName: 'Mar Montilla', username: 'mar' }} size="sm" />
            <SquareAvatar user={{ displayName: 'Lbars', username: 'lbars' }} status="online" />
            <SquareAvatar user={{ displayName: 'Iñaki Ibarrolaza', username: 'inaki' }} size="lg" status="offline" />
          </div>
        </Section>
        <Section title="ServerStrip">
          <div className={styles.rail}>
            <ServerStrip server={{ name: 'torton' }} active />
            <ServerStrip server={{ name: 'flor' }} unread="new activity in general" />
            <ServerStrip server={{ name: 'delfín' }} />
          </div>
        </Section>
        <Section title="Toast">
          <Toast message="Mensaje enviado" />
          <Toast message="No se pudo enviar el mensaje" tone="error" action={{ label: 'reintentar', onPress: () => undefined }} />
        </Section>
        <Section title="EmptyState / Skeleton">
          <EmptyState title="por ahora todo está tranquilo" hint="cuando un amigo empiece una actividad aparecerá aquí." />
          <Skeleton lines={4} />
        </Section>
        <Section title="Choice">
          <ChoiceDemo />
        </Section>
        <Section title="Modal / ConfirmDialog">
          <ModalDemo />
        </Section>
        <Section title="ConnectionBanner">
          <BannerDemo />
        </Section>
        <Section title="Movimiento">
          <MotionDemo />
        </Section>
      </HairlineGrid>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <SectionLabel>{title}</SectionLabel>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function NavDemo() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  return (
    <div>
      <DisplayText active={tab === 'login'} onPress={() => setTab('login')}>
        Iniciar sesión
      </DisplayText>
      <DisplayText active={tab === 'register'} onPress={() => setTab('register')}>
        Registrarse
      </DisplayText>
    </div>
  );
}

function WatermarkDemo() {
  const words = ['amigos', 'torton', 'meet core'];
  const tones = ['ink', 'sky', 'muted'] as const;
  const [i, setI] = useState(0);
  return (
    <div>
      <DisplayText variant="watermark" tone={tones[i]}>
        {words[i]}
      </DisplayText>
      <ActionLink onPress={() => setI((i + 1) % words.length)}>cambiar contexto</ActionLink>
    </div>
  );
}

function CollapsibleDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <SectionLabel collapsible open={open} onToggle={() => setOpen(!open)}>
        Canal de texto
      </SectionLabel>
      {open && <p className={styles.channels}>•general<br />•boludeces</p>}
    </div>
  );
}

function TabsDemo() {
  const [value, setValue] = useState('available');
  return (
    <Tabs
      label="Amigos"
      value={value}
      onChange={setValue}
      items={[
        { value: 'available', label: 'Disponible', count: 0 },
        { value: 'pending', label: 'Pendiente' },
        { value: 'blocked', label: 'Bloqueado' },
        { value: 'add', label: 'Añadir amigo', disabled: true },
      ]}
    />
  );
}

function ChoiceDemo() {
  const [value, setValue] = useState('text');
  return (
    <Choice
      label="Tipo de canal"
      value={value}
      onChange={setValue}
      options={[
        { value: 'text', label: 'Texto' },
        { value: 'voice', label: 'Voz' },
      ]}
    />
  );
}

function ModalDemo() {
  const [open, setOpen] = useState<'form' | 'confirm' | null>(null);
  const close = () => setOpen(null);
  return (
    <div>
      <ActionLink onPress={() => setOpen('form')}>abrir modal</ActionLink>{' '}
      <ActionLink onPress={() => setOpen('confirm')}>abrir confirmación</ActionLink>
      <AnimatePresence>
        {open === 'form' && (
          <Modal key="form" title="Crear canal" description="en información" onClose={close}>
            <ModalForm onSubmit={close}>
              <UnderlineInput label="Nombre del canal" required placeholder="nuevo-canal" />
              <ModalActions>
                <ActionLink onPress={close}>cancelar</ActionLink>
                <BlockButton type="submit">Crear</BlockButton>
              </ModalActions>
            </ModalForm>
          </Modal>
        )}
        {open === 'confirm' && (
          <ConfirmDialog key="confirm" action="delete-channel" targetName="general" onConfirm={close} onCancel={close} />
        )}
      </AnimatePresence>
    </div>
  );
}

function BannerDemo() {
  const [active, setActive] = useState(false);
  return (
    <div>
      <ActionLink onPress={() => setActive(!active)}>{active ? 'conectar' : 'cortar la conexión'}</ActionLink>
      <ConnectionBanner active={active} />
    </div>
  );
}

function MotionDemo() {
  const [key, setKey] = useState(0);
  return (
    <div>
      <ActionLink onPress={() => setKey(key + 1)}>repetir</ActionLink>
      <div className={styles.motionRow} key={key}>
        {(['fade', 'rise', 'toast', 'sweep', 'curtain'] as MotionPreset[]).map((preset) => (
          <MotionSample key={preset} preset={preset} />
        ))}
      </div>
    </div>
  );
}

function MotionSample({ preset }: { preset: MotionPreset }) {
  const props = useMotionPreset(preset);
  return (
    <div className={styles.motionBox}>
      <motion.div className={styles.motionInner} {...props}>
        {preset}
      </motion.div>
    </div>
  );
}
