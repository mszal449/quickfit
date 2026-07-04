import { useRef, useState, type PointerEvent } from "react";
import { PlusIcon } from "../../../components/icons";
import { Skeleton } from "../../../components/ui/Skeleton";
import { ExerciseCardEditor } from "./ExerciseCardEditor";
import type { DraftExercise } from "./prescriptionDraft";

interface SessionEditorProps {
  exercises: DraftExercise[];
  namesById: Map<string, string>;
  onReorder: (from: number, to: number) => void;
  onChangeExercise: (exercise: DraftExercise) => void;
  onRemove: (uid: string) => void;
  onInsertAt: (index: number) => void;
  readOnly?: boolean;
}

interface DragState {
  uid: string;
  fromIndex: number;
  dropSlot: number;
  placeholderHeight: number;
  left: number;
  width: number;
  grabOffset: number;
  clientY: number;
}

const EDGE = 90;
const MAX_SCROLL_SPEED = 18;

export function SessionEditor({
  exercises,
  namesById,
  onReorder,
  onChangeExercise,
  onRemove,
  onInsertAt,
  readOnly = false,
}: SessionEditorProps) {
  const cardEls = useRef(new Map<string, HTMLDivElement>());
  const rows = useRef<{ top: number; height: number }[]>([]);
  const fromIndexRef = useRef<number | null>(null);
  const pointerY = useRef(0);
  const dragging = useRef(false);
  const rafId = useRef<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const computeSlot = () => {
    const pageY = pointerY.current + window.scrollY;
    let slot = rows.current.findIndex((r) => pageY < r.top + r.height / 2);
    if (slot === -1) slot = rows.current.length;
    return slot;
  };

  const handlePointerDown = (index: number, uid: string, e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const rects = exercises.map((ex) =>
      cardEls.current.get(ex.uid)!.getBoundingClientRect(),
    );
    const scrollY = window.scrollY;
    rows.current = rects.map((r) => ({
      top: r.top + scrollY,
      height: r.height,
    }));
    const origin = rects[index];

    fromIndexRef.current = index;
    pointerY.current = e.clientY;
    dragging.current = true;
    setDrag({
      uid,
      fromIndex: index,
      dropSlot: index,
      placeholderHeight: origin.height,
      left: origin.left,
      width: origin.width,
      grabOffset: e.clientY - origin.top,
      clientY: e.clientY,
    });

    const onMove = (ev: globalThis.PointerEvent) => {
      pointerY.current = ev.clientY;
      setDrag((prev) =>
        prev ? { ...prev, clientY: ev.clientY, dropSlot: computeSlot() } : prev,
      );
    };

    const onUp = () => {
      dragging.current = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const from = fromIndexRef.current;
      if (from != null) {
        const slot = computeSlot();
        const newIndex = slot > from ? slot - 1 : slot;
        if (newIndex !== from) onReorder(from, newIndex);
      }
      fromIndexRef.current = null;
      setDrag(null);
    };

    const tick = () => {
      if (!dragging.current) return;
      const y = pointerY.current;
      const vh = window.innerHeight;
      let delta = 0;
      if (y < EDGE) delta = -MAX_SCROLL_SPEED * (1 - Math.max(0, y) / EDGE);
      else if (y > vh - EDGE)
        delta = MAX_SCROLL_SPEED * (1 - Math.max(0, vh - y) / EDGE);
      if (delta !== 0) {
        window.scrollBy(0, delta);
        setDrag((prev) => (prev ? { ...prev, dropSlot: computeSlot() } : prev));
      }
      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    rafId.current = requestAnimationFrame(tick);
  };

  return (
    <div className="flex flex-col">
      {!readOnly && <Slot index={0} drag={drag} onInsert={onInsertAt} />}

      {exercises.map((ex, i) => {
        const dragged = drag?.uid === ex.uid;
        return (
          <div key={ex.uid}>
            {dragged && (
              <div key="ph" style={{ height: drag.placeholderHeight }}>
                <Skeleton className="h-full w-full rounded-2xl" />
              </div>
            )}

            <div
              key="card"
              ref={(el) => {
                if (el) cardEls.current.set(ex.uid, el);
                else cardEls.current.delete(ex.uid);
              }}
              style={
                dragged
                  ? {
                      position: "fixed",
                      top: drag.clientY - drag.grabOffset,
                      left: drag.left,
                      width: drag.width,
                      zIndex: 50,
                    }
                  : undefined
              }
              className={dragged ? "pointer-events-none touch-none" : undefined}
            >
              <ExerciseCardEditor
                exercise={ex}
                name={namesById.get(ex.exercise_id) ?? "Exercise"}
                index={i}
                onChange={onChangeExercise}
                onRemove={() => onRemove(ex.uid)}
                onHandlePointerDown={(e) => handlePointerDown(i, ex.uid, e)}
                isDragging={dragged}
                readOnly={readOnly}
              />
            </div>

            {readOnly ? (
              i < exercises.length - 1 && <div key="gap" className="h-3" />
            ) : (
              <Slot
                key="slot"
                index={i + 1}
                drag={drag}
                onInsert={onInsertAt}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SlotProps {
  index: number;
  drag: DragState | null;
  onInsert: (index: number) => void;
}

function Slot({ index, drag, onInsert }: SlotProps) {
  if (drag) {
    return (
      <div className="flex h-8 items-center px-1">
        {drag.dropSlot === index && (
          <div className="bg-primary h-1 w-full rounded-full" />
        )}
      </div>
    );
  }
  return (
    <div className="group flex h-8 items-center justify-center">
      <button
        type="button"
        aria-label="Insert exercise here"
        onClick={() => onInsert(index)}
        className="text-faint hover:border-primary/50 hover:text-primary border-border-strong flex h-6 w-6 items-center justify-center rounded-full border border-dashed opacity-50 transition-all group-hover:opacity-100"
      >
        <PlusIcon size={14} />
      </button>
    </div>
  );
}
