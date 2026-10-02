import { createElement } from "react";
import { createRoot } from "react-dom/client";
import Home from "./ui/Home.jsx";
import "./ui/home.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element is missing.");
}

createRoot(rootElement).render(createElement(Home));
