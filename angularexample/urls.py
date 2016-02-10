from django.conf.urls import url
from angularexample.views import IndexView, ElementView, CreateElementView


urlpatterns = [
    url(r'^$', IndexView.as_view()),
    url(r'^getElements/', ElementView.as_view()),
    url(r'^createElements/', CreateElementView.as_view())
]
