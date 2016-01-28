'''from django.http import HttpResponse
from django.template import loader

def index(request):
    template = loader.get_template('templates/index_template.html')
'''
from datetime import datetime

from django.shortcuts import render
from django.core import serializers
from django.views.generic import TemplateView
from django.http import HttpResponse, JsonResponse
import json

from .models import Element


class IndexView(TemplateView):
    def get(self, request):
        return render(request, 'index_template.html')


class ElementView(TemplateView):
    def get(self, request):
        after = request.GET.get('after', default='')
        if(after == ''):
            print("Executing the standard if block...")
            result = Element.objects.raw('SELECT * FROM angularexample_element ORDER BY serverTimestamp DESC')
            json = serializers.serialize("json", result)
            return HttpResponse(json, content_type='application/json')
        else:
            print("Executing the else block...")
            dateObj = datetime.strptime(after, "%Y-%m-%dT%H:%M:%S-%H:%M")
            result = Element.objects.raw('SELECT * FROM angularexample_element WHERE serverTimestamp > %s', dateObj)
            json = serializers.serialize("json", result)
            return HttpResponse(json, content_type='application/json')



'''
class ElementsLastUpdatedView(TemplateView):
    def get(self, request):
        result = Element.objects.raw('SELECT id, updateTimestamp FROM angularexample_element ORDER BY updateTimestamp DESC')
        json = serializers.serialize("json", result)


class EditElementView(TemplateView):
    def post(self, request):
        # Check for a parameter:
        '''





'''
class MemorialEditView(AjaxableResponseMixin, AdminView):
    template_name = 'mapmanagement/edit/memorial-edit.html'
    success_template_name = 'mapmanagement/edit/memorial-edit.html'
    # success url is not used (due to ajax mixin), but can't be removed because
    # django throws error if it is not there
    success_url = '/mapmanagement'
    formset_class = formset_factory(MemorialForm)

    def post(self, request):
        # This method is called when valid form data has been POSTed.
        # It should return an HttpResponse.
        memorial_formset = self.formset_class(request.POST, prefix='memorial')
        # import pdb; pdb.set_trace()
        if memorial_formset.is_valid(): #TODO: when new memorial there is no memorial_id, but this will be move to another diferent post by clicking the plot
            try:
                memorials_data = memorial_formset.cleaned_data
                for key in request.FILES:
                    memorialpos = key.split('-')[1]
                    memorialfilekey = key
                memorial_data = memorials_data[int(memorialpos)]
                # import pdb; pdb.set_trace()
                memorial = Memorial.objects.get(id=memorial_data['memorial_id'])
                memorial.create_image(request.FILES[memorialfilekey])
                return JsonResponse({})
            except Exception as e:
                return HttpResponseBadRequest(str(e))
        return HttpResponseBadRequest(memorial_formset.errors)
'''


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
