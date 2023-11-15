const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const basicAuth = require("basic-auth");

const app = express();
const port = 3000;

// MySQL connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "mydatabase",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL: ", err);
    return;
  }
  console.log("Connected to MySQL");
});

// Implementasi migration
const userTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    deleted BOOLEAN DEFAULT false
  )
`;

const productTable = `
  CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INT,
    deleted BOOLEAN DEFAULT false
  )
`;

connection.query(userTable);
connection.query(productTable);

// Implementasi seeder
connection.query(`
        INSERT INTO users (username, password, role) VALUES
        ('admin', '${bcrypt.hashSync("admin123", 10)}', 'admin'),
        ('user', '${bcrypt.hashSync("user123", 10)}', 'user')
      `);

connection.query(`
        INSERT INTO products (name, price) VALUES
        ('Product 1', 50),
        ('Product 2', 100)
      `);

// Middleware Basic Authentication
const authenticateBasic = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    res.status(401).json({ code: 401, message: "Unauthorized", data: null });
    return;
  }
  if (user.name === "admin" && user.pass === "admin123") {
    next();
  } else {
    res.status(401).json({ code: 401, message: "Unauthorized", data: null });
  }
};

app.use(bodyParser.json());

app.get("/users", authenticateBasic, (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ code: 403, message: "Forbidden", data: null });
    return;
  }

  const { take, skip, search } = req.query;
  const conditions = [];

  if (search) {
    conditions.push(`username LIKE '%${search}%'`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const limitClause = take ? `LIMIT ${parseInt(take)}` : "";
  const offsetClause = skip ? `OFFSET ${parseInt(skip)}` : "";

  const getUsersQuery = `SELECT * FROM users ${whereClause} ${limitClause} ${offsetClause}`;

  connection.query(getUsersQuery, (error, results) => {
    if (error) throw error;
    res.json({ code: 200, message: "Success", data: results });
  });
});

app.delete("/users/:id", authenticateBasic, (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ code: 403, message: "Forbidden", data: null });
    return;
  }

  const deleteUserQuery = `DELETE FROM users WHERE id=${req.params.id}`;
  connection.query(deleteUserQuery, (error, results) => {
    if (error) throw error;
    res.json({
      code: 200,
      message: "User deleted successfully",
      data: { id: req.params.id },
    });
  });
});

app.get("/products", authenticateBasic, (req, res) => {
  const { take, skip, search } = req.query;
  const conditions = [];

  if (search) {
    conditions.push(`name LIKE '%${search}%'`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const limitClause = take ? `LIMIT ${parseInt(take)}` : "";
  const offsetClause = skip ? `OFFSET ${parseInt(skip)}` : "";

  const getProductsQuery = `SELECT * FROM products ${whereClause} ${limitClause} ${offsetClause}`;

  connection.query(getProductsQuery, (error, results) => {
    if (error) throw error;
    res.json({ code: 200, message: "Success", data: results });
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
