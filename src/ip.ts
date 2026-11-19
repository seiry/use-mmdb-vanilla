const IPV4_OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`^${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}$`);
const IPV4_MAPPED = new RegExp(
  `^::ffff:(${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3})$`,
  "i",
);
const IPV6_CHARS = /^[0-9a-fA-F:.]+$/;

const isValidIpv6 = (ip: string) => {
  if (!ip.includes(":") || !IPV6_CHARS.test(ip)) return false;
  try {
    new URL(`http://[${ip}]/`);
    return true;
  } catch {
    return false;
  }
};

export const isValidIp = (ip: string) => IPV4.test(ip) || isValidIpv6(ip);

export const normalizeIp = (ip: string) => {
  const trimmed = ip.trim();
  return IPV4_MAPPED.exec(trimmed)?.[1] ?? trimmed;
};
