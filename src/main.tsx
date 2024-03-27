import { getGeoFromIp } from "./getGeoFromIp";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    Use this to run a local development environment of the library for testing
    <br></br>
    {await getGeoFromIp("112.238.182.153")}
  </React.StrictMode>,
);
