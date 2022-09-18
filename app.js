const express = require("express");
const app = express();
app.use(express.json());
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dbPath = path.join(__dirname, "twitterClone.db");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
let db = null;
const initiateDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error ${e.message}`);
  }
};
initiateDBAndServer();

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const getUserQuery = `select * from user where username = '${username}'`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (username.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashPassword = await bcrypt.hash(password, 10);
      const insertQuery = `insert into user(username,password,name,gender) values ('${username}','${hashPassword}','${name}','${gender}')`;
      await db.run(insertQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});
const authToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    const jwtToken = authHeader.split(" ")[1];
  }
  if (authHeader === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY SECRET TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        payload.username = username;
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `select * from user where username = '${username}'`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser == undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const passwordMatch = await bcrypt.compare(password, dbUser.password);
    if (passwordMatch) {
      const payload = { username: username };
      const jwtToken = await jwt.sign(payload, "MY SECRET TOKEN");
      response.send({ jwtToken: jwtToken });
    } else {
      response.status(401);
      response.send("Invalid password");
    }
  }
});
