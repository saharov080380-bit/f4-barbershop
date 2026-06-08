set -e

#  миграции перед запуском
python manage.py makemigrations api
python manage.py migrate

# заполняем базу тестовыми данными если она пустая
python manage.py shell << 'EOF'
from datetime import date, timedelta
from api.models import User, Station, Booking

today = date.today()

# Мастера
if not Station.objects.exists():
    Station.objects.create(number=1, name='Артём Волков')
    Station.objects.create(number=2, name='Дмитрий Соколов')
    Station.objects.create(number=3, name='Игорь Ларин')
    Station.objects.create(number=4, name='Максим Орлов')
    print("Мастера созданы")

s1 = Station.objects.get(number=1)
s2 = Station.objects.get(number=2)
s3 = Station.objects.get(number=3)
s4 = Station.objects.get(number=4)

#  Администратор 
if not User.objects.filter(username='admin').exists():
    u = User.objects.create_superuser('admin', 'admin@f4.ru', 'admin123')
    u.role = 'admin'
    u.save()
    print("Администратор создан")

#  Клиенты 
clients = [
    ('nikita',   'nikita123',   'nikita@mail.ru'),
    ('roman',    'roman123',    'roman@mail.ru'),
    ('alexey',   'alexey123',   'alexey@mail.ru'),
    ('mikhail',  'mikhail123',  'mikhail@mail.ru'),
    ('sergey',   'sergey123',   'sergey@mail.ru'),
    ('andrey',   'andrey123',   'andrey@mail.ru'),
]

for uname, pwd, email in clients:
    if not User.objects.filter(username=uname).exists():
        User.objects.create_user(username=uname, password=pwd, email=email)

nikita  = User.objects.get(username='nikita')
roman   = User.objects.get(username='roman')
alexey  = User.objects.get(username='alexey')
mikhail = User.objects.get(username='mikhail')
sergey  = User.objects.get(username='sergey')
andrey  = User.objects.get(username='andrey')

#  Записи 
# формат: (клиент, стол, дата, время, услуга)
bookings_data = [
    # две недели назад
    (nikita,  s1, today - timedelta(days=14), '10:00', 'Стрижка'),
    (roman,   s3, today - timedelta(days=14), '12:00', 'Оформление бороды'),
    (sergey,  s2, today - timedelta(days=13), '11:00', 'Стрижка + борода'),
    (andrey,  s4, today - timedelta(days=13), '15:00', 'Укладка'),
    (alexey,  s1, today - timedelta(days=12), '09:00', 'Тонирование'),
    (mikhail, s2, today - timedelta(days=12), '14:00', 'Бритьё'),

    # прошлая неделя
    (nikita,  s2, today - timedelta(days=10), '11:00', 'Стрижка + борода'),
    (roman,   s1, today - timedelta(days=9),  '09:00', 'Стрижка'),
    (sergey,  s4, today - timedelta(days=8),  '13:00', 'Оформление бороды'),
    (andrey,  s3, today - timedelta(days=7),  '16:00', 'Укладка'),
    (alexey,  s2, today - timedelta(days=6),  '10:00', 'Бритьё'),
    (mikhail, s1, today - timedelta(days=5),  '12:00', 'Тонирование'),

    # последние дни
    (nikita,  s3, today - timedelta(days=4), '14:00', 'Стрижка'),
    (roman,   s4, today - timedelta(days=3), '11:00', 'Стрижка + борода'),
    (sergey,  s1, today - timedelta(days=2), '09:00', 'Оформление бороды'),
    (andrey,  s2, today - timedelta(days=1), '15:00', 'Стрижка'),
    (alexey,  s4, today - timedelta(days=1), '10:00', 'Бритьё'),

    # сегодня
    (nikita,  s1, today, '10:00', 'Стрижка'),
    (roman,   s2, today, '11:00', 'Оформление бороды'),
    (alexey,  s3, today, '14:00', 'Стрижка + борода'),
    (sergey,  s4, today, '16:00', 'Укладка'),

    # завтра и ближайшие дни
    (mikhail, s4, today + timedelta(days=1), '10:00', 'Бритьё'),
    (nikita,  s2, today + timedelta(days=1), '12:00', 'Стрижка'),
    (andrey,  s1, today + timedelta(days=1), '15:00', 'Тонирование'),
    (roman,   s1, today + timedelta(days=2), '09:00', 'Укладка'),
    (alexey,  s3, today + timedelta(days=2), '13:00', 'Оформление бороды'),
    (sergey,  s2, today + timedelta(days=3), '11:00', 'Стрижка + борода'),
    (mikhail, s1, today + timedelta(days=3), '14:00', 'Стрижка'),
    (nikita,  s4, today + timedelta(days=4), '10:00', 'Оформление бороды'),
    (andrey,  s3, today + timedelta(days=4), '16:00', 'Бритьё'),
    (roman,   s2, today + timedelta(days=5), '12:00', 'Стрижка'),
    (alexey,  s4, today + timedelta(days=6), '09:00', 'Тонирование'),
    (sergey,  s1, today + timedelta(days=7), '11:00', 'Стрижка + борода'),
]

for user, station, bdate, btime, service in bookings_data:
    Booking.objects.get_or_create(
        station=station, date=bdate, time=btime,
        defaults={'user': user, 'service': service}
    )

print(f"Записей в базе: {Booking.objects.count()}")
print("База данных заполнена!")
EOF

python manage.py runserver 0.0.0.0:8000 --insecure
