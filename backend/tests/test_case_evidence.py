"""Localized evidence keeps the existing English API value compatible."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.projects import CaseStudyEvidence, ProjectCaseStudy

CASES = json.loads(
    (Path(__file__).parents[1] / "data" / "project_case_studies.json").read_text(
        encoding="utf-8"
    )
)
LEGACY_EVIDENCE = {
    "label": {"en": "Tests", "pt": "Testes", "es": "Pruebas"},
    "value": "Repository tests",
    "classification": "REAL",
    "source": "backend/tests/",
}


@pytest.mark.parametrize("project_id", CASES)
def test_checked_in_case_evidence_is_fully_localized(project_id):
    case = ProjectCaseStudy.model_validate(CASES[project_id])

    assert case.evidence
    for evidence in case.evidence:
        localized = evidence.localized_value
        assert localized is not None
        assert localized.en == evidence.value
        assert localized.pt and localized.pt != evidence.value
        assert localized.es and localized.es != evidence.value


@pytest.mark.parametrize("extra", [{}, {"localized_value": None}])
def test_evidence_accepts_legacy_english_only_records(extra):
    evidence = CaseStudyEvidence.model_validate({**LEGACY_EVIDENCE, **extra})

    assert evidence.value == LEGACY_EVIDENCE["value"]
    assert evidence.localized_value is None


@pytest.mark.parametrize("missing_language", ["en", "pt", "es"])
def test_localized_evidence_requires_all_supported_languages(missing_language):
    localized = {"en": "Tests", "pt": "Testes", "es": "Pruebas"}
    del localized[missing_language]

    with pytest.raises(ValidationError):
        CaseStudyEvidence.model_validate(
            {**LEGACY_EVIDENCE, "localized_value": localized}
        )
