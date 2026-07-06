"""
API Route Controller.

Endpoints:
- GET /api/about
- GET /api/projects
- GET /api/projects/{project_id}
- GET /api/stack
- GET /api/experiences
- GET /api/formation
"""

import time
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.use_cases.get_about import GetAboutUseCase
from app.use_cases.get_experiences import GetExperiencesUseCase
from app.use_cases.get_formation import GetFormationUseCase
from app.use_cases.get_philosophy import GetPhilosophyUseCase
from app.use_cases.get_projects import GetProjectByIdUseCase, GetProjectsUseCase
from app.use_cases.get_stack import GetStackUseCase
from app.controllers.chaos import chaos_state
from app.controllers.dependencies import (
    dep_about,
    dep_experiences,
    dep_formation,
    dep_philosophy,
    dep_project_by_id,
    dep_projects,
    dep_stack,
)
from app.core.cache_http import cacheable_response
from app.core.uptime import APP_START_TIME
from app.core.exceptions import ResourceNotFoundError
from app.core.prometheus_aggregation import compute_p95, compute_request_stats
from app.core.rate_limit import check_rate_limit
from app.schemas.about import AboutResponse
from app.schemas.experiences import Experience, ExperiencesResponse
from app.schemas.formation import FormationItem, FormationResponse
from app.schemas.health import MetricsSummary
from app.schemas.philosophy import PhilosophyItemSchema, PhilosophyResponseSchema
from app.schemas.projects import DetailedProject, ProjectSummary, ProjectsResponse
from app.schemas.stack import StackItem, StackResponse

router = APIRouter(tags=["API"])


def _format_uptime(seconds: int) -> str:
    """Converts seconds into a readable and less noisy format (e.g., 2h 14m)."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m"
    return "just started"


@router.get(
    "/metrics/summary",
    response_model=MetricsSummary,
    summary="Observability Summary",
    description="Consolidated metrics for the professional dashboard.",
)
async def get_metrics_summary(response: Response) -> MetricsSummary:
    """
    Returns consolidated metrics for the dashboard sourced from Prometheus.
    """
    response.headers["Cache-Control"] = "public, max-age=15"

    uptime_seconds = int(time.time() - APP_START_TIME)

    p95_seconds, total_samples = compute_p95()
    p95_ms = p95_seconds * 1000

    total_requests, total_5xx = compute_request_stats()
    error_rate = total_5xx / max(total_requests, 1)

    # Factor in chaos incidents — real impact on error rate
    last = chaos_state.last_incident
    recent_incident_active = last is not None and (time.time() - last.timestamp) < 120
    if recent_incident_active and last is not None:
        if last.error_triggered:
            error_rate += 0.03
        if last.requests_dropped > 0:
            error_rate += last.requests_dropped * 0.005
    error_rate = min(error_rate, 1.0)

    # Status derived from real data — SLO threshold is p95 < 100ms
    # (aligned with frontend LATENCY_DEGRADED_MS in useLiveMetrics.ts)
    warming_up = total_samples < 10
    if warming_up:
        p95_status = "warming_up"
        error_status = "warming_up"
    else:
        # p95_status uses a stricter 50ms cutoff — it feeds the warming_up guard
        # in the frontend, not the badge color. system_status below owns the SLO.
        p95_status = "healthy" if p95_ms < 50 else "degraded"
        if recent_incident_active and last is not None and last.error_triggered:
            error_status = "investigating"
        elif error_rate > 0.05:
            error_status = "warning"
        else:
            error_status = "stable"

    if recent_incident_active and last is not None and last.error_triggered:
        system_status = "degraded"
    elif error_rate > 0.05 or (not warming_up and p95_ms >= 100):
        system_status = "degraded"
    else:
        system_status = "operational"

    # Incident tracking from chaos playground
    retries_1h = chaos_state.get_retries_last_hour()
    if last is not None:
        secs_ago = int(time.time() - last.timestamp)
        if secs_ago < 60:
            last_incident_ago = f"{secs_ago}s ago"
        elif secs_ago < 3600:
            last_incident_ago = f"{secs_ago // 60}m ago"
        else:
            last_incident_ago = f"{secs_ago // 3600}h ago"
        last_incident_type = last.type
    else:
        last_incident_ago = "none"
        last_incident_type = "none"

    subsys = chaos_state.subsystem_status

    # worker_status precedence: chaos_state overrides prometheus idle detection
    worker = subsys.get("worker", "ok")
    if worker == "ok" and total_requests == 0:
        worker = "idle"

    return MetricsSummary(
        p95_ms=int(p95_ms),
        p95_status=p95_status,
        requests_since_deploy=total_requests,
        error_rate=round(error_rate, 4),
        error_rate_pct=f"{error_rate * 100:.2f}%",
        error_rate_status=error_status,
        system_status=system_status,
        uptime=_format_uptime(uptime_seconds),
        window="since_deploy",
        timestamp=datetime.now(UTC).isoformat(),
        retries_1h=retries_1h,
        last_incident=last_incident_type,
        last_incident_ago=last_incident_ago,
        worker_status=worker,
        queue_backlog=subsys.get("queue_backlog", 0),
        cache_status=subsys.get("cache", "direct"),
        cache_ttl_s=subsys.get("cache_ttl_s", 0),
        active_path=subsys.get("active_path", "sync"),
        system_lifecycle=subsys.get("system_lifecycle", "NORMAL"),
        total_chaos_events_since_deploy=chaos_state.total_incidents,
    )


@router.get(
    "/about",
    response_model=AboutResponse,
    summary="Developer information",
    description="Returns 'About Me' section data with multi-language text fields.",
    responses={
        200: {"description": "Personal information returned successfully"},
    },
)
async def get_about(
    request: Request,
    response: Response,
    get_about_uc: Annotated[
        GetAboutUseCase,
        Depends(dep_about),
    ],
) -> AboutResponse:
    """
    Retrieves developer's personal information.
    """
    data = await get_about_uc.execute()
    return cacheable_response(request, response, AboutResponse(**data))


@router.get(
    "/projects",
    response_model=ProjectsResponse,
    summary="List projects",
    description="Returns list of projects ordered by highlight status (featured first).",
    responses={
        200: {"description": "Projects list returned successfully"},
    },
)
async def list_projects(
    request: Request,
    response: Response,
    get_projects_uc: Annotated[
        GetProjectsUseCase,
        Depends(dep_projects),
    ],
) -> ProjectsResponse:
    """
    Lists all portfolio projects.
    """
    check_rate_limit(request, "20/minute")
    projects = await get_projects_uc.execute()

    projects_summary = [
        ProjectSummary(
            id=p.id,
            name=p.name,
            short_description=p.short_description,  # type: ignore[arg-type]
            full_description=p.full_description,  # type: ignore[arg-type]
            technologies=p.technologies,
            features=p.features,
            highlighted=p.highlighted,
            repository=p.repository,  # type: ignore[arg-type]
            demo=p.demo,  # type: ignore[arg-type]
            image=p.image,  # type: ignore[arg-type]
        )
        for p in projects
    ]

    result = ProjectsResponse(
        projects=projects_summary,
        total=len(projects_summary),
    )

    return cacheable_response(request, response, result)


@router.get(
    "/projects/{project_id}",
    response_model=DetailedProject,
    summary="Project details",
    description="Returns full details of a specific project by its ID.",
    responses={
        200: {
            "description": "Project found",
            "content": {
                "application/json": {
                    "example": {
                        "id": "portfolio-api",
                        "name": "Portfolio API",
                        "short_description": {"pt": "...", "en": "...", "es": "..."},
                        "full_description": {"pt": "...", "en": "...", "es": "..."},
                        "technologies": ["Python", "FastAPI"],
                        "features": ["CRUD", "Validation"],
                        "learnings": ["Clean Architecture"],
                        "repository": "https://github.com/...",
                        "demo": None,
                        "highlighted": True,
                        "image": None,
                    }
                }
            },
        },
        404: {
            "description": "Project not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "PROJECT_NOT_FOUND",
                            "message": "Project 'xyz' not found",
                        }
                    }
                }
            },
        },
    },
)
async def get_project(
    request: Request,
    response: Response,
    project_id: str,
    get_project_by_id_uc: Annotated[
        GetProjectByIdUseCase,
        Depends(dep_project_by_id),
    ],
) -> DetailedProject:
    """
    Retrieves full details of a project.
    """
    check_rate_limit(request, "20/minute")
    project = await get_project_by_id_uc.execute(project_id)

    if not project:
        raise ResourceNotFoundError(
            message=f"Project '{project_id}' not found",
            code="PROJECT_NOT_FOUND",
        )

    result = DetailedProject(
        id=project.id,
        name=project.name,
        short_description=project.short_description,  # type: ignore[arg-type]
        full_description=project.full_description,  # type: ignore[arg-type]
        technologies=project.technologies,
        features=project.features,
        learnings=project.learnings,
        repository=project.repository,  # type: ignore[arg-type]
        demo=project.demo,  # type: ignore[arg-type]
        highlighted=project.highlighted,
        image=project.image,  # type: ignore[arg-type]
    )

    return cacheable_response(request, response, result)


@router.get(
    "/stack",
    response_model=StackResponse,
    summary="Tech stack",
    description="Returns technologies organized by category.",
    responses={
        200: {"description": "Tech stack returned successfully"},
    },
)
async def get_stack(
    request: Request,
    response: Response,
    get_stack_uc: Annotated[
        GetStackUseCase,
        Depends(dep_stack),
    ],
) -> StackResponse:
    """
    Retrieves organized technical stack.
    """
    by_category = await get_stack_uc.execute()

    # Convert to StackItem
    full_stack = []
    by_category_validated: dict[str, list[StackItem]] = {}

    for category, items in by_category.items():
        validated_items = [StackItem(**item) for item in items]
        by_category_validated[category] = validated_items
        full_stack.extend(validated_items)

    result = StackResponse(
        stack=full_stack,
        by_category=by_category_validated,
    )

    return cacheable_response(request, response, result)


@router.get(
    "/experiences",
    response_model=ExperiencesResponse,
    summary="Professional experiences",
    description="Returns list of experiences ordered chronologically (current first).",
    responses={
        200: {"description": "Experiences list returned successfully"},
    },
)
async def list_experiences(
    request: Request,
    response: Response,
    get_experiences_uc: Annotated[
        GetExperiencesUseCase,
        Depends(dep_experiences),
    ],
) -> ExperiencesResponse:
    """
    Lists professional experiences.
    """
    experiences = await get_experiences_uc.execute()

    experiences_schema = [
        Experience(
            id=e.id,
            role=e.role,  # type: ignore[arg-type]
            company=e.company,
            location=e.location,
            start_date=e.start_date,
            end_date=e.end_date,
            description=e.description,  # type: ignore[arg-type]
            technologies=e.technologies,
            current=e.current,
        )
        for e in experiences
    ]

    result = ExperiencesResponse(
        experiences=experiences_schema,
        total=len(experiences_schema),
    )

    return cacheable_response(request, response, result)


@router.get(
    "/formation",
    response_model=FormationResponse,
    summary="Academic formations",
    description="Returns list of academic formations ordered chronologically (in progress first).",
    responses={
        200: {"description": "Formations list returned successfully"},
    },
)
async def list_formation(
    request: Request,
    response: Response,
    get_formation_uc: Annotated[
        GetFormationUseCase,
        Depends(dep_formation),
    ],
) -> FormationResponse:
    """
    Lists academic formations.
    """
    formations = await get_formation_uc.execute()

    formations_schema = [
        FormationItem(
            id=f.id,
            course=f.course,  # type: ignore[arg-type]
            institution=f.institution,
            location=f.location,
            start_date=f.start_date,
            end_date=f.end_date,
            description=f.description,  # type: ignore[arg-type]
            current=f.current,
        )
        for f in formations
    ]

    result = FormationResponse(
        formations=formations_schema,
        total=len(formations_schema),
    )

    return cacheable_response(request, response, result)


@router.get(
    "/philosophy",
    response_model=PhilosophyResponseSchema,
    summary="System Philosophy",
    description="Returns list of philosophical inspirations, in multiple languages.",
    responses={
        200: {"description": "Philosophical inspirations returned successfully"},
    },
)
async def get_philosophy(
    request: Request,
    response: Response,
    get_philosophy_uc: Annotated[
        GetPhilosophyUseCase,
        Depends(dep_philosophy),
    ],
) -> PhilosophyResponseSchema:
    """
    Lists engineering inspirations and philosophies (tri-language).
    """
    inspirations = await get_philosophy_uc.execute()

    inspirations_schema = [
        PhilosophyItemSchema(
            id=i.id,
            name=i.name,
            role=i.role,
            image_url=i.image_url,
            description=i.description,
        )
        for i in inspirations
    ]

    result = PhilosophyResponseSchema(
        inspirations=inspirations_schema,
        total=len(inspirations_schema),
    )

    return cacheable_response(request, response, result)
