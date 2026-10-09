/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2527524235")

  // update field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "select3785202386",
    "maxSelect": 1,
    "name": "service",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "sanger",
      "plasmid",
      "rnaseq",
      "amplicon",
      "ic50",
      "screen",
      "viability",
      "reporter",
      "immunoonc"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2527524235")

  // update field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "select3785202386",
    "maxSelect": 1,
    "name": "service",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "sanger",
      "plasmid",
      "rnaseq",
      "ic50",
      "viability",
      "reporter",
      "immunoonc"
    ]
  }))

  return app.save(collection)
})
