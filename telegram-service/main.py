"""
Telegram Service - Python microservice for Telegram operations
Handles: login, group joining, broadcasting, session management
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import asyncio
from telegram_manager import TelegramManager
from jobs import job_manager, JobType

load_dotenv()

app = FastAPI(title="Telegram Service", version="1.0.0")

# CORS - Next.js'ten gelen istekleri kabul et
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session yönetimi için dictionary
telegram_clients = {}


# Request/Response Models
class LoginRequest(BaseModel):
    phone: str
    api_id: int
    api_hash: str


class VerifyRequest(BaseModel):
    phone: str
    code: str
    password: Optional[str] = None


class JoinGroupsRequest(BaseModel):
    phone: str
    group_links: List[str]
    min_delay: int = 30
    max_delay: int = 60


class BroadcastRequest(BaseModel):
    phone: str
    group_links: List[str]
    message: str


class AccountInfoRequest(BaseModel):
    phone: str
    api_id: Optional[int] = None
    api_hash: Optional[str] = None


@app.get("/")
async def root():
    return {
        "service": "Telegram Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/telegram/login")
async def start_login(request: LoginRequest):
    """Telegram login başlat - kod gönder"""
    try:
        manager = TelegramManager(
            phone=request.phone,
            api_id=request.api_id,
            api_hash=request.api_hash
        )
        
        result = await manager.send_code()
        
        # Manager'ı sakla (verification için)
        telegram_clients[request.phone] = manager
        
        return {
            "success": True,
            "message": "Doğrulama kodu gönderildi",
            "phone": request.phone,
            "phone_code_hash": result.get("phone_code_hash")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/telegram/verify")
async def verify_code(request: VerifyRequest):
    """Telegram kod doğrula ve giriş yap"""
    try:
        if request.phone not in telegram_clients:
            raise HTTPException(status_code=400, detail="Önce login endpoint'ini çağırın")
        
        manager = telegram_clients[request.phone]
        result = await manager.verify_code(request.code, request.password)
        
        # 2FA gerekiyorsa
        if result.get("requires_2fa"):
            return {
                "success": False,
                "requires_2fa": True,
                "message": result.get("message", "2FA password required")
            }
        
        # Başarılı giriş
        return {
            "success": True,
            "message": "Giriş başarılı",
            "user": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/telegram/join-groups")
async def join_groups(request: JoinGroupsRequest):
    """Gruplara katıl - delay ile"""
    try:
        if request.phone not in telegram_clients:
            raise HTTPException(status_code=400, detail="Hesap giriş yapmamış")
        
        manager = telegram_clients[request.phone]
        results = await manager.join_groups(
            group_links=request.group_links,
            min_delay=request.min_delay,
            max_delay=request.max_delay
        )
        
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/telegram/broadcast")
async def broadcast_message(request: BroadcastRequest):
    """Gruplara mesaj gönder"""
    try:
        if request.phone not in telegram_clients:
            raise HTTPException(status_code=400, detail="Hesap giriş yapmamış")
        
        manager = telegram_clients[request.phone]
        results = await manager.broadcast_message(
            group_links=request.group_links,
            message=request.message
        )
        
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/telegram/account-info")
async def get_account_info(request: AccountInfoRequest):
    """Hesap bilgilerini al"""
    try:
        if request.phone not in telegram_clients:
            raise HTTPException(status_code=400, detail="Hesap giriş yapmamış")
        
        manager = telegram_clients[request.phone]
        info = await manager.get_account_info()
        
        return {
            "success": True,
            "info": info
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/telegram/get-joined-groups")
async def get_joined_groups(request: AccountInfoRequest):
    """Hesabın katıldığı grupları al"""
    try:
        # Eğer client yoksa session'dan yükle
        if request.phone not in telegram_clients:
            # Session dosyası var mı kontrol et
            sessions_dir = os.getenv("SESSIONS_DIR", "./sessions")
            session_file = os.path.join(sessions_dir, f"{request.phone}.session")
            
            if not os.path.exists(session_file):
                raise HTTPException(status_code=400, detail="Hesap bulunamadı. Lütfen önce giriş yapın.")
            
            if not request.api_id or not request.api_hash:
                raise HTTPException(status_code=400, detail="API credentials gerekli")
            
            # Session'dan yükle
            manager = TelegramManager(
                phone=request.phone,
                api_id=request.api_id,
                api_hash=request.api_hash
            )
            
            # Client'ı bağla (session dosyasından otomatik yükler)
            await manager.client.connect()
            
            if not await manager.client.is_user_authorized():
                raise HTTPException(status_code=400, detail="Session geçersiz. Lütfen tekrar giriş yapın.")
            
            telegram_clients[request.phone] = manager
        
        manager = telegram_clients[request.phone]
        groups = await manager.get_joined_groups()
        
        return {
            "success": True,
            "groups": groups
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/telegram/disconnect")
async def disconnect_account(request: AccountInfoRequest):
    """Hesabı kapat"""
    try:
        if request.phone in telegram_clients:
            manager = telegram_clients[request.phone]
            await manager.disconnect()
            del telegram_clients[request.phone]
        
        return {
            "success": True,
            "message": "Hesap kapatıldı"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# JOB MANAGEMENT ENDPOINTS
# ============================================================================

class StartJoinJobRequest(BaseModel):
    account_phones: List[str]
    group_links: List[str]
    min_delay: int = 30
    max_delay: int = 60


@app.post("/telegram/jobs/start-join")
async def start_join_job(request: StartJoinJobRequest):
    """Create and start a background join job"""
    try:
        # Create job
        job = job_manager.create_job(
            job_type=JobType.JOIN,
            params={
                "account_phones": request.account_phones,
                "group_links": request.group_links,
                "min_delay": request.min_delay,
                "max_delay": request.max_delay
            }
        )
        
        # Start job in background
        await job_manager.start_job(job.id, telegram_clients)
        
        return {
            "success": True,
            "job_id": job.id,
            "message": "Job started successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/telegram/jobs")
async def list_jobs():
    """List all jobs"""
    try:
        jobs = job_manager.list_jobs()
        return {
            "jobs": [job.to_dict() for job in jobs]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/telegram/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job details"""
    try:
        job = job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return job.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/telegram/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancel a running job"""
    try:
        job = job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        await job_manager.cancel_job(job_id)
        
        return {
            "success": True,
            "message": "Job cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/telegram/jobs/{job_id}/logs")
async def get_job_logs(job_id: str):
    """Get job logs"""
    try:
        job = job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "logs": job.logs
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class StartBroadcastJobRequest(BaseModel):
    account_phones: List[str]
    target_groups: List[str]  # Group links or  IDs
    message_text: str
    media_path: Optional[str] = None
    delay_min: int = 2
    delay_max: int = 5


@app.post("/telegram/jobs/start-broadcast")
async def start_broadcast_job(request: StartBroadcastJobRequest):
    """Create and start a background broadcast job"""
    try:
        job = job_manager.create_job(
            job_type=JobType.BROADCAST,
            params={
                "account_phones": request.account_phones,
                "target_groups": request.target_groups,
                "message_text": request.message_text,
                "media_path": request.media_path,
                "delay_min": request.delay_min,
                "delay_max": request.delay_max
            }
        )
        
        await job_manager.start_job(job.id, telegram_clients)
        
        return {
            "success": True,
            "job_id": job.id,
            "message": "Broadcast job started successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True
    )
