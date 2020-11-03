require('dotenv').config();
const express = require('express');
const sql = require('mysql2/promise');
const cors = require('cors');
const { urlencoded, request, response } = require('express');
const PORT = 4000;
const authorizeUser = require('./authorize/functions');
const aws = require('aws-sdk');
// const serverless = require('serverless-http');
// const { report } = require('process');

aws.config.setPromisesDependency();
aws.config.update({
  accessKeyId: process.env.s3TokenKey,
  secretAccessKey: process.env.s3Secret,
  region: 'us-east-1',
});
const s3 = new aws.S3();
//config s3 for upload and fetching

const app = express();
app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(cors());

const pool = sql.createPool({
  host: process.env.host,
  user: process.env.sqluser,
  password: process.env.password,
});

//get user profile*****
//get current user profile
//get posts by user
//get posts by rank
//get avatar url*****
//get posts by state****
//create user****
//create post****
//create comment****
//get num comments

//get number of comments for specific posts
app.post('/get-num-comments', authorizeUser, async (req, resp) => {
  console.log('get num comments hit');
  try {
    const postId = req.body.postId;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT COUNT(*) AS count FROM stateChat.comments WHERE postId=?',
      [postId],
    );
    console.log(response[0]);

    conn.release();
    resp.status(200).send(response[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//gets all posts from specific state
app.post('/get-posts-by-state', authorizeUser, async (req, resp) => {
  console.log('get posts by state hit');
  try {
    const state = req.body.state;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.posts WHERE state=?',
      [state],
    );
    conn.release();

    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-all-posts', authorizeUser, async (req, resp) => {
  console.log('get all posts hit');
  try {
    const conn = await pool.getConnection();

    const response = await conn.execute('SELECT * FROM stateChat.posts');

    conn.release();

    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//gets avatar img url from s3 for current signed in user
app.post('/get-avatar-url', authorizeUser, async (req, resp) => {
  console.log('get avatar url hit');
  try {
    const username = req.decodedToken['cognito:username'];

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT avatar FROM stateChat.users WHERE username=?',
      [username],
    );
    conn.release();
    const avatarPath = `public/${response[0][0].avatar}`;
    const params = {
      Bucket: 'statechatbucket145149-moz',
      Key: avatarPath,
      Expires: 60,
    };

    s3.getSignedUrlPromise('getObject', params)
      .then((url) => {
        // console.log(url);
        resp.status(200).send(url);
      })

      .catch((err) => resp.status(500).send(err));
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//gets user data of specified user (not signed in user)
app.post('/get-user', authorizeUser, async (req, resp) => {
  try {
    const username = req.body.username;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.users FROM username=?',
      [username],
    );
    conn.release();

    resp.status(200).send(response[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//creates user after user has confirmed aws code
app.post('/create-user', authorizeUser, async (req, resp) => {
  console.log('create user hit');
  try {
    const username = req.decodedToken['cognito:username'];
    const avatar = 'default/DefaultAvatar.png';
    //will need to create user with default avatar
    const email = req.decodedToken.email;
    const state = '';

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'INSERT INTO stateChat.users (username, avatar, email, state) VALUES (?,?,?,?)',
      [username, avatar, email, state],
    );

    conn.release();
    resp.status(200).send({ message: 'user successfully added' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//creates post with passed info and adds current timestamp
app.post('/create-post', authorizeUser, async (req, resp) => {
  console.log('create post hit');
  try {
    const creator = req.decodedToken['cognito:username'];
    const title = req.body.title;
    const content = req.body.content;
    const category = req.body.category;
    const timestamp = Date.now();

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'INSERT INTO stateChat.posts (creator, title, content, category, timestamp) VALUES (?,?,?,?,?)',
      [creator, content, title, category, timestamp],
    );

    conn.release();
    resp.status(200).send({ message: 'post successfully created' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//creates comment on specific post and adds current timestamp
app.post('/create-comment', authorizeUser, async (req, resp) => {
  console.log('create comment hit');
  try {
    const creator = req.decodedToken['cognito:username'];
    const postId = req.body.postId;
    const comment = req.body.comment;
    const timestamp = Date.now();

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'INSERT INTO stateChat.comments (creator, postId, comment, timestamp) VALUES (?,?,?,?)',
      [creator, postId, comment, timestamp],
    );

    conn.release();
    resp.status(200).send({ message: 'comment succesfully created' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.listen(PORT, console.log(`app is listening on ${PORT}`));
