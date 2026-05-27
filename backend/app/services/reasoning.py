import json

from groq import Groq
from pydantic import BaseModel, ValidationError

from app.core.config import settings


class ScoringResult(BaseModel):
    score: int        # 1-10
    fit_reasoning: str


_SYSTEM_PROMPT = """\
You are a senior technical recruiter. Given a candidate's resume in Markdown and a job description, \
evaluate how well the candidate fits the role.

Respond ONLY with a valid JSON object — no markdown fences, no extra text — in this exact schema:
{"score": <integer 1-10>, "fit_reasoning": "<one concise paragraph>"}

Scoring rubric:
- 9-10: Near-perfect match; candidate meets almost all requirements.
- 7-8:  Strong match; minor gaps in skills or experience.
- 5-6:  Partial match; some relevant experience but notable gaps.
- 3-4:  Weak match; limited relevant experience.
- 1-2:  Poor match; candidate unlikely to be considered.\
"""


class ReasoningService:
    @staticmethod
    def score(resume_markdown: str, job_description: str) -> ScoringResult:
        resume_markdown = resume_markdown[:6000]
        job_description = job_description[:4000]
        client = Groq(api_key=settings.GROQ_API_KEY)

        user_message = (
            f"## Resume\n\n{resume_markdown}\n\n"
            f"## Job Description\n\n{job_description}"
        )

        response = client.chat.completions.create(
            model=settings.SCORING_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            max_tokens=512,
        )

        raw = response.choices[0].message.content.strip()

        if raw.startswith("```json"):
            raw = raw[7:]
        elif raw.startswith("```"):
            raw = raw[3:]
        
        if raw.endswith("```"):
            raw = raw[:-3]
            
        raw = raw.strip()

        try:
            data = json.loads(raw)
            return ScoringResult(**data)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"ReasoningService: invalid LLM response: {raw!r}") from exc
