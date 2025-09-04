import express from "express";
import connectionPool from "./utils/db.mjs";

const app = express();
const port = 4000;

app.use(express.json());

app.get("/test", (req, res) => {
  return res.json("Server API is working 🚀");
});

//Get all questions
app.get("/questions", async (req, res) => {
  try {
    const questions = await connectionPool.query("SELECT * FROM questions");
    return res.status(200).json(questions.rows);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch questions." });
  }
});

//Create new question
app.post("/questions", async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ message: "Invalid request data." });
    }
    const question = await connectionPool.query(
      "INSERT INTO questions (title, description, category) VALUES ($1, $2, $3) RETURNING *",
      [title, description, category]
    );
    return res.status(201).json({ message: "Question created successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create question." });
  }
});

//Search questions by title or category
app.get("/questions/search", async (req, res) => {
  try {
    const title = req.query.title;
    const category = req.query.category;
    const questions = await connectionPool.query(
      "SELECT * FROM questions WHERE title ILIKE $1 AND category ILIKE $2",
      [`%${title}%`, `%${category}%`]
    );
    if (!questions.rows[0]) {
      return res.status(404).json({ message: "Invalid search parameters." });
    }
    return res.status(200).json(questions.rows);
  } catch (error) {
    return res.status(500).json({ message: "Unable to search questions." });
  }
});

//Get a question by ID
app.get("/questions/:questionId", async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const question = await connectionPool.query(
      "SELECT * FROM questions WHERE id = $1",
      [questionId]
    );
    if (!question.rows[0]) {
      return res.status(404).json({ message: "Question not found." });
    }
    return res.status(200).json(question.rows);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch question." });
  }
});

//Update a question by ID
app.put("/questions/:questionId", async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const { title, description, category } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: "Invalid request data." });
    }

    const questionCheck = await connectionPool.query(
      "SELECT * FROM questions WHERE id = $1",
      [questionId]
    );
    if (!questionCheck.rows[0]) {
      return res.status(404).json({ message: "Question not found." });
    }

    const question = await connectionPool.query(
      "UPDATE questions SET title = $1, description = $2, category = $3 WHERE id = $4",
      [title, description, category, questionId]
    );
    return res.status(200).json({ message: "Question updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update question." });
  }
});

//Delete a question by ID ไม่ได้ลบ answer
app.delete("/questions/:questionId", async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const questionCheck = await connectionPool.query(
      "SELECT * FROM questions WHERE id = $1",
      [questionId]
    );
    if (!questionCheck.rows[0]) {
      return res.status(404).json({ message: "Question not found." });
    }

    const question = await connectionPool.query(
      "DELETE FROM questions WHERE id = $1",
      [questionId]
    );
    return res.status(200).json({ message: "Question deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete question." });
  }
});

//Get answers for a question
app.get("/questions/:questionId/answers", async (req, res) => {
  try {
    const questionId = req.params.questionId;

    const question = await connectionPool.query(
      "SELECT * FROM questions WHERE id = $1",
      [questionId]
    );
    if (!question.rows[0]) {
      return res.status(404).json({ message: "Question not found." });
    }

    const answers = await connectionPool.query(
      "SELECT * FROM answers WHERE question_id = $1",
      [questionId]
    );
    return res.status(200).json(answers.rows);
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch answers." });
  }
});

//Create an answer for a question
app.post("/questions/:questionId/answers", async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Invalid request data." });
    }

    const questionCheck = await connectionPool.query(
      "SELECT * FROM questions WHERE id = $1",
      [questionId]
    );
    if (!questionCheck.rows[0]) {
      return res.status(404).json({ message: "Question not found." });
    }

    const answer = await connectionPool.query(
      "INSERT INTO answers (question_id, content) VALUES ($1, $2) RETURNING *",
      [questionId, content]
    );
    return res.status(201).json({ message: "Answer created successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to create answer." });
  }
});

//Delete answers for a question
app.delete("/questions/:questionId/answers", async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const questionCheck = await connectionPool.query(
      "SELECT * FROM questions WHERE id = $1",
      [questionId]
    );
    if (!questionCheck.rows[0]) {
      return res.status(404).json({ message: "Question not found." });
    }
    const answer = await connectionPool.query(
      "DELETE FROM answers WHERE question_id = $1",
      [questionId]
    );
    return res
      .status(200)
      .json({
        message: "All Answers for the question have been deleted successfully.",
      });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete answers." });
  }
});

//Vote on a question
app.post("/questions/:questionId/vote", async (req, res) => {
  const questionId = req.params.questionId;
  const { vote } = req.body;
  const questionCheck = await connectionPool.query("SELECT * FROM questions WHERE id = $1", [questionId]);
  if (!questionCheck.rows[0]) {
    return res.status(404).json({ message: "Question not found." });
  }
  if(vote !== "1" && vote !== "-1") {
    return res.status(400).json({ message: "Invalid vote value." });
  }
  const question = await connectionPool.query("INSERT into question_votes (question_id, vote) VALUES ($1, $2) RETURNING *", [questionId, vote]);
  return res.status(200).json({message: "Question voted successfully."});
});

//Vote on an answer
app.post("/answers/:answerId/vote", async (req, res) => {
  const answerId = req.params.answerId;
  const { vote } = req.body;
  const answerCheck = await connectionPool.query("SELECT * FROM answers WHERE id = $1", [answerId]);
  if (!answerCheck.rows[0]) {
    return res.status(404).json({ message: "Answer not found." });
  }
  if(vote !== "1" && vote !== "-1") {
    return res.status(400).json({ message: "Invalid vote value." });
  }
  const answer = await connectionPool.query("INSERT into answer_votes (answer_id, vote) VALUES ($1, $2) RETURNING *", [answerId, vote]);
  return res.status(200).json({message: "Answer voted successfully."});
});


app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
