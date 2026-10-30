import { useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragStartEvent, type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { Ellipsis, GripVertical } from 'lucide-react'
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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

const menuOf = (appId: number) => `[data-app-menu="${appId}"]`

export function AppsCard({ apps }: { apps: App[] }) {
  const queryClient = useQueryClient()
  const byId = new Map(apps.map((a) => [a.id, a]))
  const appOfRow = (key: string) => byId.get(Number(key.split(':')[1]))
  const rowOfKey = (key: string): AppRow | undefined => {
    const [, appId, platform] = key.split(':')
    const app = byId.get(Number(appId))
    return app && rowsOf(app).find((r) => r.platform === platform)
  }

  // One element for both labels, so switching the mode never unmounts the focused button.
  const modeButtonRef = useRef<HTMLButtonElement>(null)
  // Where focus goes when a dialog closes. Every dialog here is opened by state — from an app's menu or by a drop — so
  // none has a trigger for Radix to return to.
  const focusAfterRef = useRef<string | null>(null)
  const returnFocus = (e: Event) => {
    e.preventDefault()
    const back = focusAfterRef.current ? document.querySelector<HTMLElement>(focusAfterRef.current) : null
    ;(back ?? modeButtonRef.current)?.focus()
  }

  // ── Renaming ────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<App | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [nameBusy, setNameBusy] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  function openEdit(app: App) {
    focusAfterRef.current = menuOf(app.id)
    setNameDraft(app.name)
    setNameError(null)
    setEditing(app)
  }

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (!editing || nameBusy || !nameDraft.trim()) return
    setNameBusy(true)
    setNameError(null)
    try {
      const res = await fetch(`/api/v1/apps/${editing.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft.trim() }),
      })
      // Said inside the dialog: a toast is hidden from screen readers while it is open.
      if (!res.ok) { setNameError('Failed to update app'); return }
      void queryClient.invalidateQueries({ queryKey: queryKeys.apps })
      setEditing(null)
      toast.success('App updated')
    } catch {
      setNameError('Could not reach the relay')
    } finally {
      setNameBusy(false)
    }
  }

  // ── Deletion ────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<App | null>(null)

  function openDelete(app: App) {
    // The app's own menu goes with it, so focus lands on a neighbour's.
    const i = apps.findIndex((a) => a.id === app.id)
    const neighbour = apps[i + 1] ?? apps[i - 1]
    focusAfterRef.current = neighbour ? menuOf(neighbour.id) : null
    setDeleting(app)
  }

  async function handleAppDelete(appId: number) {
    try {
      const res = await fetch(`/api/v1/apps/${appId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) { toast.error('Failed to delete app'); return }
      void queryClient.invalidateQueries({ queryKey: queryKeys.apps })
      toast.success('App deleted')
    } catch {
      toast.error('Failed to delete app')
    }
  }

  // ── Merge mode (#1086) ──────────────────────────────────────────────────
  // People decide two apps are one product; the relay only refuses what would break its rules.
  const [merging, setMerging] = useState(false)
  const [dragging, setDragging] = useState<AppRow | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergeBusy, setMergeBusy] = useState(false)
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
      // The kept app's menu: two apps becoming one removes the mode button, and the dropped row went with the merge.
      focusAfterRef.current = menuOf(pending.target.id)
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
  // A running count across every app, so neighbouring rows wiggle out of step.
  let rowIndex = 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Apps</CardTitle>
        <div className="flex items-center gap-3">
          {merging && <p className="text-sm text-muted-foreground">Drag a bundle ID onto the app it belongs to.</p>}
          {/* Kept while merging: a refetch can leave one app, and the mode must still be leavable. */}
          {(apps.length > 1 || merging) && (
            <Button ref={modeButtonRef} size="sm" variant={merging ? 'outline' : 'ghost'} onClick={() => setMerging((m) => !m)}>
              {merging ? 'Done' : 'Merge apps'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}
            accessibility={{
              announcements,
              screenReaderInstructions: { draggable: 'Press space or enter to pick up this bundle ID. Use the arrow keys to move to another app, space or enter to drop it there, and escape to cancel.' },
            }}>
            <div className="flex flex-col gap-4">
              {apps.map((app) => (
                <AppGroup key={app.id} app={app} merging={merging} dragging={dragging}
                  menu={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        {/* Kept in place while merging so the header does not shift; nothing in it belongs to a merge. */}
                        <Button variant="ghost" size="icon-sm" className={cn('h-8 w-8', merging && 'invisible')}
                          aria-label={`Actions for ${app.name}`} data-app-menu={app.id}>
                          <Ellipsis aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onSelect={() => openEdit(app)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => openDelete(app)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }>
                  {rowsOf(app).map((row) => (
                    <BundleRow key={row.platform} row={row} index={rowIndex++} merging={merging} fixedBecause={whyFixed(app)} />
                  ))}
                </AppGroup>
              ))}
            </div>
          </DndContext>
        </TooltipProvider>
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open && !nameBusy) setEditing(null) }}>
        <DialogContent onCloseAutoFocus={returnFocus}>
          <form onSubmit={saveName} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Edit app</DialogTitle>
              <DialogDescription>The name the team sees in the App Center.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="app-name">App name</Label>
              <Input id="app-name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            </div>
            <p role="status" className="text-sm text-destructive">{nameError}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={!nameDraft.trim()} aria-disabled={nameBusy}
                className="aria-disabled:opacity-50 aria-disabled:cursor-not-allowed">
                {nameBusy ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent onCloseAutoFocus={returnFocus}>
          {deleting && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete app?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{deleting.name}</strong> and all its builds. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="w-24">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={cn(buttonVariants({ variant: 'destructive' }), 'w-24')}
                  onClick={() => handleAppDelete(deleting.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open && !mergeBusy) setPending(null) }}>
        <AlertDialogContent onCloseAutoFocus={returnFocus}>
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
    <span className="flex min-w-0 items-center gap-2">
      <span className={cn('truncate text-xs font-mono text-muted-foreground', row.id === null && 'italic')}>
        {rowText(row)}
      </span>
      <Badge tone={row.platform}>{PLATFORM_LABEL[row.platform]}</Badge>
    </span>
  )
}

function AppGroup({ app, merging, dragging, menu, children }: {
  app: App; merging: boolean; dragging: AppRow | null; menu: ReactNode; children: ReactNode
}) {
  const allowed = dragging !== null && canDrop(dragging, app)
  // Not `disabled` for the apps a row cannot go to: dnd-kit measures droppables as a drag starts, before `dragging`
  // reaches here, so a disabled one would stay unmeasured. The drop is checked again when it lands.
  const { setNodeRef, isOver } = useDroppable({ id: `app:${app.id}`, disabled: !merging })
  const isSource = dragging?.appId === app.id
  return (
    <div
      ref={setNodeRef}
      data-app-id={app.id}
      className={cn(
        'flex flex-col gap-2 rounded-lg bg-background px-4 pb-3 pt-4 transition-[box-shadow,opacity]',
        // Only the app under the row is marked: the ones it cannot go to are already dimmed.
        allowed && isOver && 'ring-2 ring-foreground',
        dragging !== null && !allowed && !isSource && 'opacity-50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{app.name}</span>
        {menu}
      </div>
      <div className="flex flex-col gap-2 py-1.5">{children}</div>
    </div>
  )
}

function BundleRow({ row, index, merging, fixedBecause }: {
  row: AppRow; index: number; merging: boolean; fixedBecause: string | null
}) {
  const movable = merging && fixedBecause === null
  const key = `row:${row.appId}:${row.platform}`
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: key, disabled: !movable })
  const style: CSSProperties = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    // Lifted while held, so it reads as picked up — from the keyboard too, before the first arrow moves it. The `scale`
    // property rather than part of `transform`, so it can ease in without the drag's movement easing behind the pointer.
    scale: isDragging ? '1.03' : '1',
    animationDelay: `${-index * 0.11}s`,
  }
  const fixedInMerge = merging && fixedBecause !== null
  const body = (
    <div
      ref={setNodeRef}
      style={style}
      // Focusable only so a keyboard can reach the reason it stays put.
      tabIndex={fixedInMerge ? 0 : undefined}
      className={cn(
        'flex h-11 items-center gap-2 rounded-md bg-card motion-safe:[transition:scale_150ms_ease-out,box-shadow_150ms_ease-out]',
        movable ? 'p-1.5' : 'px-4',
        // The whole row, like an icon held on a phone's home screen. Not while dragged: the animation's transform would
        // win over the drag's.
        movable && !isDragging && 'animate-row-wiggle motion-reduce:animate-none',
        isDragging && 'relative z-10 shadow-md',
        fixedInMerge && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {movable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label={`Move ${rowText(row)} (${PLATFORM_LABEL[row.platform]}) to another app`}
          data-row-key={key}
          className={cn(
            'flex h-8 w-6 shrink-0 items-center justify-center rounded-sm bg-background touch-none',
            'cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <GripVertical aria-hidden="true" className="size-4 text-muted-foreground" />
        </button>
      )}
      <RowLabel row={row} />
    </div>
  )
  if (!fixedInMerge) return body
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent>{fixedBecause}</TooltipContent>
    </Tooltip>
  )
}
