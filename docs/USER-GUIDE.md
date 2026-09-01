# 🔌 RANT (Rack And Networking Tool) User Guide

Welcome to RANT! This tool is designed to make mapping out your network racks as fast and frictionless as doing it in the real world. 

There are no massive forms to fill out or complex drawing canvases. Everything is designed to be click-and-go.

---

## 🚀 The Basics: Wiring your first switch

Here is the absolute fastest way to get your first rack mapped and patched.

### 1. Create a Site and Rack
1. Look at the left-hand sidebar and click **+ site**. Give it a name (e.g., "London HQ").
2. Expand your new site using the tiny arrow next to it.
3. Click **+ rack** under your site to create a new physical cabinet (e.g., "Comms Rack 1").

### 2. Add or Mount a Device
1. Devices can be mounted in a Rack or placed directly at a Site (e.g., wall ports).
2. Navigate to your new rack. You will see an empty 19" cabinet.
3. Click the **+ Mount Device** button (or click an empty U-slot).
4. Select a device from your templates (e.g., a 24-port switch or a patch panel). 
5. Pick the **U-slot** where it physically sits in the cabinet.

> [!TIP]
> **Editing Devices:** Click the `✏️` icon on any mounted device to rename it, change its color, modify its U-position, or customize individual port labels and connector types (e.g., changing port 24 to SFP+) without altering the master template!

### 3. Patch a Cable
This is where RANT shines. You do not need to navigate to a complex "Cable Management" page.
1. In your rack diagram, find an **empty port** on your device and **click it**.
2. A banner will appear at the top of the screen: *"Patching from..."*
3. Simply **click the destination port** on any other device in the rack.
4. A small popup will appear asking for the cable colour and type. Hit **Save**.

Your ports will immediately light up with the chosen cable colour!

### 4. Import Device Templates (JSON)
Creating complex device layouts (like a 48-port switch with stacked rows and dedicated uplink ports) can take time. Instead of building them from scratch, you can import them instantly!

1. Go to the **Templates** page from the main navigation.
2. Click the **📥 Import JSON** button.
3. Paste a template JSON snippet to instantly create the device profile.

> [!TIP]
> **Where to find templates?** We maintain a community library of templates right inside the RANT repository! Check the `templates/` folder on GitHub (e.g., `templates/dell`, `templates/cisco`) to find the exact hardware you own, then copy and paste the JSON into your app. If you've created a custom template for a device we don't have, use the **Export (📋)** button to grab the JSON and submit a Pull Request to share it!

### 5. Working with Endpoints (WiFi APs, Cameras, etc.)
Not every device sits inside a standard 19" rack slot. Devices categorized as `wifi_ap`, `ip_camera`, or `wall_panel` are treated as **Endpoints**.
1. When you mount an endpoint device to a rack, it will *not* take up a physical U-slot in the visual cabinet.
2. Instead, it appears in a dedicated **Endpoints Table** in the right panel.
3. You can wire up endpoints quickly right from the table using the `🔗` button next to their port!

---

## ⚡ Power-User Workflows

Once you master basic patching, you can start using RANT to map complex, multi-site network topologies.

### ↯ Cable Tracing
RANT can trace the complete physical path of a cable from one endpoint to the other, automatically walking through patch panels.

1. **From a port:** Hover over any connected port on a device card. A popup appears showing the front/back connections — click the **↯ Trace** button.
2. **From a table:** Click the **↯** button on any row in the Connections or Endpoints tables.
3. The **Trace tab** opens in the right panel showing the full chain — from one physical endpoint to the other — regardless of where in the chain you clicked.
4. Each hop shows the device, port, slot, and cable type. Click any hop card to **highlight that specific cable link** in the rack grid.
5. If a hop crosses to another rack, click **→ Open rack** to navigate there. If it crosses sites, click **⇄ Split view** to open both racks side by side.

> [!TIP]
> You can trace from the middle of a chain (e.g., click a patch panel port) and RANT will still show you the complete path from the AP at one end to the switch at the other.

### Editing and Removing Cables
If you patch a cable to the wrong port, don't try to edit the endpoints—just like in the real world, you should unplug it and run a new one.
* **To unplug:** Click any connected port and hit the **Disconnect** button.
* **To change labels/colours:** Click a connected port and hit the **Edit (pencil)** icon to update the cable's metadata.

### 🌎 Cross-Site Patching
You can patch a cable from a switch in London directly to a router in Paris.
1. Click an empty port in your London rack to start patching.
2. Instead of clicking another port in the same rack, **click your Paris rack in the left sidebar (or use the ↯ Trace panel for an existing cross-site link)**.
3. RANT will instantly snap into **Split View**, loading Paris side-by-side with London.
4. Click the destination port in the Paris rack to complete the WAN link.

> [!NOTE]
> Cross-site connections will automatically display the full `Site / Rack / Device` path in your connections table so you never lose track of where a cable terminates.

### 🔄 The "Make Primary" Pivot
When you are manually comparing two racks in **Split View**, your browser's URL is always anchored to the rack on the *left*. 

If you want to pivot your view (for example, you are comparing Rack A to Rack B, and now you want to compare Rack B to Rack C):
1. Look at the toolbar above the right-hand rack (Rack B).
2. Click the **⬅️ Make Primary** button.
3. Rack B will instantly slide to the left side of your screen (updating your browser URL).
4. You can now click Rack C in the sidebar to open it on the right.

### 🕸️ Interactive Topology Filtering
RANT automatically generates beautiful, static topology maps of your network.
* **Site Topology:** Expand a Site in the sidebar and click **🕸️ Topology** to see how all the racks in that building are physically chained together.
* **Global Topology:** Click **🕸️ Global Topology** in the sidebar to see a master table of every cross-site (WAN) link in your entire organisation, topped with a macro Site-to-Site diagram.

> [!TIP]
> **Click the nodes!** When viewing a topology diagram, click any Rack or Site box. The data table underneath will instantly filter to show *only* the cables connected to that specific node. Click the row in the table to jump straight into a Split View of those two racks!

---

## 📚 Glossary

<details>
<summary><strong>What is a Template vs a Device?</strong></summary>
A <b>Device Template</b> is a blueprint (e.g., "Cisco 24-Port Switch"). When you mount it in a rack, RANT creates a unique <b>Device</b> instance. Changing the master template later will not magically add ports to devices you've already mounted.
</details>

<details>
<summary><strong>Front vs Back Slots</strong></summary>
Every port in RANT has two physical slots: <code>Front</code> and <code>Back</code>. 
<br><br>
This is crucial for patch panels. The <code>Back</code> slot is typically used for the permanent structured cabling hidden in the walls, while the <code>Front</code> slot is used for the temporary patch leads you plug into the switch.
</details>

<details>
<summary><strong>The Right Panel (Connections / Endpoints / Trace)</strong></summary>
The right panel in the Rack View has three tabs: <b>Connections</b> (all cable links), <b>Endpoints</b> (WiFi APs, cameras, wall panels), and <b>↯ Trace</b> (appears when a trace is active). The panel can be collapsed to a slim strip, expanded to 360px, or further expanded to a full 680px overlay that floats over the rack grid.
</details>

- **Users (Admin)**: Navigate to `👥 Users (Admin)` in the sidebar footer to create team accounts, change passwords, and manage access (when built-in authentication is active).

