import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS

from db import database
from routes import auth, workspaces, projects, tasks, dashboard, notifications

app = Flask(__name__)
database.init_app(app)

CORS(app, origins=[os.environ.get('CLIENT_ORIGIN', 'http://localhost:5173')])

# Apply schema on boot (idempotent - every statement uses IF NOT EXISTS)
database.apply_schema()

app.register_blueprint(auth.bp)
app.register_blueprint(workspaces.bp)
app.register_blueprint(projects.bp)
app.register_blueprint(tasks.bp)
app.register_blueprint(dashboard.bp)
app.register_blueprint(notifications.bp)


@app.get('/api/health')
def health():
    return jsonify({'status': 'ok'})


@app.errorhandler(404)
def not_found(e):
    return jsonify({'errors': [{'field': None, 'message': 'Not found.'}]}), 404


@app.errorhandler(500)
def server_error(e):
    app.logger.exception('Unhandled server error')
    return jsonify({'errors': [{'field': None, 'message': 'Something went wrong on the server.'}]}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 4000))
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
