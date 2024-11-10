# chat/views.py
from django.shortcuts import render

# Existing room view here
def room(request, room_name):
    return render(request, 'chat/room.html', {
        'room_name': room_name
    })

# New view for homepage
def index(request):
    return render(request, 'chat/index.html')
