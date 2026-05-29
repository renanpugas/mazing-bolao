import { createApp } from "./app";

const app = createApp();

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
