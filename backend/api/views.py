import secrets
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from ninja import NinjaAPI
from ninja.security import HttpBearer

from .models import Booking, Station, User
from .schemas import (
    BookingIn, BookingOut, LoginIn, MessageOut,
    RegisterIn, StationIn, StationOut, TokenOut,
)

# токены храним в памяти — при перезапуске сервера пользователи разлогинятся,
# для учебного проекта это нормально, в продакшене лучше использовать Redis
TOKEN_STORE: dict[str, int] = {}  # токен -> id пользователя


# класс для проверки токена в заголовке Authorization: Bearer <token>
class AuthBearer(HttpBearer):
    def authenticate(self, request, token: str):
        user_id = TOKEN_STORE.get(token)
        if user_id:
            try:
                return User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass
        return None  # если токен не найден — вернём 401


# создаём экземпляр API — документация будет доступна по /api/docs
api  = NinjaAPI(title="F4 Barbershop API", version="1.0")
auth = AuthBearer()


# ── Авторизация ────────────────────────────────────────────────────────────────

@api.post("/register", response=MessageOut, tags=["auth"])
def register(request, data: RegisterIn):
    # проверяем что логин ещё не занят
    if User.objects.filter(username=data.username).exists():
        return api.create_response(request, {"message": "Пользователь уже существует"}, status=400)
    User.objects.create_user(username=data.username, password=data.password, email=data.email)
    return {"message": "Регистрация успешна"}


@api.post("/login", response=TokenOut, tags=["auth"])
def login(request, data: LoginIn):
    # authenticate проверяет логин и пароль через Django
    user = authenticate(username=data.username, password=data.password)
    if not user:
        return api.create_response(request, {"message": "Неверные данные"}, status=401)

    # генерируем случайный токен и сохраняем в словаре
    token = secrets.token_hex(32)
    TOKEN_STORE[token] = user.id
    return {"token": token, "role": user.role}


@api.post("/logout", auth=auth, response=MessageOut, tags=["auth"])
def logout(request):
    # удаляем токен текущего пользователя из хранилища
    for token, uid in list(TOKEN_STORE.items()):
        if uid == request.auth.id:
            del TOKEN_STORE[token]
            break
    return {"message": "Выход выполнен"}


# ── Столы (рабочие места мастеров) ────────────────────────────────────────────

# список столов доступен без авторизации — чтобы гость мог увидеть мастеров
@api.get("/stations", response=list[StationOut], tags=["stations"])
def list_stations(request):
    return list(Station.objects.all())


# создать новый стол может только администратор
@api.post("/stations", auth=auth, response=StationOut, tags=["stations"])
def create_station(request, data: StationIn):
    if not request.auth.is_admin():
        return api.create_response(request, {"message": "Доступ запрещён"}, status=403)
    station = Station.objects.create(number=data.number, name=data.name)
    return station


# удалить стол тоже может только администратор
@api.delete("/stations/{station_id}", auth=auth, response=MessageOut, tags=["stations"])
def delete_station(request, station_id: int):
    if not request.auth.is_admin():
        return api.create_response(request, {"message": "Доступ запрещён"}, status=403)
    station = get_object_or_404(Station, id=station_id)
    station.delete()
    return {"message": "Стол удалён"}


# ── Записи клиентов ────────────────────────────────────────────────────────────

@api.get("/bookings", auth=auth, response=list[BookingOut], tags=["bookings"])
def list_bookings(request):
    # администратор видит все записи, обычный клиент — только свои
    if request.auth.is_admin():
        bookings = Booking.objects.select_related("user", "station").all()
    else:
        bookings = Booking.objects.select_related("user", "station").filter(user=request.auth)

    return [
        BookingOut(
            id=b.id,
            station_id=b.station.id,
            station_number=b.station.number,
            date=b.date,
            time=b.time,
            service=b.service,
            username=b.user.username,
        )
        for b in bookings
    ]


@api.post("/bookings", auth=auth, response=BookingOut, tags=["bookings"])
def create_booking(request, data: BookingIn):
    station = get_object_or_404(Station, id=data.station_id)

    # проверяем что выбранное время у этого мастера ещё не занято
    if Booking.objects.filter(station=station, date=data.date, time=data.time).exists():
        return api.create_response(request, {"message": "Это время уже занято"}, status=400)

    booking = Booking.objects.create(
        user=request.auth,
        station=station,
        date=data.date,
        time=data.time,
        service=data.service,
    )
    return BookingOut(
        id=booking.id,
        station_id=station.id,
        station_number=station.number,
        date=booking.date,
        time=booking.time,
        service=booking.service,
        username=request.auth.username,
    )


@api.delete("/bookings/{booking_id}", auth=auth, response=MessageOut, tags=["bookings"])
def delete_booking(request, booking_id: int):
    booking = get_object_or_404(Booking, id=booking_id)

    # клиент может отменить только свою запись, админ — любую
    if not request.auth.is_admin() and booking.user != request.auth:
        return api.create_response(request, {"message": "Доступ запрещён"}, status=403)

    booking.delete()
    return {"message": "Бронирование отменено"}
