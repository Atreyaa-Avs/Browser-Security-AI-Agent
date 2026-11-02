const urls = [
  "https://ui.shadcn.com/r/colors/neutral.json",
  "https://ui.shadcn.com/r/themes/neutral.json",
];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u);
      const t = await r.text();
      console.log("=== " + u + " -> " + r.status);
      console.log(t.slice(0, 6000));
    } catch (e) {
      console.log("ERR " + u + " " + e.message);
    }
  }
})();
