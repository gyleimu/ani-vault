import asyncio
import re
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class CreateTaskRequest(BaseModel):
    name: str
    input_path: str
    output_path: Optional[str] = None
    model: str = "realesrgan-x4"
    scale: int = 4


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    status: TaskStatus = TaskStatus.PENDING
    progress: float = 0.0
    input_path: str
    output_path: Optional[str] = None
    error_message: Optional[str] = None
    logs: list[str] = Field(default_factory=list)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model: str = "realesrgan-x4"
    scale: int = 4


app = FastAPI(title="AI视频增强Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks: dict[str, Task] = {}
task_lock = asyncio.Lock()
connected_clients: set[WebSocket] = set()

DURATION_PATTERN = re.compile(r"Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d+)")
TIME_PATTERN = re.compile(r"time=(\d{2}):(\d{2}):(\d{2})\.(\d+)")


async def broadcast(message: dict):
    disconnected = set()
    for client in connected_clients:
        try:
            await client.send_json(message)
        except Exception:
            disconnected.add(client)
    connected_clients.difference_update(disconnected)


async def broadcast_task_progress(task: Task):
    await broadcast({
        "type": "progress",
        "task_id": task.id,
        "progress": task.progress,
        "status": task.status.value,
        "logs_tail": task.logs[-10:] if task.logs else [],
    })


async def broadcast_task_log(task_id: str, line: str):
    await broadcast({
        "type": "log",
        "task_id": task_id,
        "line": line,
    })


async def broadcast_task_status(task: Task):
    msg: dict = {
        "type": "status",
        "task_id": task.id,
        "status": task.status.value,
    }
    if task.error_message is not None:
        msg["error_message"] = task.error_message
    if task.output_path is not None:
        msg["output_path"] = task.output_path
    if task.finished_at is not None:
        msg["finished_at"] = task.finished_at.isoformat()
    await broadcast(msg)


def parse_duration_to_seconds(h: str, m: str, s: str, frac: str) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(frac) / (10 ** len(frac))


def parse_time_to_seconds(h: str, m: str, s: str, frac: str) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(frac) / (10 ** len(frac))


async def run_ffmpeg_task(task_id: str):
    async with task_lock:
        task = tasks[task_id]
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now(timezone.utc)

    await broadcast_task_status(tasks[task_id])

    input_path = tasks[task_id].input_path
    output_path = tasks[task_id].output_path or f"{input_path}_enhanced.mp4"
    scale = tasks[task_id].scale

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"scale=iw*{scale}:ih*{scale}",
        "-c:v", "libx264",
        "-preset", "medium",
        output_path,
    ]

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stderr=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.DEVNULL,
        )

        total_duration: Optional[float] = None

        assert process.stderr is not None
        while True:
            line_bytes = await process.stderr.readline()
            if not line_bytes:
                break

            line = line_bytes.decode("utf-8", errors="replace").rstrip("\r\n")
            if not line:
                continue

            async with task_lock:
                task = tasks[task_id]
                if task.status == TaskStatus.CANCELED:
                    process.kill()
                    await process.wait()
                    return

                task.logs.append(line)
                await broadcast_task_log(task_id, line)

                if total_duration is None:
                    dur_match = DURATION_PATTERN.search(line)
                    if dur_match:
                        total_duration = parse_duration_to_seconds(
                            dur_match.group(1),
                            dur_match.group(2),
                            dur_match.group(3),
                            dur_match.group(4),
                        )

                if total_duration and total_duration > 0:
                    time_match = TIME_PATTERN.search(line)
                    if time_match:
                        current = parse_time_to_seconds(
                            time_match.group(1),
                            time_match.group(2),
                            time_match.group(3),
                            time_match.group(4),
                        )
                        task.progress = min(100.0, (current / total_duration) * 100)
                        await broadcast_task_progress(task)

        await process.wait()

        async with task_lock:
            task = tasks[task_id]
            if task.status == TaskStatus.CANCELED:
                return

            if process.returncode == 0:
                task.status = TaskStatus.COMPLETED
                task.progress = 100.0
                task.output_path = output_path
                task.finished_at = datetime.now(timezone.utc)
                await broadcast_task_status(task)
                await broadcast({
                    "type": "completed",
                    "task_id": task.id,
                    "output_path": output_path,
                })
            else:
                task.status = TaskStatus.FAILED
                task.error_message = f"FFmpeg进程退出码: {process.returncode}"
                task.finished_at = datetime.now(timezone.utc)
                await broadcast_task_status(task)
                await broadcast({
                    "type": "failed",
                    "task_id": task.id,
                    "error_message": task.error_message,
                })

    except FileNotFoundError:
        async with task_lock:
            task = tasks[task_id]
            task.status = TaskStatus.FAILED
            task.error_message = "未找到ffmpeg，请确认已安装并加入PATH环境变量"
            task.finished_at = datetime.now(timezone.utc)
        await broadcast_task_status(tasks[task_id])
        await broadcast({
            "type": "failed",
            "task_id": task_id,
            "error_message": tasks[task_id].error_message,
        })
    except Exception as e:
        async with task_lock:
            task = tasks[task_id]
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            task.finished_at = datetime.now(timezone.utc)
        await broadcast_task_status(tasks[task_id])
        await broadcast({
            "type": "failed",
            "task_id": task_id,
            "error_message": str(e),
        })


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Worker运行正常", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/tasks", status_code=201)
async def create_task(req: CreateTaskRequest):
    task = Task(
        name=req.name,
        input_path=req.input_path,
        output_path=req.output_path,
        model=req.model,
        scale=req.scale,
    )
    async with task_lock:
        tasks[task.id] = task

    await broadcast({
        "type": "status",
        "task_id": task.id,
        "status": task.status.value,
    })

    asyncio.create_task(run_ffmpeg_task(task.id))
    return task


@app.get("/tasks")
async def list_tasks():
    async with task_lock:
        return list(tasks.values())


@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    async with task_lock:
        task = tasks.get(task_id)
    if task is None:
        return {"error": "任务不存在", "task_id": task_id}
    return task


@app.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    async with task_lock:
        task = tasks.get(task_id)
        if task is None:
            return {"error": "任务不存在", "task_id": task_id}
        if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELED):
            return {"error": "任务已结束，无法取消", "task_id": task_id}
        task.status = TaskStatus.CANCELED
        task.finished_at = datetime.now(timezone.utc)

    await broadcast_task_status(tasks[task_id])
    return {"message": "任务已取消", "task_id": task_id}


@app.websocket("/ws/tasks")
async def websocket_tasks(ws: WebSocket):
    await ws.accept()
    connected_clients.add(ws)
    try:
        async with task_lock:
            init_tasks = [t.model_dump(mode="json") for t in tasks.values()]
        await ws.send_json({"type": "init", "tasks": init_tasks})

        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.discard(ws)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=9980, reload=True)
