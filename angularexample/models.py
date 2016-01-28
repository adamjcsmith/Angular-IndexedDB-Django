from django.db import models
from django.utils.encoding import python_2_unicode_compatible

# Create your models here.
class Element (models.Model):
    name = models.CharField(max_length=200)
    id = models.AutoField(primary_key=True)
    clicked = models.BooleanField(default=False)
    serverTimestamp = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name

'''
class LastModified (models.Model):
    tableID = models
'''
