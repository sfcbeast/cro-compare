/// <reference path="../pb_data/types.d.ts" />
// Anonymous feedback: anyone can submit, only the admin can read it.
migrate((app) => {
  const c = new Collection({
    type: "base",
    name: "feedback",
    listRule: null,
    viewRule: null,
    updateRule: null,
    deleteRule: null,
    createRule: "@request.body.message != ''",
    fields: [
      { type: "select", name: "kind", required: true, maxSelect: 1, values: ["price", "missing", "idea", "other"] },
      { type: "text", name: "service", max: 40 },
      { type: "text", name: "provider", max: 160 },
      { type: "text", name: "message", required: true, min: 3, max: 2000 },
      { type: "text", name: "contact", max: 200 },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true }
    ]
  });
  app.save(c);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("feedback"));
});
