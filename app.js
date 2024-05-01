const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "tasks.db");
let db = null;

app.use(express.json());

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running on port number 3000.");
    });
  } catch (error) {
    console.log(`DB Error ${error}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//For Creating New User
app.post("/add-new-user/", async (request, response) => {
  const { username, role, password } = request.body;
  if (password.length >= 8) {
    const userCheckQuery = `SELECT * FROM Users WHERE username=='${username}';`;
    const isUserAvailable = await db.get(userCheckQuery);
    if (isUserAvailable === undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const addNewUserQuery = `INSERT INTO Users(username,role,password_hash) 
       VALUES ('${username}','${role}','${hashedPassword}');`;
      const dbResponse = await db.run(addNewUserQuery);
      response.send("User Added Successfully");
    } else {
      response.status(400);
      response.send("Username is Already Taken");
    }
  } else {
    response.status(400);
    response.send("Password Must Have At least 8 Characters");
  }
});

//To Login the Users
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userCheckQuery = `SELECT * FROM Users WHERE username='${username}';`;
  const isUserIsThere = await db.get(userCheckQuery);
  if (isUserIsThere === undefined) {
    response.status(400);
    response.send("You are not a registered user");
  } else {
    const { username, password_hash } = isUserIsThere;
    const passwordMatchStatus = await bcrypt.compare(password, password_hash);
    if (passwordMatchStatus) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "my_secret_token");
      response.send(jwtToken);
      console.log(jwtToken);
    } else {
      response.status(400);
      response.send("Password is not matched");
    }
  }
});

//JWT Token Check MiddleWare
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers.authorization;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "my_secret_token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        const toGetUserDataQuery = `SELECT * FROM Users WHERE username=='${payload.username}';`;
        request.username = payload.username;
        next();
      }
    });
  }
};

//To Get All Tasks Created By Admin(the user created the task)
//The Admin(the user created the task) Get All The Created Tasks By Him/Her.
app.post("/tasks/", authenticateToken, async (request, response) => {
  const username = request.username;
  const {
    title,
    description,
    status,
    assigned_employee_id,
    created_at,
  } = request.body;
  const toGetLoggedUserDataQuery = `SELECT * FROM Users WHERE username=='${username}';`;
  const loggedUserData = await db.get(toGetLoggedUserDataQuery);
  const toGetEmployeeData = `SELECT * FROM Users WHERE id==${assigned_employee_id};`;
  const employee_data = await db.get(toGetEmployeeData);

  if (loggedUserData.role === "manager") {
    if (employee_data.role === "employee") {
      const toInsertDataQuery = `INSERT INTO Tasks
  (title,description,status,assigned_employee_id,created_at) 
  VALUES('${title}','${description}','${status}',${assigned_employee_id},'${created_at}');`;
      db.run(toInsertDataQuery);
      response.send("Data Inserted Successfully");
    } else {
      response.status(400);
      response.send("Please Provide Correct Employee Id");
    }
  } else {
    response.status(400);
    response.send("Only Manager Can Add New Task");
  }
});

//To get all tasks data
app.get("/tasks/", authenticateToken, async (request, response) => {
  const username = request.username;
  const toGetLoggedUserDataQuery = `SELECT * FROM Users WHERE username=='${username}';`;
  const loggedUserData = await db.get(toGetLoggedUserDataQuery);
  let getAllTasksQuery;
  if (loggedUserData.role === "manager" || loggedUserData.role === "client") {
    getAllTasksQuery = `SELECT * FROM tasks;`;
  } else if (loggedUserData.role === "employee") {
    getAllTasksQuery = `SELECT * FROM tasks WHERE assigned_employee_id=='${loggedUserData.id}';`;
  }
  const resultData = await db.all(getAllTasksQuery);
  response.send(resultData);
});

//To Get Particular Task Data Based On Task Id
//Client and Manager can get any particular task
//Employee able to get the assigned task only.
app.get("/tasks/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const username = request.username;
  const toGetLoggedUserDataQuery = `SELECT * FROM Users WHERE username=='${username}';`;
  const loggedUserData = await db.get(toGetLoggedUserDataQuery);
  if (loggedUserData.role === "manager" || loggedUserData.role === "client") {
    const getSpecificTaskQuery = `SELECT * FROM Tasks WHERE id=${id};`;
    const resultData = await db.get(getSpecificTaskQuery);
    if (resultData === undefined) {
      response.status(400);
      response.send("There is no task with this Id");
    } else {
      response.send(resultData);
    }
  } else if (loggedUserData.role === "employee") {
    const getSpecificTaskQuery = `SELECT * FROM Tasks WHERE id=${id} AND assigned_employee_id=${loggedUserData.id};`;
    const resultData = await db.get(getSpecificTaskQuery);
    if (resultData === undefined) {
      response.status(400);
      response.send("Employees Can Access The Assigned Task Only.");
    } else {
      response.send(resultData);
    }
  }
});

//To Update Task Based On Task Id
//Manager Can Update Any Task.
//Employee Can Update Only The Assigned Task.
//Client Can't Update Any Task By His Own.
app.put("/tasks/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const username = request.username;
  const toGetLoggedUserDataQuery = `SELECT * FROM Users WHERE username=='${username}';`;
  const loggedUserData = await db.get(toGetLoggedUserDataQuery);

  const updateDate = new Date();
  const month =
    parseInt(updateDate.getMonth()) + 1 > 9
      ? parseInt(updateDate.getMonth()) + 1
      : "0" + (parseInt(updateDate.getMonth()) + 1);
  const date = `${updateDate.getFullYear()}-${month}-${updateDate.getDate()} ${updateDate.getHours()}:${updateDate.getMinutes()}:${updateDate.getSeconds()}`;

  const { title, description, status } = request.body;
  let query;

  if (
    title !== undefined &&
    description !== undefined &&
    status !== undefined
  ) {
    query = `UPDATE Tasks SET title='${title}',description='${description}',status='${status}'
      ,updated_at='${date}' WHERE id=${id};`;
  } else if (title !== undefined && description !== undefined) {
    query = `UPDATE Tasks SET title='${title}',description='${description}',updated_at='${date}' 
      WHERE id=${id};`;
  } else if (title !== undefined && status !== undefined) {
    query = `UPDATE Tasks SET title='${title}',status='${status}',updated_at='${date}' WHERE id=${id};`;
  } else if (description !== undefined && status !== undefined) {
    query = `UPDATE Tasks SET description='${description}',status='${status}',updated_at='${date}' 
      WHERE id=${id};`;
  }

  if (loggedUserData.role === "manager") {
    const getSpecificTask = `SELECT * FROM Tasks WHERE id=${id};`;
    const result = await db.get(getSpecificTask);
    if (result === undefined) {
      response.status(400);
      response.send("There is no task with the provide id");
    } else {
      await db.run(query);
      response.send("Task Successfully Updated");
    }
  } else if (loggedUserData.role === "employee") {
    const getSpecificTask = `SELECT * FROM Tasks WHERE id=${id} AND 
      assigned_employee_id==${loggedUserData.id};`;
    const result = await db.get(getSpecificTask);
    if (result === undefined) {
      response.status(401);
      response.send(
        "Either there is no task or the task wasn't assigned to you."
      );
    } else {
      await db.run(query);
      response.send("Task Successfully Updated");
    }
  }
});

//To Delete A Task Based On Task Id.
//Only The Manager Can Delete The Task.
app.delete("/tasks/:id", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const username = request.username;
  const toGetLoggedUserDataQuery = `SELECT * FROM Users WHERE username=='${username}';`;
  const loggedUserData = await db.get(toGetLoggedUserDataQuery);
  if (loggedUserData.role === "manager") {
    const getSpecificTask = `SELECT * FROM Tasks WHERE id=${id}`;
    const result = await db.get(getSpecificTask);
    if (result === undefined) {
      response.status(401);
      response.send(`There is no task with the ID-${id}`);
    } else {
      const deleteTaskQuery = `DELETE FROM Tasks WHERE id==${id};`;
      await db.run(deleteTaskQuery);
      response.send("Task Deleted Successfully");
    }
  } else {
    response.status(401);
    response.send("You Are Not Allowed To Delete Tasks.");
  }
});
