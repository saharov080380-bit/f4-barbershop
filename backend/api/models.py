from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_USER = "user"
    ROLE_ADMIN = "admin"
    ROLE_CHOICES = [
        (ROLE_USER, "Пользователь"),
        (ROLE_ADMIN, "Администратор"),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_USER)

    def is_admin(self):
        return self.role == self.ROLE_ADMIN


class Station(models.Model):
    number = models.IntegerField(unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"Стол #{self.number} — {self.name}"


class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="bookings")
    date = models.DateField()
    time = models.TimeField()
    service = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("station", "date", "time")

    def __str__(self):
        return f"{self.user.username} — {self.station} — {self.date} {self.time}"
