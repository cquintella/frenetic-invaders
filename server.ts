import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { CREATE_SCORES_SQL, TOP_SCORE_LIMIT, TOP_SCORES_SQL } from "./src/scores/topScores.ts";

const db = new Database("scores.db");
db.exec(CREATE_SCORES_SQL);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/scores", (_req, res) => {
    const scores = db.prepare(TOP_SCORES_SQL).all(TOP_SCORE_LIMIT);
    res.json(scores);
  });

  app.post("/api/scores", (req, res) => {
    const { name, score, level } = req.body;
    if (!name || score === undefined || level === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const info = db.prepare("INSERT INTO high_scores (name, score, level) VALUES (?, ?, ?)").run(name, score, level);
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
