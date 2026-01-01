export const _mmdbUrl =
  "https://raw.githubusercontent.com/Max-Sum/17mon-mmdb/release/Country.mmdb";
import * as mmdb from "mmdb.js";
import { fetchFileAsBuffer } from "./utils";

let reader: mmdb.Reader<mmdb.CityResponse> | null = null;
export const getReader = async (mmdbUrl?: string) => {
  if (reader) return reader;
  const db = await fetchFileAsBuffer(mmdbUrl ?? _mmdbUrl);
  if (!db) return;
  reader = new mmdb.Reader<mmdb.CityResponse>(db);

  return reader;
};

const cache = new Map<string, string>();
export const getGeoFromIp = async (ip: string) => {
  if (cache.has(ip)) return cache.get(ip);
  const r = await getReader();
  const result = r?.get(ip);
  const countryName = result?.country?.names;
  const geo = countryName?.["zh-CN"] ?? countryName?.en ?? "n/a";
  if (geo) {
    cache.set(ip, geo);
  }
  return geo;
};
