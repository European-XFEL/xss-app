import logging
import os
import time
from typing import Annotated

import sentry_sdk
from starlette.applications import Starlette
from starlette.responses import PlainTextResponse
from starlette.routing import Route, Mount

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext
from pydantic import BaseModel, Field

from .gen import simulation_connect
from .gen.simulation_pb2 import (
    SimulationRequest,
    SimulationResponse,
    SolventInfoRequest,
    SolventInfoResponse,
)

# INFO so instrumentation logs pass the root logger filter; Sentry's logging
# integration forwards INFO+ records as logs when enable_logs is set.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Disabled when SENTRY_DSN is unset; the Starlette integration auto-enables.
# environment/release come from SENTRY_ENVIRONMENT/SENTRY_RELEASE env vars,
# which the SDK reads natively.
sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    traces_sample_rate=1.0,
    enable_logs=True,
)


class QRange(BaseModel):
    min: Annotated[float, Field(ge=0.001)]
    max: Annotated[float, Field(le=10)]
    step: Annotated[float, Field(ge=0.001)]


class File(BaseModel):
    filename: Annotated[str, Field(min_length=4, pattern=r"^.*\.xyz$")]
    contents: Annotated[bytes, Field(min_length=8)]


class SolventName(BaseModel):
    name: Annotated[str, Field(min_length=1)]


class SimulationService(simulation_connect.SimulationService):
    async def calc_debye(
        self, request: SimulationRequest, ctx: RequestContext
    ) -> SimulationResponse:
        from .calculator import calc_debye

        q_range = request.q_range
        QRange(min=q_range.min, max=q_range.max, step=q_range.step)

        structure = request.structure
        File(filename=structure.filename, contents=structure.contents)

        start = time.perf_counter()
        result = calc_debye(
            q_range=request.q_range,
            structure=request.structure,
        )
        duration_ms = (time.perf_counter() - start) * 1000

        sentry_sdk.metrics.count("backend.calc_debye.runs", 1)
        sentry_sdk.metrics.distribution(
            "backend.calc_debye.duration", duration_ms, unit="millisecond"
        )
        logger.info(
            "calc_debye completed in %.0f ms (%s, q %.3f-%.3f step %.4f)",
            duration_ms,
            structure.filename,
            q_range.min,
            q_range.max,
            q_range.step,
        )

        return SimulationResponse(q=result[0], i=result[1])

    async def get_solvent_info(
        self, request: SolventInfoRequest, ctx: RequestContext
    ) -> SolventInfoResponse:
        from .calculator import get_solvent_info

        SolventName(name=request.name)

        try:
            rhom, cpm = get_solvent_info(request.name)
        except Exception as exc:
            logger.warning("Solvent lookup failed for %r: %s", request.name, exc)
            raise ConnectError(
                Code.NOT_FOUND,
                f"Solvent '{request.name}' not recognized: {exc}",
            ) from exc

        return SolventInfoResponse(rhom=rhom, cpm=cpm)


async def healthz(_request):
    return PlainTextResponse("ok", status_code=200)


connect_app = simulation_connect.SimulationServiceASGIApplication(
    service=SimulationService()
)

app = Starlette(
    routes=[
        Route("/healthz", healthz, methods=["GET"]),
        Mount("/", app=connect_app),
    ]
)

if __name__ == "__main__":
    import asyncio
    import uvicorn

    asyncio.run(uvicorn.run(app, host="0.0.0.0", port=50051))
