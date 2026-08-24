# RANT Device Templates

RANT allows you to import and export Device Templates as JSON snippets. This makes it easy to share complex device layouts (like 48-port switches with mixed port types and custom groupings) without having to manually recreate them in the UI.

## The JSON Format

A template JSON object represents a `DeviceTemplate`. Here is the structure:

```json
{
  "name": "N3048EP-ON",
  "category": "switch",
  "manufacturer": "Dell",
  "model": "N3048EP-ON",
  "uHeight": 1,
  "color": "#888888",
  "portLayout": [
    {
      "label": "1",
      "connectorType": "rj45",
      "position": 0,
      "groupName": "Access",
      "groupLayout": "double_row"
    }
  ]
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | The display name for the template. |
| `category` | string | **Yes** | Must be one of: `switch`, `patch_panel`, `router`, `server`, `wall_panel`, `other`. |
| `manufacturer` | string | No | The vendor/manufacturer (e.g., "Cisco"). |
| `model` | string | No | The specific model number. |
| `uHeight` | number | **Yes** | How many rack units (U) the device occupies (1-42). |
| `color` | string | **Yes** | A hex color code used for the UI badge (e.g., `#4a9eff`). |
| `portLayout` | array | **Yes** | An array of port definitions (see below). |

### Port Definition (`portLayout`)

Each object in the `portLayout` array represents a single physical port on the front panel of the device.

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | **Yes** | The port label (e.g., "1", "Te1/0/1", "OOB"). |
| `connectorType` | string | **Yes** | Supported: `rj45`, `sfp`, `sfp+`, `qsfp`, `lc`, `sc`, `other`. |
| `position` | number | **Yes** | The zero-indexed order of the port (0 to N-1). |
| `groupName` | string | No | Grouping label (e.g., "Management", "Uplink"). Ports with the same group name are rendered together in a distinct block. |
| `groupLayout` | string | No | Defines how the group renders visually. Valid values: `single_row`, `double_row`. |

## Advanced Layouts

The `groupName` and `groupLayout` properties are the key to building accurate representations of real-world hardware.

### Double Row Stacking
Most 24- or 48-port switches stack ports vertically (odds on top, evens on bottom). To achieve this in RANT, set `"groupLayout": "double_row"` on those ports. RANT will automatically flow them into a CSS grid that matches the physical hardware.

### Mixed Port Blocks
If a switch has 48 RJ45 ports followed by 4 SFP+ uplinks, you can visually separate them by using `groupName`. 

```json
  "portLayout": [
    {"label": "48", "connectorType": "rj45", "position": 47, "groupName": "Access", "groupLayout": "double_row"},
    {"label": "Te1/0/1", "connectorType": "sfp+", "position": 48, "groupName": "Uplink", "groupLayout": "single_row"}
  ]
```
When imported, RANT will render a distinct "Access" block and a distinct "Uplink" block on the device card.

## Sharing Templates

If you have created templates for common hardware, the best way to share them is to export the JSON and commit them to a community repository, or share them as GitHub Gists. Since RANT uses raw JSON, anyone can highlight your text, copy it, and paste it directly into their RANT instance.
