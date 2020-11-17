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
//get posts by user*****
//get posts by rank
//get avatar url*****
//get posts by state****
//create user****
//create post****
//create comment****
//get num comments******

app.post('/mark-seen', authorizeUser, async (req, resp) => {
  console.log('mark seen hit');
  try {
    const notificationId = req.body.notificationId;

    const conn = await pool.getConnection();
    await conn.execute(
      'UPDATE stateChat.notifications SET seen=? WHERE notificationId=?',
      [1, notificationId],
    );
    conn.release();

    resp.status(200).send({ message: 'notification marked as seen' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-num-notifications', authorizeUser, async (req, resp) => {
  console.log('get num notifications hit');
  try {
    const username = req.decodedToken['cognito:username'];

    const conn = await pool.getConnection();
    const numResp = await conn.execute(
      'SELECT COUNT(notificationId) as count FROM stateChat.notifications WHERE seen=? AND userFor=?',
      [0, username],
    );
    conn.release();

    resp.status(200).send(numResp[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-followed', authorizeUser, async (req, resp) => {
  console.log('get followed hit');
  try {
    // const username = req.decodedToken['cognito:username'];
    const followedBy = req.body.followedBy;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.followers WHERE followedBy=?',
      [followedBy],
    );

    conn.release();

    console.log(response[0]);

    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-notifications', authorizeUser, async (req, resp) => {
  console.log('get notifications hit');
  try {
    const userFor = req.decodedToken['cognito:username'];

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.notifications WHERE userFor=?',
      [userFor],
    );

    conn.release();

    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/create-notification', authorizeUser, async (req, resp) => {
  console.log('create notification hit');
  try {
    const userFor = req.body.userFor;
    const message = req.body.message;
    const timestamp = Date.now();

    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO stateChat.notifications (userFor, message, timestamp) VALUES (?,?,?)',
      [userFor, message, timestamp],
    );

    conn.release();

    resp.status(200).send({ message: 'notification succesfully created' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/unfollow', authorizeUser, async (req, resp) => {
  console.log('unfollow hit');
  try {
    const followed = req.body.user;
    const followedBy = req.decodedToken['cognito:username'];

    const conn = await pool.getConnection();
    await conn.execute(
      'DELETE FROM stateChat.followers WHERE followed=? AND followedBy=?',
      [followed, followedBy],
    );

    conn.release();

    resp.status(200).send({ message: 'user unfollowed' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/follow', authorizeUser, async (req, resp) => {
  console.log('follow hit');
  try {
    const followed = req.body.user;
    const followedBy = req.decodedToken['cognito:username'];

    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO stateChat.followers (followed, followedBy) VALUES (?,?)',
      [followed, followedBy],
    );

    conn.release();

    resp.status(200).send({ message: 'user followed' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-is-followed', authorizeUser, async (req, resp) => {
  console.log('get is followed hit');
  try {
    const followed = req.body.user;
    const followedBy = req.decodedToken['cognito:username'];

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.followers WHERE followed=? AND followedBy=?',
      [followed, followedBy],
    );

    conn.release();

    if (response[0].length > 0) {
      resp.status(200).send(true);
    } else {
      resp.status(200).send(false);
    }
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/delete-post', authorizeUser, async (req, resp) => {
  console.log('delete post hit');
  try {
    const username = req.decodedToken['cognito:username'];
    const postId = req.body.postId;

    const conn = await pool.getConnection();
    await conn.execute('DELETE FROM stateChat.likes WHERE postIdLiked=?', [
      postId,
    ]);
    await conn.execute('DELETE FROM stateChat.comments WHERE postId=?', [
      postId,
    ]);
    await conn.execute(
      'DELETE FROM stateChat.posts WHERE postId=? AND creator=?',
      [postId, username],
    );

    conn.release();

    resp.status(200).send({ message: 'Post deleted succesfully' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-max-activity', authorizeUser, async (req, resp) => {
  console.log('get max activity hit');
  try {
    const conn = await pool.getConnection();

    const activityResp = await conn.execute(
      'SELECT max(totalActivity) as max FROM stateChat.stateActivity',
    );
    conn.release();

    resp.status(200).send(activityResp[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//returns array of state and activity nums
app.post('/get-state-activity', authorizeUser, async (req, resp) => {
  console.log('get state activity hit');
  try {
    const conn = await pool.getConnection();

    const activityResp = await conn.execute(
      'SELECT * FROM stateChat.stateActivity',
    );
    conn.release();

    resp.status(200).send(activityResp[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//returns user's posts with comments and likes totals
app.post('/get-user-posts-ranked', authorizeUser, async (req, resp) => {
  console.log('get user posts ranked hit');
  try {
    const creator = req.body.creator;
    const conn = await pool.getConnection();
    await conn.query('USE stateChat');
    const response = await conn.execute(
      'SELECT * FROM stateChat.postsWithTotals WHERE creator=?',
      [creator],
    );

    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//gets posts from specific state ranked
app.post('/get-state-posts-ranked', authorizeUser, async (req, resp) => {
  console.log('get user posts ranked hit');
  try {
    const state = req.body.state;
    const conn = await pool.getConnection();
    await conn.query('USE stateChat');
    const response = await conn.execute(
      'SELECT * FROM stateChat.postsWithTotals WHERE category=?',
      [state],
    );

    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//returns table of posts with total count of likes and comments the sorts by total count
app.post('/get-trending-posts', authorizeUser, async (req, resp) => {
  console.log('get trending posts');
  try {
    const conn = await pool.getConnection();
    await conn.query('USE stateChat');
    const response = await conn.execute(
      'SELECT postId, creator, content, category, timestamp, title, image, (ifNull(likeCount,0) + ifnull(commentCount,0)) as totalCount from (SELECT * FROM (likesCountsJoin) left JOIN(SELECT commentCount, postId as postIdCommented FROM commentsView) as commentsCounts on likesCountsJoin.postId = commentsCounts.postIdCommented ) as newTable order by totalCount desc',
    );

    conn.release();
    resp.status(200).send(response[0]);
    //sql query is in workbench
    //i need to rename views
    //query returns table with counts of comments and likes in their own columns
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-s3-image', authorizeUser, async (req, resp) => {
  console.log('get s3 image hit');
  try {
    const path = `public/${req.body.path}`;
    const params = {
      Bucket: 'statechatbucket145149-moz',
      Key: path,
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

app.post('/get-num-votes', authorizeUser, async (req, resp) => {
  console.log('get num votes hit');
  try {
    const postIdLiked = req.body.postId;
    const vote = req.body.vote;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT COUNT(*) AS votes from stateChat.likes where postIdLiked=? and vote=?',
      [postIdLiked, vote],
    );

    conn.release();
    resp.status(200).send(response[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/delete-vote', authorizeUser, async (req, resp) => {
  console.log('delete vote hit');
  try {
    const username = req.decodedToken['cognito:username'];
    const postId = req.body.postId;

    const conn = await pool.getConnection();
    await conn.execute(
      'DELETE FROM stateChat.likes WHERE likedByUser=? && postIdLiked=?',
      [username, postId],
    );
    conn.release();

    resp.status(200).send({ message: 'vote deleted' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/vote', authorizeUser, async (req, resp) => {
  console.log('vote hit');
  try {
    const username = req.decodedToken['cognito:username'];
    const postId = req.body.postId;
    const vote = req.body.vote;
    console.log(vote);

    const conn = await pool.getConnection();
    await conn.execute(
      'INSERT INTO stateChat.likes (likedByUser, postIdLiked, vote) VALUES (?,?,?)',
      [username, postId, vote],
    );
    conn.release();

    resp.status(200).send({ message: `post was voted as ${vote}` });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-is-liked', authorizeUser, async (req, resp) => {
  console.log('get is liked hit');
  try {
    const username = req.decodedToken['cognito:username'];
    const postId = req.body.postId;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.likes WHERE likedByUser=? && postIdLiked=?',
      [username, postId],
    );
    conn.release();

    resp.status(200).send(response[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

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

    conn.release();
    resp.status(200).send(response[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/get-comments-by-id', authorizeUser, async (req, resp) => {
  console.log('get comments by id hit');
  try {
    const postId = req.body.postId;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.comments WHERE postId=?',
      [postId],
    );

    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

app.post('/search', authorizeUser, async (req, resp) => {
  console.log('search hit');
  try {
    const search = req.body.search;
    console.log(search);

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.posts WHERE title LIKE ?',
      [`%${search}%`],
    );

    conn.release();
    resp.status(200).send(response[0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//get specific post
app.post('/get-post-by-id', authorizeUser, async (req, resp) => {
  console.log('get post by id hit');
  try {
    const postId = req.body.postId;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.posts WHERE postId=?',
      [postId],
    );

    conn.release();
    resp.status(200).send(response[0][0]);
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//gets all posts from specific user
app.post('/get-posts-by-user', authorizeUser, async (req, resp) => {
  console.log('get posts by user hit');
  try {
    const creator = req.body.creator;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT * FROM stateChat.posts WHERE creator=?',
      [creator],
    );
    conn.release();

    resp.status(200).send(response[0]);
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
      'SELECT * FROM stateChat.posts WHERE category=?',
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

app.post('/update-avatar', authorizeUser, async (req, resp) => {
  console.log('update avatar hit');
  try {
    const username = req.decodedToken['cognito:username'];
    const avatar = req.body.avatarPath;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'UPDATE stateChat.users SET avatar=? WHERE username=?',
      [avatar, username],
    );
    conn.release();
    resp.status(200).send({ message: 'avatar pic updated' });
  } catch (error) {
    console.log(error);
    resp.status(500).send({ message: error });
  }
});

//gets avatar img url from s3 for current signed in user
app.post('/get-avatar-url', authorizeUser, async (req, resp) => {
  console.log('get avatar url hit');
  try {
    const user = req.body.user;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'SELECT avatar FROM stateChat.users WHERE username=?',
      [user],
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
    const state = req.body.state;

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
    const image = req.body.image ? req.body.image : null;

    const conn = await pool.getConnection();
    const response = await conn.execute(
      'INSERT INTO stateChat.posts (creator, title, content, category, timestamp, image) VALUES (?,?,?,?,?,?)',
      [creator, title, content, category, timestamp, image],
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
