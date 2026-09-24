import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("缺少应用挂载节点");
}

const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
let application: ReactNode;

if (normalizedPath === "/lab") {
  const [{ LabApp }] = await Promise.all([
    import("./lab/LabApp"),
    import("./lab/lab.css"),
  ]);
  application = <LabApp />;
} else {
  const [{ App }] = await Promise.all([
    import("./App"),
    import("./styles.css"),
  ]);
  application = <App />;
}

createRoot(rootElement).render(<StrictMode>{application}</StrictMode>);
