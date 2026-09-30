"""A real-browser version of USER_STORY.md using Selenium WebDriver."""

import os
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4

from selenium import webdriver
from selenium.common.exceptions import ElementClickInterceptedException, ElementNotInteractableException, StaleElementReferenceException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = os.getenv("FLASHARO_BASE_URL", "http://localhost:3000").rstrip("/")
SERVICES = {
    "web app": BASE_URL,
    "API": os.getenv("FLASHARO_API_URL", "http://localhost:3001").rstrip("/") + "/health",
    "Auth emulator": os.getenv("FLASHARO_AUTH_EMULATOR_URL", "http://127.0.0.1:9099"),
    "Firestore emulator": os.getenv("FLASHARO_FIRESTORE_EMULATOR_URL", "http://127.0.0.1:8080"),
}
TIMEOUT = 20


def require_services():
    """Fail early with an actionable message instead of a browser timeout."""
    missing = []
    for name, url in SERVICES.items():
        try:
            with urllib.request.urlopen(url, timeout=3):
                pass
        except urllib.error.HTTPError as error:
            # An emulator may return 404 at its root while still being ready.
            if name in ("web app", "API") or error.code >= 500:
                missing.append(f"{name} ({url}): HTTP {error.code}")
        except (urllib.error.URLError, TimeoutError) as error:
            missing.append(f"{name} ({url}): {error}")
    if missing:
        raise AssertionError("Start `pnpm dev` and Docker before Selenium:\n" + "\n".join(missing))


class LearnJourney(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        require_services()

    def setUp(self):
        options = Options()
        options.add_argument("--window-size=1440,1000")
        if os.getenv("FLASHARO_HEADLESS", "1") != "0":
            options.add_argument("--headless=new")
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, TIMEOUT)
        self.email = f"selenium-{int(time.time())}-{uuid4().hex[:6]}@example.com"
        self.password = "learning123"  # Dummy credential for the local Auth emulator.

    def tearDown(self):
        self.driver.quit()

    def visible(self, selector):
        return self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))

    def heading(self, text):
        return self.wait.until(EC.visibility_of_element_located((
            By.XPATH, f"//h1[normalize-space(.)='{text}'] | //h2[normalize-space(.)='{text}']"
        )))

    def click_locator(self, locator):
        """Keep the target in the middle of the viewport before a real click."""
        def try_click(driver):
            element = driver.find_element(*locator)
            try:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
                element.click()
                return True
            except (ElementClickInterceptedException, ElementNotInteractableException, StaleElementReferenceException):
                return False

        self.wait.until(try_click)

    def click(self, text):
        self.click_locator((By.XPATH, f"//button[normalize-space(.)='{text}']"))

    def fill(self, selector, value):
        field = self.visible(selector)
        field.clear()
        field.send_keys(value)

    def stage(self, label):
        # CSS displays this label in uppercase; textContent keeps the source text.
        self.wait.until(lambda driver: driver.find_element(
            By.CSS_SELECTOR, ".learn-question-top .section-kicker"
        ).get_property("textContent").strip() == label)

    def answer_choice(self, definition):
        self.click_locator((By.XPATH, f"//div[contains(@class,'learn-options')]/button[normalize-space(.)='{definition}']"))
        self.visible(".learn-feedback.is-correct")

    def test_new_learner_completes_saved_learn_session(self):
        print(f"\nLocal test account: {self.email}")
        try:
            # 1. Sign up. Firebase Auth creates the credential; the API syncs the profile.
            self.driver.get(BASE_URL + "/signup")
            self.fill("input[type='email']", self.email)
            self.fill("input[type='password']", self.password)
            self.click("Create account")
            self.heading("My study sets")

            # 2. Create a private set through the library UI.
            self.click("+ Create a set")
            self.fill("input[placeholder='e.g. Spanish food vocabulary']", "Planet facts")
            self.click("Create set")
            self.heading("Planet facts")
            set_url = self.driver.current_url

            # 3. Add two cards. Two distinct definitions are needed for multiple choice.
            for term, definition in (
                ("Earth", "Third planet from the Sun"),
                ("Mars", "Fourth planet from the Sun"),
            ):
                self.fill("textarea[placeholder='What do you want to remember?']", term)
                self.fill("textarea[placeholder='Write the answer in your own words']", definition)
                self.click("Add card")
                self.wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, ".editor-card-list"), definition))
            cards = self.driver.find_elements(By.CSS_SELECTOR, ".editor-card .card-pair")
            self.assertIn("Earth", cards[0].text)
            self.assertIn("Mars", cards[1].text)

            # 4–6. A correct choice unlocks writing, even after a full reload.
            self.click_locator((By.LINK_TEXT, "Learn mode"))
            self.heading("Earth")
            self.stage("Step 1 / Choose")
            self.answer_choice("Third planet from the Sun")
            self.click("Type the answer")
            self.driver.refresh()
            self.heading("Earth")
            self.stage("Step 2 / Write")

            # 7. Written grading ignores capitalization, then moves to the next card.
            self.fill("#learn-answer", "third planet from the sun")
            self.click("Check answer")
            self.visible(".learn-feedback.is-correct")
            self.assertIn("card learned", self.driver.find_element(By.CSS_SELECTOR, ".learn-feedback").text)
            self.click("Next card")
            self.heading("Mars")
            self.stage("Step 1 / Choose")

            # 8. Finish the second card and verify the completion state.
            self.answer_choice("Fourth planet from the Sun")
            self.click("Type the answer")
            self.fill("#learn-answer", "Fourth planet from the Sun")
            self.click("Check answer")
            self.click("Next card")
            self.heading("You learned every card!")
            self.assertIn("2 of 2 learned", self.visible(".study-progress").text)

            # 9. Progress belongs to this account and survives reload and a new login.
            self.driver.refresh()
            self.heading("You learned every card!")
            self.click("Log out")
            self.wait.until(EC.visibility_of_element_located((By.LINK_TEXT, "Get started")))
            self.driver.get(BASE_URL + "/login")
            self.fill("input[type='email']", self.email)
            self.fill("input[type='password']", self.password)
            self.click("Log in")
            self.heading("My study sets")
            self.driver.get(set_url + "/learn")
            self.heading("You learned every card!")
            self.assertIn("2 of 2 learned", self.visible(".study-progress").text)

            # 10. A new round is always available, with no date or timer to wait for.
            self.click("Study again")
            self.heading("Earth")
            self.stage("Step 1 / Choose")
            self.assertIn("0 of 2 learned", self.visible(".study-progress").text)
        except Exception:
            artifacts = Path(__file__).with_name("artifacts")
            artifacts.mkdir(exist_ok=True)
            screenshot = artifacts / f"learn-failure-{int(time.time())}.png"
            try:
                self.driver.save_screenshot(str(screenshot))
                print(f"Browser screenshot: {screenshot}")
            except Exception:
                pass
            raise


if __name__ == "__main__":
    unittest.main()
