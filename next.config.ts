import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The standalone build's file trace is static analysis of JS imports — it
  // can't see sharp's native .node binding or the libvips .so it dlopen()s
  // at runtime, so both get silently dropped from the pruned output unless
  // named here explicitly. Hit in production: sharp's own top-level package
  // was traced (JS-visible) but its native library wasn't, while Next's own
  // internal, differently-versioned sharp copy (next/node_modules/sharp,
  // used for <Image> optimization) was unaffected since Next traces its own
  // dependency itself.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@img/**/*"],
  },
};

export default nextConfig;
