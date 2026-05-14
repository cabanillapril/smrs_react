from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database.db import init_db
from .routes import student_routes, grade_routes, deficiency_routes, curriculum_routes, subject_routes, dashboard_routes, auth_routes

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="CTech SMRS API", version="1.0.0", lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])
app.include_router(student_routes.router, prefix="/students", tags=["Students"])
app.include_router(grade_routes.router, prefix="/grades", tags=["Grades"])
app.include_router(deficiency_routes.router, prefix="/deficiencies", tags=["Deficiencies"])
app.include_router(curriculum_routes.router, prefix="/curriculum", tags=["Curriculum"])
app.include_router(subject_routes.router, prefix="/subjects", tags=["Subjects"])
app.include_router(dashboard_routes.router, prefix="/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {"message": "CTech SMRS API is running"}
