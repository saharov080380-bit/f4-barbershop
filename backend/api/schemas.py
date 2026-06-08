from datetime import date, time
from ninja import Schema


# --- Auth ---

class RegisterIn(Schema):
    username: str
    password: str
    email: str = ""


class LoginIn(Schema):
    username: str
    password: str


class TokenOut(Schema):
    token: str
    role: str


# --- Station ---

class StationOut(Schema):
    id: int
    number: int
    name: str


class StationIn(Schema):
    number: int
    name: str


# --- Booking ---

class BookingOut(Schema):
    id: int
    station_id: int
    station_number: int
    date: date
    time: time
    service: str
    username: str


class BookingIn(Schema):
    station_id: int
    date: date
    time: time
    service: str


# --- Error ---

class MessageOut(Schema):
    message: str
