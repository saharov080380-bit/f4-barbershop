from django.contrib.auth.models import AbstractUser
from django.db import models


# Расширяем стандартную модель пользователя Django,
# добавляем поле role чтобы различать клиентов и администраторов
class User(AbstractUser):
    ROLE_USER  = "user"
    ROLE_ADMIN = "admin"

    ROLE_CHOICES = [
        (ROLE_USER,  "Пользователь"),
        (ROLE_ADMIN, "Администратор"),
    ]

    # по умолчанию все новые пользователи — обычные клиенты
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_USER)

    def is_admin(self):
        return self.role == self.ROLE_ADMIN


# Рабочее место (стол) барбера — у каждого свой номер и имя мастера
class Station(models.Model):
    number = models.IntegerField(unique=True)   # номер стола, уникальный
    name   = models.CharField(max_length=100)   # имя мастера за этим столом

    def __str__(self):
        return f"Стол #{self.number} — {self.name}"


# Запись клиента на услугу: кто, к кому, когда и на что записался
class Booking(models.Model):
    user    = models.ForeignKey(User,    on_delete=models.CASCADE, related_name="bookings")
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="bookings")
    date    = models.DateField()
    time    = models.TimeField()
    service = models.CharField(max_length=100)

    # автоматически сохраняем время создания записи
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # один мастер не может принять двух клиентов в одно время
        unique_together = ("station", "date", "time")

    def __str__(self):
        return f"{self.user.username} — {self.station} — {self.date} {self.time}"
