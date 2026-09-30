# Selenium browser journey

This folder contains the [user story](USER_STORY.md) and a browser test for account creation, set creation, saved Learn progress, and an on-demand new round. The test uses Selenium WebDriver with Chrome. It interacts with buttons and fields in the app, just like a person using the site; it does not write directly to Firebase or either database.

## Run locally

1. Start Docker Desktop. In the inner `Flasharo` repository, run `pnpm db:up` and `pnpm db:migrate` if needed.
2. Keep `pnpm dev` running in another terminal. Wait for the web app (port 3000), API (3001), Auth emulator (9099), and Firestore emulator (8080).
3. Install Python 3 and the test dependency: `py -m pip install -r Test_Automation/requirements.txt`.
4. Run `pnpm test:selenium` or `py -m unittest discover -s Test_Automation -p test_*.py -v`.

Chrome must be installed. Selenium Manager locates or downloads a matching ChromeDriver when needed, so the first run may need internet access. Set `$env:FLASHARO_HEADLESS = "0"` before running to watch the browser. By default it runs headless. Set `$env:FLASHARO_BASE_URL = "http://localhost:3000"` if the web app uses another URL.

Each run creates a new local Firebase emulator account and set. The script prints the account email; the test password is a fixed dummy value used only with the local emulator. These records remain in your local emulator and PostgreSQL data so you can inspect them. Screenshots from failed browser runs are saved in the ignored `Test_Automation/artifacts` folder.

If the preflight check fails, start the missing service and rerun. If ChromeDriver is unavailable, install a driver matching your Chrome version or run the test once with internet access for Selenium Manager.
