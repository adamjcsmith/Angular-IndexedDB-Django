'''from django.http import HttpResponse
from django.template import loader

def index(request):
    template = loader.get_template('templates/index_template.html')
'''

from django.shortcuts import render
from django.core import serializers
from django.views.generic import TemplateView
from django.http import HttpResponse

from .models import Element


class IndexView(TemplateView):
    def get(self, request):
        return render(request, 'index_template.html')


class ElementView(TemplateView):
    def get(self, request):
        json = serializers.serialize("json", Element.objects.all())
        return HttpResponse(json, content_type='application/json')




'''
class MemorialView(ViewOnlyView):                                           # ? What's ViewOnlyView?
    def get(self, request):
        layer = request.GET.get('layer')                                    # This gets the layer from the sent request object
        if layer.startswith('memorials_'):                                  # ? - If the layer starts with 'memorials_'
            layer = layer[len('memorials_'):]                               # ? This is a substring!
        geoj = None
        if layer == 'cluster':                                              # If the layer is cluster, then get graveplot objects...
            points = GravePlot.objects.get_headpoint_values()
            if len(points) == 0:                                            # ? If there are no points, then cluster based on the memorial headstone.
                points = Memorial.objects.get_headpoint_values()
            geoj = GeoJSONSerializer().serialize(points, geometry_field='head_point', srid=27700, crs=False)        # Serialise the points to GeoJSON
        else:
            memorials = Memorial.objects.get_values(marker_type=layer)      # If the layer is not a cluster, then get memorial objects.
            if request.GET.get('layer').startswith('memorials_'):
                for memorial in memorials:
                    memorial['marker_type'] = request.GET.get('layer')      # ? What's marker type?
            geoj = GeoJSONSerializer().serialize(memorials, geometry_field='geometry', srid=27700, crs=False) # ? What are the parameters?
        return HttpResponse(geoj, content_type='application/json')

'''
