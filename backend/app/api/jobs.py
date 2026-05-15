from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.models import Job, JobSearch, JobSearchResult
from app.worker.celery_app import celery_app
from app.worker.tasks import discover_jobs_task, score_jobs_task

router = APIRouter(prefix="/jobs", tags=["jobs"])


class DiscoverRequest(BaseModel):
    user_id: int
    title: str
    location: str
    limit: int = 20


@router.post("/discover")
def discover_jobs(body: DiscoverRequest, session: Session = Depends(get_session)):
    search = JobSearch(
        user_id=body.user_id,
        title=body.title,
        location=body.location
    )

    session.add(search)
    session.commit()
    session.refresh(search)

    task = discover_jobs_task.delay(
        body.user_id,
        body.title,
        body.location,
        body.limit,
        search.id
    )

    search.task_id = task.id
    session.add(search)
    session.commit()

    return {
        "task_id": task.id,
        "search_id": search.id,
        "status": "discovering"
    }


@router.get("/discover/{task_id}/status")
def discover_status(task_id: str):
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "state": result.state
    }


class ScoreRequest(BaseModel):
    user_id: int
    resume_id: int


class ScoreBatchRequest(BaseModel):
    user_id: int
    resume_id: int
    search_id: int | None = None


@router.post("/{job_id}/score")
def score_job(
    job_id: int,
    body: ScoreRequest,
    session: Session = Depends(get_session)
):
    # Verify job exists and belongs to user
    job = session.get(Job, job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    if job.user_id != body.user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to score this job"
        )

    task = score_jobs_task.delay([job_id], body.resume_id)

    return {
        "task_id": task.id,
        "job_id": job_id,
        "status": "scoring"
    }


@router.get("/score/{task_id}/status")
def score_status(task_id: str):
    result = celery_app.AsyncResult(task_id)

    return {
        "task_id": task_id,
        "state": result.state
    }


@router.post("/score/batch")
def score_jobs_batch(
    body: ScoreBatchRequest,
    session: Session = Depends(get_session)
):
    if body.search_id is not None:
        jobs = session.exec(
            select(Job)
            .join(
                JobSearchResult,
                Job.id == JobSearchResult.job_id
            )
            .where(JobSearchResult.search_id == body.search_id)
            .where(Job.user_id == body.user_id)
            .where(Job.status == "pending")
        ).all()
    else:
        jobs = session.exec(
            select(Job)
            .where(Job.user_id == body.user_id)
            .where(Job.status == "pending")
        ).all()

    job_ids = [job.id for job in jobs]

    task = score_jobs_task.delay(
        job_ids,
        body.resume_id
    )

    return {
        "task_id": task.id,
        "job_count": len(job_ids),
        "status": "scoring"
    }


@router.get("/")
def list_jobs(
    user_id: int,
    search_id: int | None = None,
    session: Session = Depends(get_session)
):
    query = select(Job).where(Job.user_id == user_id)

    if search_id is not None:
        query = (
            select(Job)
            .join(
                JobSearchResult,
                Job.id == JobSearchResult.job_id
            )
            .where(JobSearchResult.search_id == search_id)
            .where(Job.user_id == user_id)
        )

    jobs = session.exec(query).all()

    # Sort by score descending, None scores last
    jobs = sorted(
        jobs,
        key=lambda job: (
            job.score is None,
            -(job.score or 0)
        )
    )

    return jobs