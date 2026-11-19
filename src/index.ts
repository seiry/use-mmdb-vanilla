import { getGeoFromIp } from "./getGeoFromIp";

export { getGeoFromIp };

if (typeof window !== "undefined") {
  (window as unknown as { getGeoFromIp: typeof getGeoFromIp }).getGeoFromIp =
    getGeoFromIp;
}
