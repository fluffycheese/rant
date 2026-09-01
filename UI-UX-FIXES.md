# UI and UX Fixes and polishing
## Fixes
1. See repo [issue #8](https://github.com/fluffycheese/rant/issues/8) Rack screen: hovering over the right-side port/cable table causes constant scroll jumping - it effects any connections from endpoints table
2. Selecting back connections in connections table do not highlight the port in device view, nor does selecting a port with only a back connection highlight in the connections table
3. Hovering over a connection has 2 hovering behaviours, one in theme/styled and appears immedietly, second is unstyled and appears after short wait. Remove the second one
4. Mouse hover should show labels
5. Split view should show hybrid with both sidebars (see 4. in New Features/Design Changes below) collapsed
6. Currently adding connections - the order in connections is based on order of creation, this needs an order to it. Perhaps alphabetical by Endpoint A, then by lowest port position number, then connection front > back
7. Connections in the table are written in direction the connection was made, which makes it difficult to scan through e.g: 
sw01
Port 5
Front
pp01
Port 3
Front
cat6	—	🔗🗑
pp01
Port 5
Front
sw01
Port 19
Front
cat6	—	🔗🗑 
needs consistency. Perhaps hieracy based on category. e.g patch_panel is highest, so any connections to patch panel appear with patch_panel in Endpoint A. I think probably patch_panel > switch > firewall > router > server. Then similar for endpoint hierarchy
8. filter when cross site/cross rack only works on the local connection. e.g. test2 / rack2 / pp02 - only pp02 works in filter

## New Features/Design Changes
1. See repo [issue #4](https://github.com/fluffycheese/rant/issues/4) - Feature: End-to-end cable tracing workflow
2. With large amounts of connections the connections table in hybrid view becomes far too big. Perhaps limit the the viewable table to 10 lines and scroll function, same for endpoints table
3. Lots of whitespace around rack and tables in hybrid view on wide screens, should have as much rack diagram visible to fill space and to see full width/as much as possible of devices where viewable are allows
4. remove rack elevation view, as alternative, connections and endpoint tables should be collapsible. Perhaps the connections and endpoints tables should be in their own right side menu so collapsible fuction is for sidebar
5. make left sidebar collapsible
6. When in split view when clicking a port or connection in table should show the relevant cross site connections highlighted
7. given the click and create nature of the app, i don't think the `+ Add Link` button in the connections table is needed
8. I have added logos in assets/img - `primary-horizontal` is the full logo (icon followed by text horizontaly), good for login screen, repo readme, anywhere size is not a contraint. `primary-stacked` is the icon with text below, good where a narrower sized full logo is needed (perhaps the left side menu). Icon is icon only (no text) good for gihub repo icon. Also I have included favicons. These logos need to be incorporated to the app as neccessary.
9. With the icon design, some of the colour palette needs updating to match #0F172A is the primary icon and text in the logo. #3BB2F6 is the secondary logo colour for accents. #06B6D4 #10B981 #F59E0B are all used sparingly in icon. Other colours that fit well with this palette #64748B #E2E8F0 #F8FAFC. We need to update the colours throughout the app to incorporate these colours and ensure contrast to ensure logo, given it's colours are visible

