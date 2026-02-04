"""
Background Job System for Telegram Manager
Allows join operations to run in background even when browser is closed
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
import uuid

from telegram_manager import TelegramManager


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobType(str, Enum):
    JOIN = "join"
    BROADCAST = "broadcast"


class Job:
    def __init__(
        self,
        job_id: str,
        job_type: JobType,
        params: Dict[str, Any],
        status: JobStatus = JobStatus.QUEUED
    ):
        self.id = job_id
        self.type = job_type
        self.status = status
        self.params = params
        self.progress = {
            "total": 0,
            "completed": 0,
            "failed": 0,
            "current": "",
            "per_account": {}  # {phone: {completed, failed, status, current_group, next_action_eta}}
        }
        self.logs: List[Dict] = []
        self.created_at = datetime.now().isoformat()
        self.started_at: Optional[str] = None
        self.completed_at: Optional[str] = None
        self.error: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type,
            "status": self.status,
            "params": self.params,
            "progress": self.progress,
            "logs": self.logs,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "error": self.error
        }

    def add_log(self, message: str, level: str = "info", account: str = None):
        self.logs.append({
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "level": level,
            "account": account
        })


class JobManager:
    def __init__(self, storage_path: str = "data/jobs.json"):
        self.storage_path = storage_path
        self.jobs: Dict[str, Job] = {}
        self.running_tasks: Dict[str, asyncio.Task] = {}
        self._load_jobs()
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)

    def _load_jobs(self):
        """Load jobs from disk"""
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for job_data in data:
                        job = Job(
                            job_id=job_data['id'],
                            job_type=job_data['type'],
                            params=job_data['params'],
                            status=job_data['status']
                        )
                        job.progress = job_data.get('progress', job.progress)
                        job.logs = job_data.get('logs', [])
                        job.created_at = job_data['created_at']
                        job.started_at = job_data.get('started_at')
                        job.completed_at = job_data.get('completed_at')
                        job.error = job_data.get('error')
                        self.jobs[job.id] = job
        except Exception as e:
            print(f"Failed to load jobs: {e}")

    def _save_jobs(self):
        """Save jobs to disk"""
        try:
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump([job.to_dict() for job in self.jobs.values()], f, indent=2)
        except Exception as e:
            print(f"Failed to save jobs: {e}")

    def create_job(self, job_type: JobType, params: Dict[str, Any]) -> Job:
        """Create a new job"""
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        job = Job(job_id, job_type, params)
        self.jobs[job_id] = job
        self._save_jobs()
        return job

    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        return self.jobs.get(job_id)

    def list_jobs(self, status: Optional[JobStatus] = None) -> List[Job]:
        """List all jobs, optionally filtered by status"""
        if status:
            return [j for j in self.jobs.values() if j.status == status]
        return list(self.jobs.values())

    def update_job(self, job_id: str, **kwargs):
        """Update job fields"""
        if job_id in self.jobs:
            job = self.jobs[job_id]
            for key, value in kwargs.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            self._save_jobs()

    async def start_job(self, job_id: str, telegram_clients: Dict):
        """Start executing a job in background"""
        job = self.get_job(job_id)
        if not job:
            return

        job.status = JobStatus.RUNNING
        job.started_at = datetime.now().isoformat()
        self._save_jobs()

        # Create async task
        if job.type == JobType.JOIN:
            task = asyncio.create_task(self._execute_join_job(job, telegram_clients))
        else:
            task = asyncio.create_task(self._execute_broadcast_job(job, telegram_clients))

        self.running_tasks[job_id] = task

    async def _execute_join_job(self, job: Job, telegram_clients: Dict):
        """Execute a join job"""
        try:
            params = job.params
            account_phones = params.get('account_phones', [])
            group_links = params.get('group_links', [])
            min_delay = params.get('min_delay', 30)
            max_delay = params.get('max_delay', 60)

            total_operations = len(account_phones) * len(group_links)
            job.progress['total'] = total_operations
            completed = 0
            failed = 0

            for phone in account_phones:
                if job.status == JobStatus.CANCELLED:
                    job.add_log(f"Job cancelled by user", "warning")
                    break

                if phone not in telegram_clients:
                    job.add_log(f"Skipping {phone} - not connected", "warning", account=phone)
                    continue

                manager: TelegramManager = telegram_clients[phone]
                
                # Initialize per-account tracking
                if phone not in job.progress['per_account']:
                    job.progress['per_account'][phone] = {
                        "completed": 0,
                        "failed": 0,
                        "status": "starting",
                        "current_group": "",
                        "total_groups": len(group_links)
                    }
                
                job.progress['current'] = f"Processing {phone}..."
                job.progress['per_account'][phone]['status'] = 'joining'
                self._save_jobs()

                for link in group_links:
                    if job.status == JobStatus.CANCELLED:
                        break

                    try:
                        job.progress['per_account'][phone]['current_group'] = link
                        job.add_log(f"Joining {link}...", "info", account=phone)
                        result = await manager.join_group(link)
                        
                        if result.get('success'):
                            job.add_log(f"✅ Joined {link}", "success", account=phone)
                            completed += 1
                            job.progress['per_account'][phone]['completed'] += 1
                        else:
                            job.add_log(f"❌ Failed: {result.get('message')}", "error", account=phone)
                            failed += 1
                            job.progress['per_account'][phone]['failed'] += 1
                            
                        job.progress['completed'] = completed
                        job.progress['failed'] = failed
                        self._save_jobs()

                        # Random delay
                        import random
                        delay = random.uniform(min_delay, max_delay)
                        await asyncio.sleep(delay)

                    except Exception as e:
                        job.add_log(f"❌ Error on {link}: {str(e)}", "error", account=phone)
                        failed += 1
                        job.progress['failed'] = failed
                        job.progress['per_account'][phone]['failed'] += 1
                        self._save_jobs()

            # Job completed
            if job.status != JobStatus.CANCELLED:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now().isoformat()
                job.add_log(f"Job completed: {completed} succeeded, {failed} failed", "info")
            
            self._save_jobs()

        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)
            job.completed_at = datetime.now().isoformat()
            job.add_log(f"Job failed: {str(e)}", "error")
            self._save_jobs()

        finally:
            if job.id in self.running_tasks:
                del self.running_tasks[job.id]

    async def _execute_broadcast_job(self, job: Job, telegram_clients: Dict):
        """Execute a broadcast job"""
        try:
            params = job.params
            account_phones = params.get('account_phones', [])
            account_groups = params.get('account_groups', {})  # Per-account mapping
            target_groups = params.get('target_groups', [])  # Fallback
            message_text = params.get('message_text', '')
            media_path = params.get('media_path')
            delay_min = params.get('delay_min', 2)
            delay_max = params.get('delay_max', 5)

            # Calculate total operations
            if account_groups:
                total_operations = sum(len(groups) for groups in account_groups.values())
            else:
                total_operations = len(account_phones) * len(target_groups)
                
            job.progress['total'] = total_operations
            completed = 0
            failed = 0

            for phone in account_phones:
                if job.status == JobStatus.CANCELLED:
                    job.add_log(f"Job cancelled by user", "warning")
                    break

                if phone not in telegram_clients:
                    job.add_log(f"Skipping {phone} - not connected", "warning", account=phone)
                    continue

                manager: TelegramManager = telegram_clients[phone]
                
                # Get groups for THIS account
                if account_groups and phone in account_groups:
                    phone_groups = account_groups[phone]
                else:
                    phone_groups = target_groups  # Fallback to shared list
                
                # Initialize per-account tracking
                if phone not in job.progress['per_account']:
                    job.progress['per_account'][phone] = {
                        "completed": 0,
                        "failed": 0,
                        "status": "starting",
                        "current_group": "",
                        "total_groups": len(phone_groups),
                        "next_action_eta": None
                    }
                
                job.progress['current'] = f"Broadcasting from {phone}..."
                job.progress['per_account'][phone]['status'] = 'broadcasting'
                self._save_jobs()

                for group_link in phone_groups:
                    if job.status == JobStatus.CANCELLED:
                        break

                    try:
                        job.progress['per_account'][phone]['current_group'] = group_link
                        job.add_log(f"Sending to {group_link}...", "info", account=phone)
                        
                        # Send message to single group (wrapped in list)
                        results = await manager.send_broadcast_message(
                            group_links=[group_link],  # Method expects list
                            message=message_text,
                            min_delay=delay_min,
                            max_delay=delay_max
                        )
                        
                        # Check first result
                        if results and len(results) > 0:
                            result = results[0]
                        else:
                            result = {'status': 'error', 'message': 'No response'}
                        
                        if result.get('status') == 'success':
                            job.add_log(f"✅ Message sent to {group_link}", "success", account=phone)
                            completed += 1
                            job.progress['per_account'][phone]['completed'] += 1
                        else:
                            job.add_log(f"❌ Failed: {result.get('message')}", "error", account=phone)
                            failed += 1
                            job.progress['per_account'][phone]['failed'] += 1
                            
                        job.progress['completed'] = completed
                        job.progress['failed'] = failed
                        self._save_jobs()

                        # Anti-flood delay
                        import random
                        delay = random.uniform(delay_min, delay_max)
                        await asyncio.sleep(delay)

                    except Exception as e:
                        job.add_log(f"❌ {phone} error on {group_link}: {str(e)}", "error")
                        failed += 1
                        job.progress['failed'] = failed
                        self._save_jobs()

            # Job completed
            if job.status != JobStatus.CANCELLED:
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now().isoformat()
                job.add_log(f"Broadcast completed: {completed} succeeded, {failed} failed", "info")
            
            self._save_jobs()

        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)
            job.completed_at = datetime.now().isoformat()
            job.add_log(f"Broadcast job failed: {str(e)}", "error")
            self._save_jobs()

        finally:
            if job.id in self.running_tasks:
                del self.running_tasks[job.id]


    async def cancel_job(self, job_id: str):
        """Cancel a running job"""
        job = self.get_job(job_id)
        if job and job.status == JobStatus.RUNNING:
            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.now().isoformat()
            self._save_jobs()
            
            # Task will check status and stop
            if job_id in self.running_tasks:
                self.running_tasks[job_id].cancel()

    def clear_completed_logs(self):
        """Clear logs from all completed and cancelled jobs"""
        cleared_count = 0
        for job in self.jobs.values():
            if job.status in [JobStatus.COMPLETED, JobStatus.CANCELLED, JobStatus.FAILED]:
                if job.logs:
                    cleared_count += len(job.logs)
                    job.logs = []
        
        if cleared_count > 0:
            self._save_jobs()
        
        return cleared_count


# Global job manager instance
job_manager = JobManager()
