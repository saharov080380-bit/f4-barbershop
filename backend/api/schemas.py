from datetime import date, time
from ninja import Schema


# ── Авторизация ────────────────────────────────────────────────────────────────

# данные для регистрации нового пользователя
class RegisterIn(Schema):
    username: str
    password: str
    email: str = ""   # email необязательный


# данные для входа
class LoginIn(Schema):
    username: str
    password: str


# ответ при успешном входе — возвращаем токен и роль пользователя
class TokenOut(Schema):
    token: str
    role: str


# ── Рабочие места (столы) ──────────────────────────────────────────────────────

# что отдаём клиенту при запросе списка столов
class StationOut(Schema):
    id:     int
    number: int
    name:   str


# что принимаем при создании нового стола (только от админа)
class StationIn(Schema):
    number: int
    name:   str


# ── Записи ─────────────────────────────────────────────────────────────────────

# полные данные о бронировании — для отображения в интерфейсе
class BookingOut(Schema):
    id:             int
    station_id:     int
    station_number: int
    date:           date
    time:           time
    service:        str
    username:       str   # имя клиента (нужно администратору)


# что принимаем при создании новой записи
class BookingIn(Schema):
    station_id: int
    date:       date
    time:       time
    service:    str


# ── Общий ответ ────────────────────────────────────────────────────────────────

# универсальная схема для сообщений об успехе или ошибке
class MessageOut(Schema):
    message: str
