export function isGoogleSignInAvailable(): boolean {
  const hostname = window.location.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return true;
  }

  // IPv4 address
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );

  if (ipv4Match) {
    const octets: number[] = ipv4Match.slice(1).map(Number);

    if (octets.length !== 4 || octets.some((octet) => octet > 255)) {
      return false;
    }

    const [a, b] = octets;

    if (a === undefined || b === undefined) {
      return false;
    }

    // Private IPv4 ranges
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return false;
    }

    return true;
  }

  // IPv6 loopback and local addresses
  if (hostname === "::1" || hostname.endsWith(".local")) {
    return false;
  }

  return true;
}
