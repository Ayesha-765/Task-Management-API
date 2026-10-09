import express from "express";
const app = express();
import pool from './db.js';
import "./database/schema.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
app.use(express.json());



pool.query("SELECT NOW()", (error, result) => {
    if (error) {
        console.log("Database connection failed", error);

    } else {
        console.log("Database connection successful", result.rows);
    }
})


function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Access denied. Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}


// Register User API
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Failed to register user"
        });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

app.post("/projects", authMiddleware, async (req, res) => {
    try {
        const { name, description } = req.body;
        const owner_id = req.user.id;
        if (!name || !owner_id) {
            return res.status(400).json({
                message: "Project name and owner_id are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO projects (name, description, owner_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, description || null, owner_id]
        );

        res.status(201).json({
            message: "Project created successfully",
            project: result.rows[0]
        });

    } catch (error) {
        console.error("Create project error:", error.message);

        if (error.code === "23503") {
            return res.status(400).json({
                message: "The specified owner does not exist"
            });
        }

        res.status(500).json({
            message: "Failed to create project"
        });
    }
});

app.get("/projects", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                projects.id,
                projects.name,
                projects.description,
                projects.owner_id,
                users.name AS owner_name,
                users.email AS owner_email,
                projects.created_at
            FROM projects
            JOIN users
                ON projects.owner_id = users.id
            ORDER BY projects.id ASC
        `);

        res.status(200).json({
            message: "Projects fetched successfully",
            projects: result.rows
        });

    } catch (error) {
        console.error("Get projects error:", error.message);

        res.status(500).json({
            message: "Failed to fetch projects"
        });
    }
});

app.get("/projects/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                projects.id,
                projects.name,
                projects.description,
                projects.owner_id,
                users.name AS owner_name,
                users.email AS owner_email,
                projects.created_at
             FROM projects
             JOIN users
                ON projects.owner_id = users.id
             WHERE projects.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        res.status(200).json({
            message: "Project fetched successfully",
            project: result.rows[0]
        });

    } catch (error) {
        console.error("Get project error:", error.message);

        res.status(500).json({
            message: "Failed to fetch project"
        });
    }
});

app.put("/projects/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({
                message: "Name and description are required"
            });
        }

        const result = await pool.query(
            `UPDATE projects
     SET name = $1, description = $2
     WHERE id = $3 AND owner_id = $4
     RETURNING *`,
            [name, description, req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Project not found or you are not the owner"
            });
        }

        res.status(200).json({
            message: "Project updated successfully",
            project: result.rows[0]
        });

    } catch (error) {
        console.error("Update project error:", error.message);

        res.status(500).json({
            message: "Failed to update project"
        });
    }
});

app.delete("/projects/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM projects
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Project not found or you are not the owner"
            });
        }

        res.status(200).json({
            message: "Project deleted successfully"
        });

    } catch (error) {
        console.error("Delete project error:", error.message);

        res.status(500).json({
            message: "Failed to delete project"
        });
    }
});

app.post("/tasks", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            status,
            priority,
            due_date,
            project_id,
            assigned_to
        } = req.body;

        if (!title || !project_id) {
            return res.status(400).json({
                message: "Title and project_id are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO tasks
                (title, description, status, priority, due_date, project_id, assigned_to)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                title,
                description || null,
                status || "pending",
                priority || "medium",
                due_date || null,
                project_id,
                assigned_to || null
            ]
        );

        res.status(201).json({
            message: "Task created successfully",
            task: result.rows[0]
        });

    } catch (error) {
        console.error("Create task error:", error.message);

        if (error.code === "23503") {
            return res.status(400).json({
                message: "Invalid project_id or assigned_to user"
            });
        }

        if (error.code === "23514") {
            return res.status(400).json({
                message: "Invalid status or priority"
            });
        }

        res.status(500).json({
            message: "Failed to create task"
        });
    }
});

//get all tasks supporting pagination, sorting, and filtering by project_id
app.get("/tasks", authMiddleware, async (req, res) => {
    try {
        // Pagination
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        const limit = Math.min(
            Math.max(parseInt(req.query.limit) || 5, 1),
            100
        );

        const offset = (page - 1) * limit;

        // Sorting
        const allowedSortFields = {
            id: "tasks.id",
            title: "tasks.title",
            status: "tasks.status",
            priority: "tasks.priority",
            due_date: "tasks.due_date",
            created_at: "tasks.created_at"
        };

        const sortBy = allowedSortFields[req.query.sortBy]
            ? req.query.sortBy
            : "id";

        const order = req.query.order?.toLowerCase() === "desc"
            ? "DESC"
            : "ASC";

        // Fetch tasks with JOIN
        const result = await pool.query(
            `
            SELECT
                tasks.*,
                projects.name AS project_name,
                users.name AS assigned_user_name,
                users.email AS assigned_user_email
            FROM tasks
            JOIN projects
                ON tasks.project_id = projects.id
            LEFT JOIN users
                ON tasks.assigned_to = users.id
            ORDER BY ${allowedSortFields[sortBy]} ${order}
            LIMIT $1 OFFSET $2
            `,
            [limit, offset]
        );

        // Total task count
        const countResult = await pool.query(
            "SELECT COUNT(*) FROM tasks"
        );

        const totalTasks = Number(countResult.rows[0].count);

        res.status(200).json({
            page: page,
            limit: limit,
            totalTasks: totalTasks,
            totalPages: Math.ceil(totalTasks / limit),
            tasks: result.rows
        });

    } catch (error) {
        console.error("Get tasks error:", error.message);

        res.status(500).json({
            message: "Failed to fetch tasks"
        });
    }
});

//search tasks
app.get("/tasks/search", authMiddleware, async (req, res) => {
    try {
        const { title, status, priority, project_id } = req.query;

        const conditions = [];
        const values = [];

        if (title) {
            values.push(`%${title}%`);
            conditions.push(`tasks.title ILIKE $${values.length}`);
        }

        if (status) {
            values.push(status);
            conditions.push(`tasks.status = $${values.length}`);
        }

        if (priority) {
            values.push(priority);
            conditions.push(`tasks.priority = $${values.length}`);
        }

        if (project_id) {
            values.push(project_id);
            conditions.push(`tasks.project_id = $${values.length}`);
        }

        let query = `
            SELECT tasks.*, projects.name AS project_name
            FROM tasks
            JOIN projects ON tasks.project_id = projects.id
        `;

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY tasks.id ASC";

        const result = await pool.query(query, values);

        res.status(200).json({
            count: result.rows.length,
            tasks: result.rows
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Failed to search tasks"
        });
    }
});

//overdue tasks
app.get("/tasks/overdue", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                tasks.*,
                projects.name AS project_name,
                users.name AS assigned_user_name
            FROM tasks
            JOIN projects ON tasks.project_id = projects.id
            LEFT JOIN users ON tasks.assigned_to = users.id
            WHERE tasks.due_date < CURRENT_DATE
              AND tasks.status != 'completed'
            ORDER BY tasks.due_date ASC
        `);

        res.status(200).json({
            count: result.rows.length,
            tasks: result.rows
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Failed to fetch overdue tasks"
        });
    }
});

//get single task by id
app.get("/tasks/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                tasks.*,
                projects.name AS project_name,
                users.name AS assigned_user_name
             FROM tasks
             JOIN projects ON tasks.project_id = projects.id
             LEFT JOIN users ON tasks.assigned_to = users.id
             WHERE tasks.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.status(200).json({
            task: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Failed to fetch task"
        });
    }
});

app.put("/tasks/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            status,
            priority,
            due_date,
            project_id,
            assigned_to
        } = req.body;

        if (!title || !project_id) {
            return res.status(400).json({
                message: "Title and project_id are required"
            });
        }

        const result = await pool.query(
            `UPDATE tasks
             SET title = $1,
                 description = $2,
                 status = $3,
                 priority = $4,
                 due_date = $5,
                 project_id = $6,
                 assigned_to = $7
             WHERE id = $8
             RETURNING *`,
            [
                title,
                description || null,
                status,
                priority,
                due_date || null,
                project_id,
                assigned_to || null,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.status(200).json({
            message: "Task updated successfully",
            task: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        if (error.code === "23503" || error.code === "23514") {
            return res.status(400).json({
                message: "Invalid project, user, status or priority"
            });
        }

        res.status(500).json({
            message: "Failed to update task"
        });
    }
});

app.delete("/tasks/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM tasks
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.status(200).json({
            message: "Task deleted successfully",
            task: result.rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Failed to delete task"
        });
    }
});

//dashboard api to get all tasks statistics
app.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) AS total_tasks,
                COUNT(*) FILTER (
                    WHERE status = 'completed'
                ) AS completed_tasks,
                COUNT(*) FILTER (
                    WHERE status = 'pending'
                ) AS pending_tasks,
                COUNT(*) FILTER (
                    WHERE due_date < CURRENT_DATE
                    AND status != 'completed'
                ) AS overdue_tasks
            FROM tasks
        `);

        res.status(200).json({
            message: "Dashboard statistics fetched successfully",
            statistics: result.rows[0]
        });

    } catch (error) {
        console.error("Dashboard error:", error.message);

        res.status(500).json({
            message: "Failed to fetch dashboard statistics"
        });
    }
});





app.listen(5000, () => {
    console.log("Server running on port 5000");
});