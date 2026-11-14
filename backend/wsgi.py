"""WSGI application entry point."""

from api import create_app
from config import get_config

config = get_config()
app = create_app(config)

if __name__ == "__main__":
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
    )
