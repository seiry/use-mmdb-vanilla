const IPV4_OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`^${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}$`);
const IPV6_CHARS = /^[0-9a-fA-F:.]+$/;
const SERIALIZED_IPV4_MAPPED = /^\[::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})\]$/;

const toDottedQuad = (high: string, low: string) => {
  const value = (Number.parseInt(high, 16) << 16) | Number.parseInt(low, 16);
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join(".");
};

const parseIpv6 = (ip: string) => {
  if (!ip.includes(":") || !IPV6_CHARS.test(ip)) return undefined;
  try {
    const { hostname } = new URL(`http://[${ip}]/`);
    const mapped = SERIALIZED_IPV4_MAPPED.exec(hostname);
    return mapped ? toDottedQuad(mapped[1], mapped[2]) : ip;
  } catch {
    return undefined;
  }
};

export const parseIp = (input: unknown) => {
  if (typeof input !== "string") return undefined;
  const ip = input.trim();
  return IPV4.test(ip) ? ip : parseIpv6(ip);
};
