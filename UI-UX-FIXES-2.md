# UI and UX Fixes and polishing
## Fixes
- connections table currently shows a connection in the order that it is made, e.g. if one wall port endpoint is connected endpoint > patch panel the wall port will be endpoint A in connections table, if the next wall port is connected patch panel > wall port endpoint then the patch panel will be endpoint A - this makes it confusing when looking at the table, i think we need to use a hieracy - we tried this before and is written in agents.md onder `Connections Table Ordering:` but doesn't seem to have had the right effect.
- need to have multiple "endpoints" for connections - sometimes/often a camera, AP, etc will not be hard wired back to a patch panel, but will connect to a wall port. When, for example an AP is plugged into a wall port (front) I am then unable to create another connection, clicking edit on the wall port endpoint opens modal for the ap, therefore i am unable to connect the back slot of the wall panel to the patch panel
- a new bug has emerged since last batch of changes - when connecting a patch panel to an endpoint, the endpoint (e.g wall panel, camera, etc) is uneditable, selecting the edit button next to the endpoint opens modal to edit the patch panel port. This means i can not connect, for example, something to the front port of wall panel
- in trace, if 2 endpoints are in the connection, trace will only show 1 of them
- making a cross site/rack connection, right hand side bar is correctly collapsed. However, once the connection is completed it reloads the split view with the connections table expanded in left pane - in split view the left and right side bars should always be collapsed by default
- when creating a cross site/rack connection, once the connection is completed the close button does not work (it does work when using split view normally)


## New Features/Design Changes
- When mounting device in rack, if an "endpoint" device is selected, the modal should omit or block entry of "Rack unit position"
- When selcting a device port in the rack view, if there is only a rear connection the port does not highlight in this view - this should have same behaviour as when a front port is present
- editing or creating an endpoint, when finished - the right side bar reloads the connections tab - the tab should stay where it last was
- "back" ports/connections should be removed from every device, except wall panels and patch panels as these are realisticaly the only devices that have rear connections. However it may be worth having an overide when creating templates for other device types (if any fringe cases arise)
- when setting a device template height, it does not take up the appropriate space when in a rack. e.g. adding a 4u height device in U1 of a rack only takes up U1 in the rack view - it should take up U1 -> U4
- devices in rack, U height should be consistent, e.g a 1U height patch panel should appear the same height as a 1U switch in the rack view. As in real life this is a standardised size. The largest a 1U device will be a switch with 2 rows of ports and group labelling, etc, we can use this as a baseline 1U height, 2U, 3U, 4U devices can scale accordingly.
- rack view empty U's should have 1U spacing height as above point

## Issues
- review and complete issue 7 in gihub repo
- review issue 5 in github repo, we do not need cable labelling but an export to csv function for both devices and full racks would be useful. We can then work on QR and mobile
