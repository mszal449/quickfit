import uuid

from models.set_log import SetLog


def workout_summary(sets: list[SetLog]) -> str:
    if not sets:
        return "No sets were recorded for this workout."

    by_exercise: dict[uuid.UUID, list[SetLog]] = {}
    for s in sets:
        by_exercise.setdefault(s.exercise_id, []).append(s)

    lines: list[str] = []
    for exercise_sets in by_exercise.values():
        exercise_sets.sort(key=lambda s: s.set_index)
        name = _exercise_name(exercise_sets[0])
        rendered = ", ".join(_format_set(s) for s in exercise_sets)
        lines.append(f"{name}: {rendered}")

    return "\n".join(lines)


def _exercise_name(s: SetLog) -> str:
    if s.exercise is not None and s.exercise.name:
        return s.exercise.name
    return f"exercise {s.exercise_id}"


def _format_set(s: SetLog) -> str:
    parts: list[str] = []
    if s.weight is not None and s.reps is not None:
        parts.append(f"{_number(s.weight)}kg × {s.reps}")
    elif s.reps is not None:
        parts.append(f"{s.reps} reps")
    elif s.weight is not None:
        parts.append(f"{_number(s.weight)}kg")
    if s.duration_seconds is not None:
        parts.append(_format_duration(s.duration_seconds))
    if s.distance_m is not None:
        parts.append(f"{_number(s.distance_m / 1000)} km")

    rendered = " / ".join(parts) if parts else "logged, no metrics"
    if not s.completed:
        rendered += " (incomplete)"
    return rendered


def _format_duration(total_seconds: int) -> str:
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def _number(value: float) -> str:
    return f"{value:g}"
