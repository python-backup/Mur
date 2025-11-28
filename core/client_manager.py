# core/client_manager.py
class ClientManager:
    def __init__(self):
        self.client = None
    
    def set_client(self, client):
        self.client = client
    
    def get_client(self):
        return self.client

client_manager = ClientManager()