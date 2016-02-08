from django import forms

class CreateElementForm(forms.Form):
    name = forms.CharField(label='Element name', max_length=200)
    id = forms.UUIDField() #hmmmmm
