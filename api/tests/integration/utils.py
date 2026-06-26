import uuid


def example_prescription(exercise_id: uuid.UUID) -> dict:
    return {
        "exercises": [
            {
                "exercise_id": str(exercise_id),
                "sets": [{"min_reps": 8, "max_reps": 12}],
                "description": None,
            }
        ]
    }
