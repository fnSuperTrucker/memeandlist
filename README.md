How to Load an Unpacked Browser Extension
Follow these steps to add the extension to your browser. You’ll need the extension files (which you can download from the GitHub page as a ZIP file). No special programs are needed—just your browser!
Step 1: Download the Files
Go to the GitHub page where the extension files are hosted (e.g., [insert your GitHub link here]).

Look for a green button labeled "Code" and click it.

Choose "Download ZIP" to save the files to your computer.

Once downloaded, find the ZIP file (usually in your Downloads folder) and double-click it to unzip it. This will create a new folder with the extension files.

Step 2: Open Your Browser’s Extension Settings
For Google Chrome:
Open Chrome.

Click the three dots in the top-right corner (menu).

Go to "Extensions" > "Manage Extensions" (or type chrome://extensions/ in the address bar and press Enter).

For Microsoft Edge:
Open Edge.

Click the three dots in the top-right corner.

Go to "Extensions" (or type edge://extensions/ in the address bar and press Enter).

For Firefox:
Open Firefox.

Click the three lines in the top-right corner.

Go to "Add-ons and Themes" (or type about:addons in the address bar and press Enter).

Step 3: Load the Extension
For Chrome or Edge:
Turn on "Developer mode" (toggle switch in the top-right corner).

Click the "Load unpacked" button that appears.

A file explorer window will pop up. Find the folder you unzipped earlier (it should contain files like manifest.json), select it, and click "Open" or "Select Folder."

The extension should now appear in your browser!

For Firefox:
In the "Add-ons and Themes" page, click the gear icon at the top and choose "Debug Add-ons" (or type about:debugging#/runtime/this-firefox in the address bar).

Click "Load Temporary Add-on."

In the file explorer, navigate to the unzipped folder, select the manifest.json file, and click "Open."

The extension will load (note: in Firefox, it’s temporary and will disappear when you restart the browser unless it’s officially published).

Step 4: Test It Out
The extension should now be active! Look for its icon in your browser toolbar (you might need to pin it in Chrome/Edge by clicking the puzzle piece icon and selecting the pin).

If it doesn’t work, double-check that you selected the right folder with the manifest.json file.

Notes for Users
Keep the unzipped folder on your computer—don’t delete it, or the extension might stop working.
