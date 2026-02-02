"""
Telegram Manager - Telethon client wrapper
Handling: login, session management, group operations, error handling
"""
from telethon import TelegramClient, errors
from telethon.tl.functions.messages import GetDialogsRequest
from telethon.tl.types import InputPeerEmpty
import os
import asyncio
import random
from datetime import datetime
from typing import List, Dict, Optional


class TelegramManager:
    """Telegram işlemlerini yöneten class"""
    
    def __init__(self, phone: str, api_id: int, api_hash: str):
        self.phone = phone
        self.api_id = api_id
        self.api_hash = api_hash
        self.sessions_dir = os.getenv("SESSIONS_DIR", "./sessions")
        
        # Session dosyası
        os.makedirs(self.sessions_dir, exist_ok=True)
        session_file = os.path.join(self.sessions_dir, f"{phone}.session")
        
        # Telethon client oluştur
        self.client = TelegramClient(session_file, api_id, api_hash)
        self.phone_code_hash = None
    
    async def send_code(self) -> Dict:
        """Login başlat - kod gönder"""
        try:
            await self.client.connect()
            
            if not await self.client.is_user_authorized():
                result = await self.client.send_code_request(self.phone)
                self.phone_code_hash = result.phone_code_hash
                
                return {
                    "success": True,
                    "message": "Kod gönderildi",
                    "phone_code_hash": self.phone_code_hash
                }
            else:
                return {
                    "success": True,
                    "message": "Zaten giriş yapılmış",
                    "already_authorized": True
                }
        except Exception as e:
            raise Exception(f"Kod gönderilirken hata: {str(e)}")
    
    async def verify_code(self, code: str, password: str = None) -> Dict:
        """Doğrulama kodunu kontrol et ve giriş yap"""
        try:
            await self.client.sign_in(self.phone, code)
            
            # Kullanıcı bilgilerini al
            me = await self.client.get_me()
            
            return {
                "id": me.id,
                "username": me.username,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "phone": me.phone,
                "success": True
            }
        except errors.SessionPasswordNeededError:
            # 2FA aktif - şifre ile giriş yap
            if password:
                try:
                    await self.client.sign_in(password=password)
                    me = await self.client.get_me()
                    
                    return {
                        "id": me.id,
                        "username": me.username,
                        "first_name": me.first_name,
                        "last_name": me.last_name,
                        "phone": me.phone,
                        "success": True
                    }
                except Exception as pwd_error:
                    raise Exception(f"2FA şifresi hatalı: {str(pwd_error)}")
            else:
                # Şifre gerekli ancak sağlanmamış
                return {
                    "requires_2fa": True,
                    "message": "2FA password required"
                }
        except Exception as e:
            raise Exception(f"Kod doğrulama hatası: {str(e)}")
    
    async def join_groups(
        self, 
        group_links: List[str], 
        min_delay: int = 30, 
        max_delay: int = 60
    ) -> List[Dict]:
        """Gruplara katıl - delay ile"""
        results = []
        
        for i, link in enumerate(group_links):
            try:
                # Grubu bul ve katıl
                await self.client(JoinChannelRequest(link))
                
                results.append({
                    "link": link,
                    "status": "success",
                    "message": "Gruba katıldı",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Son grup değilse bekle
                if i < len(group_links) - 1:
                    delay = random.randint(min_delay, max_delay)
                    results.append({
                        "link": link,
                        "status": "waiting",
                        "message": f"⏳ {delay} saniye bekleniyor...",
                        "delay": delay,
                        "timestamp": datetime.now().isoformat()
                    })
                    await asyncio.sleep(delay)
                    
            except errors.FloodWaitError as e:
                # Telegram flood koruması
                wait_time = e.seconds
                results.append({
                    "link": link,
                    "status": "flood_wait",
                    "message": f"⚠️ FloodWait: {wait_time} saniye beklenmeli",
                    "wait_seconds": wait_time,
                    "timestamp": datetime.now().isoformat()
                })
                
                # FloodWait süresince bekle
                await asyncio.sleep(wait_time)
                
                # Tekrar dene
                try:
                    await self.client(JoinChannelRequest(link))
                    results.append({
                        "link": link,
                        "status": "success",
                        "message": "✅ FloodWait sonrası gruba katıldı",
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as retry_error:
                    results.append({
                        "link": link,
                        "status": "error",
                        "message": f"❌ Tekrar denemede hata: {str(retry_error)}",
                        "timestamp": datetime.now().isoformat()
                    })
                    
            except errors.UserAlreadyParticipantError:
                results.append({
                    "link": link,
                    "status": "already_joined",
                    "message": "ℹ️ Zaten bu gruptasınız",
                    "timestamp": datetime.now().isoformat()
                })
                
            except errors.InviteHashExpiredError:
                results.append({
                    "link": link,
                    "status": "error",
                    "message": "❌ Davet linki geçersiz veya süresi dolmuş",
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                results.append({
                    "link": link,
                    "status": "error",
                    "message": f"❌ Hata: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                })
        
        return results
    
    async def broadcast_message(
        self, 
        group_links: List[str], 
        message: str,
        min_delay: int = 30,
        max_delay: int = 60
    ) -> List[Dict]:
        """Gruplara mesaj gönder - delay ile"""
        results = []
        
        for i, link in enumerate(group_links):
            try:
                # Grubu al
                entity = await self.client.get_entity(link)
                group_name = getattr(entity, 'title', 'Unknown')
                
                # Mesajı gönder
                await self.client.send_message(entity, message)
                
                results.append({
                    "link": link,
                    "group_name": group_name,
                    "status": "success",
                    "message": f"✅ Mesaj gönderildi: {group_name}",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Son grup değilse bekle
                if i < len(group_links) - 1:
                    delay = random.randint(min_delay, max_delay)
                    results.append({
                        "link": link,
                        "group_name": group_name,
                        "status": "waiting",
                        "message": f"⏳ {delay} saniye bekleniyor...",
                        "delay": delay,
                        "timestamp": datetime.now().isoformat()
                    })
                    await asyncio.sleep(delay)
                
            except errors.FloodWaitError as e:
                wait_time = e.seconds
                results.append({
                    "link": link,
                    "group_name": "Unknown",
                    "status": "flood_wait",
                    "message": f"⚠️ FloodWait: {wait_time} saniye beklenmeli",
                    "wait_seconds": wait_time,
                    "timestamp": datetime.now().isoformat()
                })
                await asyncio.sleep(wait_time)
                
                # Tekrar dene
                try:
                    entity = await self.client.get_entity(link)
                    await self.client.send_message(entity, message)
                    results.append({
                        "link": link,
                        "group_name": getattr(entity, 'title', 'Unknown'),
                        "status": "success",
                        "message": "✅ FloodWait sonrası mesaj gönderildi",
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as retry_error:
                    results.append({
                        "link": link,
                        "group_name": "Unknown",
                        "status": "error",
                        "message": f"❌ Tekrar denemede hata: {str(retry_error)}",
                        "timestamp": datetime.now().isoformat()
                    })
                
            except errors.ChatWriteForbiddenError:
                results.append({
                    "link": link,
                    "group_name": "Unknown",
                    "status": "error",
                    "message": "❌ Bu grupta mesaj gönderme izniniz yok",
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                # Grup adını almayı dene
                try:
                    entity = await self.client.get_entity(link)
                    group_name = getattr(entity, 'title', 'Unknown')
                except:
                    group_name = "Unknown"
                    
                results.append({
                    "link": link,
                    "group_name": group_name,
                    "status": "error",
                    "message": f"❌ Hata: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                })
        
        return results
    
    async def send_broadcast_message(self, group_links: List[str], message: str, min_delay: int = 30, max_delay: int = 60) -> List[Dict]:
        """Alias for broadcast_message - for compatibility with jobs.py"""
        return await self.broadcast_message(group_links, message, min_delay, max_delay)
    
    async def get_account_info(self) -> Dict:
        """Hesap bilgilerini al"""
        try:
            me = await self.client.get_me()
            
            # Katıldığı grupları say
            dialogs = await self.client.get_dialogs()
            groups_count = len([d for d in dialogs if d.is_group or d.is_channel])
            
            return {
                "id": me.id,
                "username": me.username,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "phone": me.phone,
                "groups_count": groups_count,
                "is_authorized": True
            }
        except Exception as e:
            raise Exception(f"Hesap bilgisi alınamadı: {str(e)}")
    
    async def get_joined_groups(self) -> List[Dict]:
        """Hesabın katıldığı tüm grupları getir"""
        try:
            dialogs = await self.client.get_dialogs()
            groups = []
            
            for dialog in dialogs:
                # SADECE GRUPLAR (normal grup + megagroup)
                # is_group=True olan her şey dahil (megagroup da is_group=True)
                # Broadcast channel hariç (is_group=False olan kanallar)
                if dialog.is_group:
                    entity = dialog.entity
                    
                    # Grup linkini oluştur
                    if hasattr(entity, 'username') and entity.username:
                        link = f"https://t.me/{entity.username}"
                    else:
                        # Private grup için ID kullan
                        link = f"Group ID: {entity.id}"
                    
                    groups.append({
                        "id": entity.id,
                        "title": dialog.title,
                        "link": link,
                        "is_channel": dialog.is_channel,
                        "is_group": dialog.is_group,
                        "members_count": getattr(entity, 'participants_count', 0)
                    })
            
            return groups
        except Exception as e:
            raise Exception(f"Gruplar alınamadı: {str(e)}")
    
    async def disconnect(self):
        """Client'ı kapat"""
        await self.client.disconnect()


# Import for join operations
from telethon.tl.functions.channels import JoinChannelRequest
