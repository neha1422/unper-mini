// app.js
// FINAL FULL UPDATED VERSION
// Dashboard + Search + Migration + CSV Export + Fixed Validation

const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

/* =========================
   BASIC CONFIG
========================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

/* =========================
   MYSQL CONNECTION
========================= */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "unper"
});

db.connect((err) => {
  if (err) {
    console.log("MYSQL ERROR:", err);
  } else {
    console.log("MYSQL CONNECTED");
  }
});

/* =========================
   DASHBOARD
========================= */
app.get("/", (req, res) => {

  const msg = req.query.msg || "";

  db.query(
    "SELECT COUNT(*) AS total FROM voters",
    (err1, totalRes) => {

      if (err1) return res.send("Database Error");

      db.query(
        "SELECT COUNT(*) AS done FROM migration_requests",
        (err2, doneRes) => {

          if (err2) return res.send("Database Error");

          db.query(
            "SELECT * FROM voters ORDER BY id ASC LIMIT 300",
            (err3, voters) => {

              if (err3) return res.send("Database Error");

              res.render("index", {
                total: totalRes[0].total,
                done: doneRes[0].done,
                voters: voters,
                msg: msg
              });

            }
          );

        }
      );

    }
  );

});

/* =========================
   SEARCH
========================= */
app.get("/search", (req, res) => {

  const q = req.query.q || "";

  db.query(
    "SELECT * FROM voters WHERE name LIKE ? OR state LIKE ? ORDER BY id ASC LIMIT 300",
    ['%' + q + '%', '%' + q + '%'],
    (err, voters) => {

      if (err) return res.send("Search Error");

      db.query(
        "SELECT COUNT(*) AS total FROM voters",
        (e1, totalRes) => {

          db.query(
            "SELECT COUNT(*) AS done FROM migration_requests",
            (e2, doneRes) => {

              res.render("index", {
                total: totalRes[0].total,
                done: doneRes[0].done,
                voters: voters,
                msg: q ? "Search Results" : ""
              });

            }
          );

        }
      );

    }
  );

});

/* =========================
   MIGRATION PAGE
========================= */
app.get("/migration", (req, res) => {

  res.render("migration", {
    msg: req.query.msg || ""
  });

});

/* =========================
   SUBMIT MIGRATION
========================= */
app.post("/migration", (req, res) => {

  const voter_id   = String(req.body.voter_id || "").trim();
  const from_state = String(req.body.from_state || "").trim();
  const to_state   = String(req.body.to_state || "").trim();

  /* validation */
  if (!voter_id || !from_state || !to_state) {
    return res.redirect("/migration?msg=Please select all fields");
  }

  if (from_state === to_state) {
    return res.redirect("/migration?msg=Choose different new state");
  }

  /* voter exists? */
  db.query(
    "SELECT * FROM voters WHERE id=?",
    [voter_id],
    (err, rows) => {

      if (err) {
        console.log(err);
        return res.redirect("/migration?msg=Database error");
      }

      if (rows.length === 0) {
        return res.redirect("/migration?msg=Invalid Voter ID");
      }

      /* update state */
      db.query(
        "UPDATE voters SET state=? WHERE id=?",
        [to_state, voter_id],
        (err2) => {

          if (err2) {
            console.log(err2);
            return res.redirect("/migration?msg=Update failed");
          }

          /* save request history */
          db.query(
            "INSERT INTO migration_requests(voter_id,from_state,to_state,req_status) VALUES(?,?,?,'Approved')",
            [voter_id, from_state, to_state],
            (err3) => {

              if (err3) {
                console.log(err3);
              }

              return res.redirect("/?msg=Submission Done! State Updated");

            }
          );

        }
      );

    }
  );

});

/* =========================
   EXPORT CSV
========================= */
app.get("/export-csv", (req, res) => {

  db.query(
    "SELECT id,name,age,gender,state,status FROM voters ORDER BY id ASC",
    (err, rows) => {

      if (err) {
        console.log(err);
        return res.send("CSV Export Failed");
      }

      let csv = "ID,Name,Age,Gender,State,Status\n";

      rows.forEach((r) => {
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

/* =========================
   START SERVER
========================= */
app.listen(3000, () => {
  console.log("Running on http://localhost:3000");
});