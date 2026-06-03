import { createApp } from "./app";

const app = createApp();
const port = Number(process.env.PORT || 3009);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
