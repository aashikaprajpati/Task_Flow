import json
import unittest
from app import app
from db.database import apply_schema

class TaskFlowBackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        apply_schema()
        cls.client = app.test_client()

    def test_01_login(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'alice@taskflow.dev',
            'password': 'password123',
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('token', data)
        self.assertEqual(data['user']['name'], 'Alice Sharma')

    def test_02_google_auth(self):
        res = self.client.post('/api/auth/google', json={
            'email': 'google_user@gmail.com',
            'name': 'Google Demo User',
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('token', data)
        self.assertEqual(data['user']['email'], 'google_user@gmail.com')

    def test_03_workspaces_and_departments(self):
        # Login as alice
        res = self.client.post('/api/auth/login', json={
            'email': 'alice@taskflow.dev',
            'password': 'password123',
        })
        token = res.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # List workspaces
        res = self.client.get('/api/workspaces', headers=headers)
        self.assertEqual(res.status_code, 200)
        workspaces = res.get_json()['workspaces']
        self.assertTrue(len(workspaces) > 0)
        upaya = workspaces[0]
        self.assertEqual(upaya['name'], 'Upaya Team')
        self.assertEqual(len(upaya['departments']), 3)

        # Create custom workspace with custom department list
        res = self.client.post('/api/workspaces', headers=headers, json={
            'name': 'Innovate Inc',
            'companyType': 'tech',
            'departments': ['Frontend Architecture', 'Cloud Infrastructure', 'Brand & UI Design']
        })
        self.assertEqual(res.status_code, 201)
        ws = res.get_json()['workspace']
        dept_names = [d['title'] for d in ws['departments']]
        self.assertIn('Frontend Architecture', dept_names)
        self.assertIn('Brand & UI Design', dept_names)

    def test_04_task_assignment_notifications(self):
        # Login as alice
        res = self.client.post('/api/auth/login', json={
            'email': 'alice@taskflow.dev',
            'password': 'password123',
        })
        alice_token = res.get_json()['token']
        alice_headers = {'Authorization': f'Bearer {alice_token}'}

        # Login as bob to get Bob's user id
        res = self.client.post('/api/auth/login', json={
            'email': 'bob@taskflow.dev',
            'password': 'password123',
        })
        bob_token = res.get_json()['token']
        bob_id = res.get_json()['user']['id']
        bob_headers = {'Authorization': f'Bearer {bob_token}'}

        # Check Bob's initial notifications
        res = self.client.get('/api/notifications', headers=bob_headers)
        initial_count = res.get_json()['unreadCount']

        # Alice creates a task assigned to Bob
        # Get project id for Video Editing Team (project 1)
        res = self.client.post('/api/tasks', headers=alice_headers, json={
            'title': 'Export 8K Master Footage',
            'description': 'Render ProRes 4444 master file.',
            'projectId': 1,
            'assigneeId': bob_id,
            'status': 'todo',
            'priority': 'high',
            'dueDate': '2026-09-30'
        })
        self.assertEqual(res.status_code, 201)

        # Bob should now have +1 notification!
        res = self.client.get('/api/notifications', headers=bob_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['unreadCount'], initial_count + 1)
        latest = data['notifications'][0]
        self.assertIn('Export 8K Master Footage', latest['message'])

        # Mark notification as read
        notif_id = latest['id']
        res = self.client.put(f'/api/notifications/{notif_id}/read', headers=bob_headers)
        self.assertEqual(res.status_code, 200)

        # Mark all read
        res = self.client.put('/api/notifications/read-all', headers=bob_headers)
        self.assertEqual(res.status_code, 200)
        res = self.client.get('/api/notifications', headers=bob_headers)
        self.assertEqual(res.get_json()['unreadCount'], 0)

    def test_05_calendar_tasks(self):
        res = self.client.post('/api/auth/login', json={
            'email': 'alice@taskflow.dev',
            'password': 'password123',
        })
        token = res.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        res = self.client.get('/api/tasks/calendar', headers=headers)
        self.assertEqual(res.status_code, 200)
        tasks = res.get_json()['tasks']
        self.assertTrue(len(tasks) > 0)
        for t in tasks:
            self.assertIsNotNone(t['dueDate'])
            self.assertIn('projectTitle', t)

if __name__ == '__main__':
    unittest.main()
