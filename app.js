// app.js
// FULL UPDATED WITH USER LOGIN + EXISTING FEATURES
// Install first:
// npm install express-session

const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const session = require("express-session");

const app = express();

/* =========================
   BASIC CONFIG
========================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(session({
  secret: "cems_secret_key",
  resave: false,
  saveUninitialized: true
}));

/* =========================
   MYSQL
========================= */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "unper"
});

db.connect((err) => {
  if (err) console.log(err);
  else console.log("MYSQL CONNECTED");
});

/* =========================
   LOGIN PAGE
========================= */
app.get("/login", (req, res) => {
  res.render("login", { msg: "" });
});

/* =========================
   LOGIN SUBMIT
========================= */
app.post("/login", (req, res) => {

  const username = req.body.username;
  const password = req.body.password;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, rows) => {

      if (rows.length === 0) {
        return res.render("login", {
          msg: "Invalid Login"
        });
      }

      req.session.user = rows[0];

      if (rows[0].role === "admin") {
        return res.redirect("/");
      } else {
        return res.redirect("/user");
      }

    }
  );

});

/* =========================
   LOGOUT
========================= */
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

/* =========================
   MIDDLEWARE
========================= */
function loggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

function adminOnly(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  if (req.session.user.role !== "admin") {
    return res.redirect("/user");
  }

  next();
}

/* =========================
   DASHBOARD (ADMIN)
========================= */
app.get("/", adminOnly, (req, res) => {

  const msg = req.query.msg || "";

  db.query("SELECT COUNT(*) AS total FROM voters", (e1, totalRes) => {

    db.query("SELECT COUNT(*) AS done FROM migration_requests", (e2, doneRes) => {

      db.query(
        "SELECT * FROM voters ORDER BY id ASC LIMIT 100",
        (e3, voters) => {

          res.render("index", {
            total: totalRes[0].total,
            done: doneRes[0].done,
            voters: voters,
            msg: msg
          });

        }
      );

    });

  });

});

/* =========================
   USER PANEL
========================= */
app.get("/user", loggedIn, (req, res) => {

  res.render("user", {
    user: req.session.user
  });

});

/* =========================
   SEARCH
========================= */
app.get("/search", adminOnly, (req, res) => {

  const q = req.query.q || "";

  db.query(
    "SELECT * FROM voters WHERE name LIKE ? OR state LIKE ? ORDER BY id ASC LIMIT 100",
    ['%' + q + '%', '%' + q + '%'],
    (err, voters) => {

      db.query("SELECT COUNT(*) AS total FROM voters", (e1, totalRes) => {

        db.query("SELECT COUNT(*) AS done FROM migration_requests", (e2, doneRes) => {

          res.render("index", {
            total: totalRes[0].total,
            done: doneRes[0].done,
            voters: voters,
            msg: "Search Results"
          });

        });

      });

    }
  );

});

/* =========================
   MIGRATION PAGE
========================= */
app.get("/migration", loggedIn, (req, res) => {

  res.render("migration", {
    msg: req.query.msg || ""
  });

});

/* =========================
   SUBMIT MIGRATION
========================= */
app.post("/migration", loggedIn, (req, res) => {

  const voter_id = req.body.voter_id;
  const from_state = req.body.from_state;
  const to_state = req.body.to_state;

  if (!voter_id || !from_state || !to_state) {
    return res.redirect("/migration?msg=Fill all fields");
  }

  db.query(
    "UPDATE voters SET state=? WHERE id=?",
    [to_state, voter_id],
    () => {

      db.query(
        "INSERT INTO migration_requests(voter_id,from_state,to_state,req_status) VALUES(?,?,?,'Approved')",
        [voter_id, from_state, to_state],
        () => {

          res.redirect("/?msg=Submission Done");

        }
      );

    }
  );

});

/* =========================
   EXPORT CSV
========================= */
app.get("/export-csv", adminOnly, (req, res) => {

  db.query(
    "SELECT id,name,age,gender,state,status FROM voters ORDER BY id ASC",
    (err, rows) => {

      let csv = "ID,Name,Age,Gender,State,Status\n";

      rows.forEach(r => {
        csv += `${r.id},"${r.name}",${r.age},"${r.gender}","${r.state}","${r.status}"\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=cems_voters_data.csv"
      );

      res.send(csv);

    }
  );

});

/* ========================= */
app.listen(3000, () => {
  console.log("Running on http://localhost:3000/login");
});