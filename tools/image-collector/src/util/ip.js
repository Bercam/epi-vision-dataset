import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'instance-data',
]);

const IPV4_BLOCKED_RANGES = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(address) {
  const parts = address.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isBlockedIpv4(address) {
  const value = ipv4ToInt(address);
  if (value === null) {
    return true;
  }
  for (const [range, bits] of IPV4_BLOCKED_RANGES) {
    const base = ipv4ToInt(range);
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) === (base & mask)) {
      return true;
    }
  }
  return false;
}

function expandIpv6(address) {
  let value = address.toLowerCase();
  const zoneIndex = value.indexOf('%');
  if (zoneIndex !== -1) {
    value = value.slice(0, zoneIndex);
  }

  if (value.includes('.')) {
    const lastColon = value.lastIndexOf(':');
    const ipv4 = value.slice(lastColon + 1);
    const ipv4Value = ipv4ToInt(ipv4);
    if (ipv4Value === null) {
      return null;
    }
    const high = (ipv4Value >>> 16).toString(16);
    const low = (ipv4Value & 0xffff).toString(16);
    value = `${value.slice(0, lastColon)}:${high}:${low}`;
  }

  const halves = value.split('::');
  if (halves.length > 2) {
    return null;
  }
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 && missing !== 0) {
    return null;
  }
  if (halves.length === 2 && missing < 0) {
    return null;
  }
  const groups = [...head, ...Array(Math.max(0, missing)).fill('0'), ...tail];
  if (groups.length !== 8) {
    return null;
  }
  const parsed = groups.map((group) => Number.parseInt(group || '0', 16));
  if (parsed.some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) {
    return null;
  }
  return parsed;
}

function isBlockedIpv6(address) {
  const groups = expandIpv6(address);
  if (!groups) {
    return true;
  }

  const allZero = groups.every((group) => group === 0);
  if (allZero) {
    return true;
  }
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) {
    return true;
  }
  if ((groups[0] & 0xfe00) === 0xfc00) {
    return true;
  }
  if ((groups[0] & 0xffc0) === 0xfe80) {
    return true;
  }
  if ((groups[0] & 0xff00) === 0xff00) {
    return true;
  }
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) {
    return true;
  }
  if (groups[0] === 0x2001 && groups[1] === 0x0000) {
    return true;
  }
  if (groups[0] === 0x2002) {
    return true;
  }

  const isMapped = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  const isCompatible = groups.slice(0, 6).every((group) => group === 0);
  const isNat64 = groups[0] === 0x0064 && groups[1] === 0xff9b && groups.slice(2, 6).every((group) => group === 0);
  if (isMapped || isCompatible || isNat64) {
    const ipv4 = `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
    return isBlockedIpv4(ipv4);
  }

  return false;
}

export function isPrivateIp(address) {
  const version = net.isIP(address);
  if (version === 4) {
    return isBlockedIpv4(address);
  }
  if (version === 6) {
    return isBlockedIpv6(address);
  }
  return true;
}

export function isBlockedHostname(hostname) {
  const host = String(hostname ?? '').toLowerCase().replace(/\.$/, '');
  if (!host) {
    return true;
  }
  if (BLOCKED_HOSTNAMES.has(host)) {
    return true;
  }
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  return false;
}
