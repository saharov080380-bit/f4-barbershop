from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Station, Booking


class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "role", "is_staff")
    list_filter  = ("role", "is_staff", "is_superuser")
    # добавляем role в форму редактирования (к стандартным полям UserAdmin)
    fieldsets = UserAdmin.fieldsets + (
        ("Роль в барбершопе", {"fields": ("role",)}),
    )


# рабочие места мастеров
class StationAdmin(admin.ModelAdmin):
    list_display = ("number", "name")
    ordering = ("number",)


# записи клиентов
class BookingAdmin(admin.ModelAdmin):
    list_display = ("user", "station", "date", "time", "service")
    list_filter  = ("date", "station", "service")
    search_fields = ("user__username", "service")
    ordering = ("-date", "-time")


admin.site.register(User, CustomUserAdmin)
admin.site.register(Station, StationAdmin)
admin.site.register(Booking, BookingAdmin)
