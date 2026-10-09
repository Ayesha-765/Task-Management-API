# Task Management REST API

A RESTful Task Management API built using **Node.js, Express.js, and PostgreSQL**.

## Features

- User registration and login
- Users, Projects, and Tasks tables with relationships
- Password hashing using bcrypt
- JWT-based authentication
- Users, projects, and tasks management
- CRUD APIs for projects and tasks
- PostgreSQL JOIN queries
- Task search and filtering
- Pagination and sorting
- Overdue task listing
- Dashboard statistics
- Input validation and error handling
- Project ownership checks

## Technologies Used

- Node.js
- Express.js
- PostgreSQL
- node-postgres (`pg`)
- bcrypt
- JSON Web Token (`jsonwebtoken`)
- dotenv

## Installation

1. Clone this repository.
2. Open the project directory in your terminal.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a PostgreSQL database named `task_management`.
5. Create a `.env` file in the project root using `.env.example` as a reference.
6. Add your PostgreSQL connection settings and a private JWT secret to `.env`.
7. Start the application:

   ```bash
   npm run start
   ```

The server runs on port 5000 if configured with `app.listen(5000, ...)`.

## Environment Variables

Configure these variables in `.env` according to your `db.js` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=task_management
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_private_secret
```

Never commit your real `.env` file or secrets to GitHub.

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/register` | Register a user |
| POST | `/login` | Login and receive a token |

### Projects

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/projects` | Create a project |
| GET | `/projects` | List projects |
| GET | `/projects/:id` | Get a project |
| PUT | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete a project |

### Tasks

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/tasks` | Create a task |
| GET | `/tasks` | List tasks with pagination and sorting |
| GET | `/tasks/:id` | Get a task |
| PUT | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |
| GET | `/tasks/search` | Search and filter tasks |
| GET | `/tasks/overdue` | List overdue tasks |

### Dashboard

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/dashboard` | Get task statistics |

## Authentication

For protected endpoints, send the token received from `/login` in the Authorization header:

```text
Authorization: Bearer YOUR_TOKEN
```

## Testing

Use Postman to test the endpoints. Register a user, log in, copy the returned token, and use it for protected requests.

## Notes

- Ensure PostgreSQL is running before starting the application.
- Confirm the database tables are initialized successfully.
- Use valid IDs for related projects and users when creating tasks.
- Verify that ownership checks and all endpoints work before submission.