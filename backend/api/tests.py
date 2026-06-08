import json
from django.test import TestCase, Client
from .models import User, Station, Booking
from datetime import date


class StationTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.station = Station.objects.create(number=1, name="Тест Мастер")

    def test_stations_list(self):
        res = self.client.get("/api/stations")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "Тест Мастер")


class AuthTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_register(self):
        res = self.client.post(
            "/api/register",
            data=json.dumps({"username": "testuser", "password": "pass123"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

    def test_login_success(self):
        User.objects.create_user(username="u1", password="pass123")
        res = self.client.post(
            "/api/login",
            data=json.dumps({"username": "u1", "password": "pass123"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.content)
        self.assertIn("token", data)

    def test_login_wrong_password(self):
        User.objects.create_user(username="u2", password="correct")
        res = self.client.post(
            "/api/login",
            data=json.dumps({"username": "u2", "password": "wrong"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 401)

    def test_bookings_require_auth(self):
        res = self.client.get("/api/bookings")
        self.assertEqual(res.status_code, 401)
