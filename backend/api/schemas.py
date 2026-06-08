from datetime import date, time
from ninja import Schema


#  авторизация 
class RegisterIn(Schema):
    username: str
    password: str
    email: str = ""


# данные для входа
class LoginIn(Schema):
    username: str
    password: str


# возвращаем токен и роль пользователя
class TokenOut(Schema):
    token: str
    role: str


#  столы 

# что отдаём клиенту при запросе списка столов
class StationOut(Schema):
    id:     int
    number: int
    name:   str


# что принимаем при создании нового стола
class StationIn(Schema):
    number: int
    name:   str


#  записи 

# полные данные о бронировании 
    id:             int
    station_id:     int
    station_number: int
    date:           date
    time:           time
    service:        str
    username:       str   # имя клиента


# что принимаем при создании новой записи
class BookingIn(Schema):
    station_id: int
    date:       date
    time:       time
    service:    str
    username:   str = ""   

#  пользователи 

# короткие данные клиента 
class UserOut(Schema):
    id:       int
    username: str


#  Общий ответ 
class MessageOut(Schema):
    message: str
