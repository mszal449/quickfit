from datetime import UTC, datetime

from google_health.google_client import STRENGTH_TRAINING_EXERCISE_TYPE
from google_health.schema import Exercise, ExerciseDataPoint, ExerciseInterval
from google_health.service import _filter_synced
from models.workout_log import WorkoutLog


def test_filter_synced():
    workouts = [WorkoutLog(sync_datapoint_name="synced_name"), WorkoutLog(sync_datapoint_name=None)]
    datapoints = [_example_data_point("synced_name"), _example_data_point("unsynced_name")]
    filtered_workouts, filtered_datapoints = _filter_synced(workouts, datapoints)
    assert filtered_workouts == [workouts[1]]
    assert filtered_datapoints == [datapoints[1]]


def _example_data_point(name: str) -> ExerciseDataPoint:
    return ExerciseDataPoint(
        name=name,
        exercise=Exercise(
            exercise_type=STRENGTH_TRAINING_EXERCISE_TYPE,
            interval=ExerciseInterval(start_time=datetime.now(UTC), end_time=datetime.now(UTC)),
        ),
    )
