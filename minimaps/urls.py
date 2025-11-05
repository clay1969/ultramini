from django.urls import path
from . import views

app_name = "minimaps"

urlpatterns = [
    path("", views.index, name="index"),
]
