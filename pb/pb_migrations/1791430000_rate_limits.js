/// <reference path="../pb_data/types.d.ts" />
// Limit anonymous writes: 10 creates per hour per IP.
migrate((app) => {
  const s = app.settings();
  s.rateLimits.enabled = true;
  s.rateLimits.rules = [
    { label: "*:create", maxRequests: 10, duration: 3600 },
    { label: "*:auth", maxRequests: 10, duration: 3 }
  ];
  app.save(s);
}, (app) => {
  const s = app.settings();
  s.rateLimits.enabled = false;
  app.save(s);
});
