# use-mmdb-vanilla

a simple lib, show ip geo, using mmdb file

[![npm version](https://badge.fury.io/js/use-mmdb-vanilla.svg)](https://www.npmjs.com/package/use-mmdb-vanilla) [![Publish](https://github.com/seiry/use-mmdb-vanilla/actions/workflows/publish.yml/badge.svg)](https://github.com/seiry/use-mmdb-vanilla/actions/workflows/publish.yml)

https://www.npmjs.com/package/use-mmdb-vanilla


## browser version
```
https://cdn.jsdelivr.net/npm/use-mmdb-vanilla/dist/index.umd.js
```

## usage


### in browser
```html
<script src="https://cdn.jsdelivr.net/npm/use-mmdb-vanilla/dist/index.umd.js"></script>
<div id="raw"></div>
<script async>
  const ip = "112.238.182.153";
  getGeoFromIp(ip).then((geo) => {
    document.getElementById("raw").innerText = `${ip}: ${geo}`;
  });
</script>
```

### in js project
```ts
import { getGeoFromIp } from "use-mmdb-vanilla";
getGeoFromIp(ip).then(()=>{

});

```

Works in Node as well, with ESM `import` and CommonJS `require("use-mmdb-vanilla")`.

### custom database
`getGeoFromIp(ip, mmdbUrl?)` takes an optional URL of a country `.mmdb` file. Each URL is downloaded once and its database is kept in memory; omit it to use the default database.

The IP may be IPv4, IPv6 or IPv4-mapped IPv6 (`::ffff:1.2.3.4`).

```ts
getGeoFromIp(ip, "https://example.com/Country.mmdb").then((geo) => {
  // zh-CN name, else en name, else "n/a"
});
```
