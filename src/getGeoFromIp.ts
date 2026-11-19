import * as mmdb from "mmdb.js";
import { isValidIp, normalizeIp } from "./ip";
import { fetchFileAsBuffer } from "./utils";

export const _mmdbUrl =
  "https://raw.githubusercontent.com/Max-Sum/17mon-mmdb/release/Country.mmdb";

const NOT_AVAILABLE = "n/a";

type CountryReader = mmdb.Reader<mmdb.CountryResponse>;

const readers = new Map<string, Promise<CountryReader | undefined>>();

const loadReader = async (mmdbUrl: string) => {
  try {
    const db = await fetchFileAsBuffer(mmdbUrl);
    if (!db) return undefined;
    return new mmdb.Reader<mmdb.CountryResponse>(db);
  } catch (error) {
    console.error("Loading mmdb failed:", error);
    return undefined;
  }
};

export const getReader = (mmdbUrl: string = _mmdbUrl) => {
  const cached = readers.get(mmdbUrl);
  if (cached) return cached;

  const loading = loadReader(mmdbUrl).then((reader) => {
    if (!reader && readers.get(mmdbUrl) === loading) readers.delete(mmdbUrl);
    return reader;
  });
  readers.set(mmdbUrl, loading);
  return loading;
};

export const getGeoFromIp = async (
  rawIp: string,
  mmdbUrl: string = _mmdbUrl,
): Promise<string> => {
  const ip = normalizeIp(rawIp);
  if (!isValidIp(ip)) return NOT_AVAILABLE;

  const reader = await getReader(mmdbUrl);
  if (!reader) return NOT_AVAILABLE;

  try {
    const names = reader.get(ip)?.country?.names;
    return names?.["zh-CN"] ?? names?.en ?? NOT_AVAILABLE;
  } catch {
    return NOT_AVAILABLE;
  }
};
