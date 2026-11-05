import { useState, type ReactNode } from 'react'
import { Inbox, Mail, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  Button,
  Dialog,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Spinner,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useNotification
} from '../design-system'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

/** Dev-facing preview of every design-system component. */
export function DesignSystemPage() {
  const { t } = useTranslation()
  const { notify } = useNotification()
  const [dialogOpen, setDialogOpen] = useState(false)

  const rows = [
    { name: 'Hanna Tesfaye', date: '2026-01-12', amount: 'ETB 4,250.00', tone: 'success' as const, status: t('status.paid') },
    { name: 'Yonas Bekele', date: '2026-01-11', amount: 'ETB 1,120.00', tone: 'warning' as const, status: t('status.pending') },
    { name: 'Marta Girmay', date: '2026-01-09', amount: 'ETB 880.00', tone: 'danger' as const, status: t('status.overdue') },
    { name: 'Solomon A.', date: '2026-01-08', amount: 'ETB 12,400.00', tone: 'neutral' as const, status: t('status.draft') }
  ]

  return (
    <div className="py-6 md:py-10">
      <h1 className="heading text-2xl md:text-3xl">{t('design.title')}</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">{t('design.subtitle')}</p>

      <div className="mt-8">
        <Section title={t('design.sections.buttons')}>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title={t('design.sections.inputs')}>
          <div className="grid max-w-md gap-4">
            <Input label={t('demo.customerName')} placeholder={t('demo.customerNamePlaceholder')} />
            <Input
              label={t('demo.email')}
              type="email"
              placeholder={t('demo.emailPlaceholder')}
              leadingIcon={<Mail className="h-4 w-4" />}
            />
            <Input label="Error state" defaultValue="not-an-email" error="Enter a valid email address." />
          </div>
        </Section>

        <Section title={t('design.sections.selects')}>
          <div className="max-w-md">
            <Select
              label={t('demo.businessType')}
              placeholder={t('common.selectPrompt')}
              options={[
                { value: 'retail', label: t('demo.businessTypes.retail') },
                { value: 'fnb', label: t('demo.businessTypes.fnb') },
                { value: 'bakery', label: t('demo.businessTypes.bakery') },
                { value: 'service', label: t('demo.businessTypes.service') }
              ]}
            />
          </div>
        </Section>

        <Section title={t('design.sections.dialogs')}>
          <Button onClick={() => setDialogOpen(true)}>{t('demo.openSampleDialog')}</Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title={t('demo.dialogTitle')}
            description={t('demo.dialogDesc')}
            closeLabel={t('common.close')}
            footer={
              <>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    setDialogOpen(false)
                    notify({ title: t('notification.saved.title'), description: t('notification.saved.desc'), tone: 'success' })
                  }}
                >
                  {t('common.save')}
                </Button>
              </>
            }
          >
            <div className="grid gap-4">
              <Input label={t('demo.customerName')} placeholder={t('demo.customerNamePlaceholder')} autoFocus />
              <Input label={t('demo.email')} type="email" placeholder={t('demo.emailPlaceholder')} />
            </div>
          </Dialog>
        </Section>

        <Section title={t('design.sections.navigation')}>
          <p className="max-w-xl text-sm text-muted">
            The top bar above (with the language switcher) and the bottom navigation on mobile are live in this shell —
            resize the window to see the responsive switch.
          </p>
        </Section>

        <Section title={t('design.sections.tables')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted">{r.date}</TableCell>
                  <TableCell className="text-right text-figures">{r.amount}</TableCell>
                  <TableCell>
                    <StatusBadge tone={r.tone} dot>
                      {r.status}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title={t('design.sections.status')}>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="success" dot>
              {t('status.paid')}
            </StatusBadge>
            <StatusBadge tone="warning" dot>
              {t('status.pending')}
            </StatusBadge>
            <StatusBadge tone="danger" dot>
              {t('status.overdue')}
            </StatusBadge>
            <StatusBadge tone="info" dot>
              Info
            </StatusBadge>
            <StatusBadge tone="neutral" dot>
              {t('status.draft')}
            </StatusBadge>
          </div>
        </Section>

        <Section title={t('design.sections.empty')}>
          <div className="rounded-lg border border-border">
            <EmptyState
              icon={Inbox}
              title={t('empty.title')}
              description={t('empty.desc')}
              action={
                <Button variant="secondary" leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
                  {t('common.save')}
                </Button>
              }
            />
          </div>
        </Section>

        <Section title={t('design.sections.loading')}>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Spinner label={t('common.loading')} />
              <Spinner size="sm" />
              <Spinner size="lg" />
            </div>
            <div className="w-full max-w-xs space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </Section>

        <Section title={t('design.sections.notifications')}>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                notify({ title: t('notification.saved.title'), description: t('notification.saved.desc'), tone: 'success' })
              }
            >
              {t('common.showNotification')}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                notify({ title: t('notification.error.title'), description: t('notification.error.desc'), tone: 'danger' })
              }
            >
              Show error toast
            </Button>
          </div>
        </Section>
      </div>
    </div>
  )
}
