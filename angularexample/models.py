from django.db import models
import uuid
from django.utils.encoding import python_2_unicode_compatible

# Create your models here.
class Element (models.Model):
    text = models.CharField(max_length=200)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    #id = models.AutoField(primary_key=True)
    clicked = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

'''
class LastModified (models.Model):
    tableID = models
'''
