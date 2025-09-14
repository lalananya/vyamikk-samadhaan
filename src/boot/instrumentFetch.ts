const origFetch = global.fetch;
global.fetch = async (input: any, init?: any) => {
  const start = Date.now();
  try {
    const res = await origFetch(input, init);
    if (__DEV__)
      console.log(
        "[HTTP]",
        init?.method || "GET",
        input,
        res.status,
        Date.now() - start + "ms",
      );
    return res;
  } catch (e: any) {
    if (__DEV__)
      console.log("[HTTP-ERR]", init?.method || "GET", input, e?.message || e);
    throw e;
  }
};
