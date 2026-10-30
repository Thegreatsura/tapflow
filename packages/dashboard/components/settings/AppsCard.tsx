import { useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragStartEvent, type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries'
import type { App } from '@/lib/types'
import { canDrop, rowsOf, UNKNOWN_BUNDLE_ID, whyFixed, type AppRow } from '@/lib/appRows'
import { cn } from '@/lib/utils'
import { PLATFORM_LABEL } from '@/lib/build-format'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/**
 * Arrow keys jump between the apps `accepts` says a row can go to, top to bottom. dnd-kit's default moves the row 25px a
 * press, which takes a keyboard user many presses to reach the next card.
 */
const LAND = 8

function jumpBetweenApps(accepts: (activeId: string, droppableId: string) => boolean): KeyboardCoordinateGetter {
  return (event, { active, context }) => {
    const down = event.code === 'ArrowDown' || event.code === 'ArrowRight'
    const up = event.code === 'ArrowUp' || event.code === 'ArrowLeft'
    if (!down && !up) return undefined
    event.preventDefault()
    const at = context.collisionRect?.top ?? 0
    const rects = context.droppableContainers.getEnabled()
      .filter((c) => accepts(String(active), String(c.id)))
      .map((c) => context.droppableRects.get(c.id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
      .sort((a, b) => a.top - b.top)
    // Compared by where the row lands (8px in), so a row already on an app moves off it in either direction.
    const next = down ? rects.find((r) => r.top + LAND > at + 1) : [...rects].reverse().find((r) => r.top + LAND < at - 1)
    return next ? { x: next.left + LAND, y: next.top + LAND } : undefined
  }
}

interface Pending { row: AppRow; source: App; target: App }

export function AppsCard({ apps }: { apps: App[] }) {
  const queryClient = useQueryClient()
  const byId = new Map(apps.map((a) => [a.id, a]))
  const appOfRow = (key: string) => byId.get(Number(key.split(':')[1]))
  const rowOfKey = (key: string): AppRow | undefined => {
    const [, appId, platform] = key.split(':')
    const app = byId.get(Number(appId))
    return app && rowsOf(app).find((r) => r.platform === platform)
  }

  // ── Names and deletion ──────────────────────────────────────────────────
  // Names being edited, by app. An app not in here shows its saved name.
  const [appNames, setAppNames] = useState<Record<number, string>>({})
  const [appsSaving, setAppsSaving] = useState<Record<number, boolean>>({})
  const [appsDeleting, setAppsDeleting] = useState<Record<number, boolean>>({})

  async function handleAppDelete(appId: number) {
    setAppsDeleting((p) => ({ ...p, [appId]: true }))
    try {
      const res = await fetch(`/api/v1/apps/${appId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) { toast.error('Failed to delete app'); return }
      void queryClient.invalidateQueries({ queryKey: queryKeys.apps })
      toast.success('App deleted')
    } catch {
      toast.error('Failed to delete app')
    } finally {
      setAppsDeleting((p) => ({ ...p, [appId]: false }))
    }
  }

  async function handleAppNameSave(appId: number) {
    setAppsSaving((p) => ({ ...p, [appId]: true }))
    try {
      const res = await fetch(`/api/v1/apps/${appId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: appNames[appId] ?? apps.find((a) => a.id === appId)?.name }),
      })
      if (!res.ok) { toast.error('Failed to update app'); return }
      toast.success('App updated')
      setAppNames(({ [appId]: _saved, ...rest }) => rest)
      void queryClient.invalidateQueries({ queryKey: queryKeys.apps })
    } catch {
      toast.error('Failed to update app')
    } finally {
      setAppsSaving((p) => ({ ...p, [appId]: false }))
    }
  }

  // ── Merge mode (#1086) ──────────────────────────────────────────────────
  // People decide two apps are one product; the relay only refuses what would break its rules.
  const [merging, setMerging] = useState(false)
  const [dragging, setDragging] = useState<AppRow | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergeBusy, setMergeBusy] = useState(false)
  // One element for both labels, so switching the mode never unmounts the focused button.
  const modeButtonRef = useRef<HTMLButtonElement>(null)
  // Where focus goes when the dialog closes: the kept app's name after a merge (the only control sure to be there —
  // two apps becoming one removes the mode button), else back on the row that was dropped.
  const focusAfterRef = useRef<string | null>(null)
  const accepts = (activeId: string, droppableId: string) => {
    const row = rowOfKey(activeId)
    const target = appOfRow(droppableId)
    return row !== undefined && target !== undefined && canDrop(row, target)
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: jumpBetweenApps(accepts) }),
  )

  const rowLabel = (row: AppRow) => `${rowText(row)} (${PLATFORM_LABEL[row.platform]})`
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const row = rowOfKey(String(active.id))
      return row ? `Picked up ${rowLabel(row)}. Use the arrow keys to move to another app.` : undefined
    },
    onDragOver: ({ active, over }) => {
      const target = over ? appOfRow(String(over.id)) : undefined
      return target && accepts(String(active.id), String(over!.id)) ? `Over ${target.name}.` : 'Not over an app this can go to.'
    },
    onDragEnd: ({ active, over }) => {
      const target = over ? appOfRow(String(over.id)) : undefined
      return target && accepts(String(active.id), String(over!.id)) ? `Dropped on ${target.name}.` : 'Nothing changed.'
    },
    onDragCancel: () => 'Cancelled. Nothing changed.',
  }

  function onDragStart({ active }: DragStartEvent) {
    setDragging(rowOfKey(String(active.id)) ?? null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    const row = rowOfKey(String(active.id))
    const target = over && appOfRow(String(over.id))
    const source = row && byId.get(row.appId)
    if (!row || !target || !source || !canDrop(row, target)) return
    setMergeError(null)
    focusAfterRef.current = `[data-row-key="${String(active.id)}"]`
    setPending({ row, source, target })
  }

  async function confirmMerge() {
    if (!pending || mergeBusy) return
    setMergeBusy(true)
    setMergeError(null)
    try {
      const res = await fetch(`/api/v1/apps/${pending.target.id}/merge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromAppId: pending.source.id, platform: pending.row.platform }),
      })
      if (!res.ok) {
        // Said inside the dialog: a toast is hidden from screen readers while it is open.
        const body = await res.json().catch(() => ({})) as { error?: string }
        setMergeError(body.error ?? 'Could not merge these apps')
        return
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.apps })
      void queryClient.invalidateQueries({ queryKey: ['builds'] })
      const into = pending.target.name
      focusAfterRef.current = `#app-${pending.target.id}`
      setPending(null)
      setMerging(false)
      toast.success(`Merged into ${into}`)
    } catch {
      setMergeError('Could not reach the relay')
    } finally {
      setMergeBusy(false)
    }
  }

  const sourceEmptied = pending !== null && rowsOf(pending.source).length === 1

  return (
    <Card className={cn(merging && 'border-dashed border-foreground/40')}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Apps</CardTitle>
        <div className="flex items-center gap-3">
          {merging && <p className="text-sm text-muted-foreground">Drag a bundle ID onto the app it belongs to.</p>}
          {apps.length > 1 && (
            <Button ref={modeButtonRef} size="sm" variant={merging ? 'default' : 'outline'} onClick={() => setMerging((m) => !m)}>
              {merging ? 'Done' : 'Merge apps'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {merging ? (
          <TooltipProvider>
            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}
              accessibility={{
                announcements,
                screenReaderInstructions: { draggable: 'Press space or enter to pick up this bundle ID. Use the arrow keys to move to another app, space or enter to drop it there, and escape to cancel.' },
              }}>
              <div className="flex flex-col gap-2">
                {apps.map((app) => (
                  <MergeTarget key={app.id} app={app} dragging={dragging}>
                    {rowsOf(app).map((row) => (
                      <MergeRow key={row.platform} row={row} fixedBecause={whyFixed(app)} />
                    ))}
                  </MergeTarget>
                ))}
              </div>
            </DndContext>
          </TooltipProvider>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {apps.map((app) => (
              <div key={app.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <Label htmlFor={`app-${app.id}`}>App Name</Label>
                <Input
                  id={`app-${app.id}`}
                  value={appNames[app.id] ?? app.name}
                  onChange={(e) => setAppNames((p) => ({ ...p, [app.id]: e.target.value }))}
                />
                <div className="flex flex-col gap-1.5 mt-1">
                  {rowsOf(app).map((row) => <RowLabel key={row.platform} row={row} />)}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={appsSaving[app.id]}
                      onClick={() => handleAppNameSave(app.id)}
                    >
                      {appsSaving[app.id] ? 'Saving…' : 'Save'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={appsDeleting[app.id]}>
                          {appsDeleting[app.id] ? 'Deleting…' : 'Delete'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete app?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>{app.name}</strong> and all its builds. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="w-24">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className={cn(buttonVariants({ variant: 'destructive' }), 'w-24')}
                            onClick={() => handleAppDelete(app.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Opened by a drop, not a trigger, so it puts focus back itself. */}
      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open && !mergeBusy) setPending(null) }}>
        <AlertDialogContent onCloseAutoFocus={(e) => {
          e.preventDefault()
          const back = focusAfterRef.current ? document.querySelector<HTMLElement>(focusAfterRef.current) : null
          ;(back ?? modeButtonRef.current)?.focus()
        }}>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Merge into {pending.target.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{rowLabel(pending.row)}</strong> moves from <strong>{pending.source.name}</strong> with its builds,
                  and their comments, recordings and run records.
                  {sourceEmptied ? ` ${pending.source.name} is then removed.` : ''} The app keeps the name {pending.target.name}.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <p role="status" className="text-sm text-destructive">{mergeError}</p>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {/* Waits for the relay and stays open on a refusal, which it says above. */}
                <Button
                  className={cn(buttonVariants({ variant: 'destructive' }), 'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed')}
                  aria-disabled={mergeBusy}
                  onClick={confirmMerge}
                >
                  {mergeBusy ? 'Merging…' : 'Merge'}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/** What a row is called on screen and to assistive tech alike, so a spoken "click No bundle ID" finds it. */
function rowText(row: AppRow): string {
  return row.id === UNKNOWN_BUNDLE_ID ? 'No readable bundle ID' : row.id ?? 'No bundle ID'
}

function RowLabel({ row }: { row: AppRow }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('text-xs font-mono text-muted-foreground', row.id === null && 'italic')}>
        {rowText(row)}
      </span>
      <Badge tone={row.platform}>{PLATFORM_LABEL[row.platform]}</Badge>
    </span>
  )
}

function MergeTarget({ app, dragging, children }: { app: App; dragging: AppRow | null; children: ReactNode }) {
  const allowed = dragging !== null && canDrop(dragging, app)
  // Not `disabled` for the apps a row cannot go to: dnd-kit measures droppables as a drag starts, before `dragging`
  // reaches here, so a disabled one would stay unmeasured. The drop is checked again when it lands.
  const { setNodeRef, isOver } = useDroppable({ id: `app:${app.id}` })
  const isSource = dragging?.appId === app.id
  return (
    <div
      ref={setNodeRef}
      data-app-id={app.id}
      className={cn(
        'flex flex-col gap-1.5 rounded-md border p-3 transition-colors',
        allowed && 'border-dashed border-foreground/50',
        allowed && isOver && 'bg-accent border-solid border-foreground',
        dragging !== null && !allowed && !isSource && 'opacity-50',
      )}
    >
      <span className="text-sm font-medium">{app.name}</span>
      {children}
    </div>
  )
}

function MergeRow({ row, fixedBecause }: { row: AppRow; fixedBecause: string | null }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `row:${row.appId}:${row.platform}`,
    disabled: fixedBecause !== null,
  })
  const grip = (
    <button
      type="button"
      ref={setNodeRef}
      {...(fixedBecause === null ? listeners : {})}
      {...attributes}
      aria-disabled={fixedBecause !== null || undefined}
      aria-label={`Move ${rowText(row)} (${PLATFORM_LABEL[row.platform]}) to another app`}
      data-row-key={`row:${row.appId}:${row.platform}`}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        'flex items-center gap-2 rounded-sm px-1 py-0.5 text-left touch-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        fixedBecause === null ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-60',
        isDragging && 'relative z-10 bg-background shadow-md',
      )}
    >
      <GripVertical
        aria-hidden="true"
        className={cn('size-4 text-muted-foreground', fixedBecause === null && !isDragging && 'animate-grip-wiggle motion-reduce:animate-none')}
      />
      <RowLabel row={row} />
    </button>
  )
  if (fixedBecause === null) return grip
  return (
    <Tooltip>
      <TooltipTrigger asChild>{grip}</TooltipTrigger>
      <TooltipContent>{fixedBecause}</TooltipContent>
    </Tooltip>
  )
}
