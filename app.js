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
const authToken = async (request, response, next) => {
  const authHeader = await request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    await jwt.verify(jwtToken, "MY SECRET TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
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

app.get("/user/tweets/feed/", async (request, response) => {
  const getTweetsQuery = `select user.user_id,user.username as username,tweet.tweet as tweet,tweet.date_time as date_time from tweet inner join user on user.user_id = tweet.user_id order by date_time desc,user.user_id desc,user.username desc limit 4`;
  const tweetsArray = await db.all(getTweetsQuery);
  const tweetsObject = tweetsArray.map((obj) => {
    return {
      user: obj.user_id,
      username: obj.username,
      tweet: obj.tweet,
      dateTime: obj.date_time,
    };
  });
  response.send(tweetsObject);
});

app.get("/user/following/", async (request, response) => {
  const getFollowersQuery = `select name from follower left join user on follower.following_user_id = user.user_id order by follower.following_user_id asc`;
  const followerArray = await db.all(getFollowersQuery);
  response.send(followerArray);
});

app.get("/user/follower/", async (request, response) => {
  const getFollowersQuery = `select name from follower left join user on follower.follower_user_id = user.user_id order by follower.follower_user_id asc`;
  const followerArray = await db.all(getFollowersQuery);
  response.send(followerArray);
});

app.get("/tweets/:tweetId/", async (request, response) => {
  const { tweetId } = request.params;
  const getTweetQuery = `select * from tweet where tweet_id = '${tweetId}'`;
});

module.exports = app;
