#!/bin/sh
set -e

python manage.py makemigrations api
python manage.py migrate

python manage.py shell << 'EOF'
from datetime import date, timedelta
from api.models import User, Station, Booking

today = date.today()

# ── Станции (мастера) ──────────────────────────────────────────
if not Station.objects.exists():
    Station.objects.create(number=1, name='Артём Волков')
    Station.objects.create(number=2, name='Дмитрий Соколов')
    Station.objects.create(number=3, name='Игорь Ларин')
    Station.objects.create(number=4, name='Максим Орлов')
    print("Stations created")

s1 = Station.objects.get(number=1)
s2 = Station.objects.get(number=2)
s3 = Station.objects.get(number=3)
s4 = Station.objects.get(number=4)

# ── Админ ──────────────────────────────────────────────────────
if not User.objects.filter(username='admin').exists():
    u = User.objects.create_superuser('admin', 'admin@f4.ru', 'admin123')
    u.role = 'admin'
    u.save()
    print("Admin created")

# ── Тестовые клиенты ───────────────────────────────────────────
clients = [
    ('nikita',  'nikita123',  'nikita@mail.ru'),
    ('roman',   'roman123',   'roman@mail.ru'),
    ('alexey',  'alexey123',  'alexey@mail.ru'),
    ('mikhail', 'mikhail123', 'mikhail@mail.ru'),
]

for uname, pwd, email in clients:
    if not User.objects.filter(username=uname).exists():
        User.objects.create_user(username=uname, password=pwd, email=email)

nikita  = User.objects.get(username='nikita')
roman   = User.objects.get(username='roman')
alexey  = User.objects.get(username='alexey')
mikhail = User.objects.get(username='mikhail')

# ── Бронирования ───────────────────────────────────────────────
bookings_data = [
    # прошедшие
    (nikita,  s1, today - timedelta(days=10), '10:00', 'Стрижка'),
    (roman,   s2, today - timedelta(days=8),  '12:00', 'Борода'),
    (alexey,  s3, today - timedelta(days=6),  '14:00', 'Стрижка + борода'),
    (mikhail, s4, today - timedelta(days=5),  '11:00', 'Бритьё'),
    (nikita,  s2, today - timedelta(days=4),  '15:00', 'Камуфляж'),
    (roman,   s1, today - timedelta(days=3),  '09:00', 'Укладка'),
    (alexey,  s4, today - timedelta(days=2),  '13:00', 'Стрижка'),
    (mikhail, s3, today - timedelta(days=1),  '16:00', 'Борода'),
    # сегодня
    (nikita,  s1, today, '10:00', 'Стрижка'),
    (roman,   s2, today, '11:00', 'Борода'),
    (alexey,  s3, today, '14:00', 'Стрижка + борода'),
    # предстоящие
    (mikhail, s4, today + timedelta(days=1), '10:00', 'Бритьё'),
    (nikita,  s2, today + timedelta(days=1), '12:00', 'Стрижка'),
    (roman,   s1, today + timedelta(days=2), '09:00', 'Укладка'),
    (alexey,  s3, today + timedelta(days=2), '15:00', 'Камуфляж'),
    (mikhail, s1, today + timedelta(days=3), '11:00', 'Стрижка + борода'),
    (nikita,  s4, today + timedelta(days=4), '13:00', 'Борода'),
    (roman,   s2, today + timedelta(days=5), '16:00', 'Стрижка'),
]

for user, station, bdate, btime, service in bookings_data:
    Booking.objects.get_or_create(
        station=station, date=bdate, time=btime,
        defaults={'user': user, 'service': service}
    )

print(f"Bookings: {Booking.objects.count()} total")
print("Seed done!")
EOF

python manage.py runserver 0.0.0.0:8000
