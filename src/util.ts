export const obj2Str = (obj: any) => {
  if (typeof obj === 'object') {
    const kvs = Object.keys(obj).map((key) => `${key}=${obj[key]}`);
    return kvs.join(',');
  }
  return obj;
};

export const getQuery = (url: string) => {
  const strs = url.split('?');
  const kv = strs[1].split('&');
  const query: any = {};
  kv.forEach((item) => {
    const [key, value] = item.split('=');
    query[key] = value;
  });
  return {
    url: strs[0],
    query,
  };
};
