import dns from 'node:dns';

const { Resolver, lookup: originalLookup } = dns;
const customResolver = new Resolver();
customResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

// Wrap dns.lookup with fallback to customResolver if system resolver encounters ENOTFOUND / EAI_AGAIN
// @ts-expect-error Monkey patching dns.lookup for reliable database resolution
dns.lookup = function (
  hostname: string,
  options: dns.LookupOptions | ((err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void),
  callback?: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void
) {
  let cb = callback;
  let opts: dns.LookupOptions = {};

  if (typeof options === 'function') {
    cb = options;
    opts = {};
  } else if (options) {
    opts = options;
  }

  originalLookup(hostname, opts, (err, address, family) => {
    if (err && (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN' || err.code === 'ETIMEOUT')) {
      customResolver.resolve4(hostname, (rErr, addresses) => {
        if (rErr || !addresses || addresses.length === 0) {
          return cb?.(err, '' as any, family);
        }
        if (opts && opts.all) {
          return cb?.(null, addresses.map((a) => ({ address: a, family: 4 })));
        }
        return cb?.(null, addresses[0], 4);
      });
    } else {
      return cb?.(err, address, family);
    }
  });
};
