import { getGeoFromIp } from "./getGeoFromIp";
import React, { FC } from "react";
import ReactDOM from "react-dom/client";

const ipList = [
  "112.238.182.153",
  "142.250.76.46",
  "999.7.7.7",
  "2001:41d0:701:1100::29c8",
  "2404:6800:400a:804::200e",
  "2404:6800:400a:804::200e99",
  "772404:6800:400a:804::200e99"

]

const IpTag:FC<{ip:string}> = ({ip})=>{
  const [geo, setGeo] = React.useState<any>('Loading...');

  React.useEffect(() => {
    getGeoFromIp(ip).then(setGeo);
  }, [ip]);

  return (
    <div>
      {ip}: {JSON.stringify(geo)}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <br></br>
    {
      ipList.map((ip) => (
        <IpTag key={ip} ip={ip} />
      ))
    }
  </React.StrictMode>,
);
