# Telegram Service

Python mikroservisi - Telegram işlemleri için.

## Kurulum

```bash
cd telegram-service
python -m pip install -r requirements.txt
```

## Çalıştırma

```bash
python main.py
```

Service http://localhost:8000 adresinde çalışacak.

## Endpoints

- `POST /telegram/login` - Telegram login başlat
- `POST /telegram/verify` - Kodu doğrula
- `POST /telegram/join-groups` - Gruplara katıl
- `POST /telegram/broadcast` - Mesaj gönder
- `POST /telegram/account-info` - Hesap bilgisi al
- `POST /telegram/disconnect` - Çıkış yap

## Test

```bash
curl http://localhost:8000/
```
