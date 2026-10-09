import pool from "../db.js";

pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (error) => {
    if (error) {
        console.log("Users table creation failed", error);
        return;
    }

    console.log("Users table created successfully");

    pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            description TEXT,
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_project_owner
                FOREIGN KEY (owner_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    `, (error) => {

        if (error) {
            console.log("Projects table creation failed", error);
            return;
        }

        console.log("Projects table created successfully");

        pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,

                status VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed')),

                priority VARCHAR(20) DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high')),

                due_date DATE,

                project_id INTEGER NOT NULL,
                assigned_to INTEGER,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_task_project
                    FOREIGN KEY (project_id)
                    REFERENCES projects(id)
                    ON DELETE CASCADE,

                CONSTRAINT fk_task_user
                    FOREIGN KEY (assigned_to)
                    REFERENCES users(id)
                    ON DELETE SET NULL
            )
        `, (error) => {

            if (error) {
                console.log("Tasks table creation failed", error);
                return;
            }

            console.log("Tasks table created successfully");
        });
    });
});