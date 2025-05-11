#!/usr/bin/env python3
"""
Browser Automation Script using Selenium

This script demonstrates how to automate web browsers using Python and Selenium with Firefox.
Before running this script, you need to install the required packages:

sudo apt install python3-selenium firefox-geckodriver

Or if using pip in a virtual environment:
pip install selenium
"""

from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
try:
    from webdriver_manager.firefox import GeckoDriverManager
    driver_manager_available = True
except ImportError:
    driver_manager_available = False
import time
import logging
import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class BrowserAutomation:
    """A class to handle browser automation tasks."""
    
    def __init__(self, headless=False):
        """Initialize the browser with options."""
        logger.info("Initializing browser automation...")
        
        # Set Firefox options
        firefox_options = Options()
        if headless:
            firefox_options.add_argument("--headless")  # Run in headless mode (no UI)
        
        # Initialize the driver
        try:
            if driver_manager_available:
                # Use webdriver-manager to download and manage GeckoDriver
                self.driver = webdriver.Firefox(
                    service=Service(GeckoDriverManager().install()),
                    options=firefox_options
                )
            else:
                # Use system GeckoDriver
                self.driver = webdriver.Firefox(options=firefox_options)
                
            logger.info("Browser initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            raise
            
    def navigate_to(self, url):
        """Navigate to a specific URL."""
        try:
            logger.info(f"Navigating to {url}")
            self.driver.get(url)
            return True
        except Exception as e:
            logger.error(f"Error navigating to {url}: {e}")
            return False
            
    def take_screenshot(self, filename="screenshot.png"):
        """Take a screenshot of the current page."""
        try:
            self.driver.save_screenshot(filename)
            logger.info(f"Screenshot saved as {filename}")
            return True
        except Exception as e:
            logger.error(f"Error taking screenshot: {e}")
            return False
            
    def search_google(self, query):
        """Search for a query on Google."""
        try:
            self.navigate_to("https://www.google.com")
            
            # Accept cookies if the dialog appears
            try:
                WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.ID, "L2AGLb"))
                ).click()
                logger.info("Accepted cookies")
            except TimeoutException:
                logger.info("No cookie acceptance needed")
                
            # Find the search input field and submit query
            search_box = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "q"))
            )
            search_box.clear()
            search_box.send_keys(query)
            search_box.send_keys(Keys.RETURN)
            logger.info(f"Searched for: {query}")
            
            # Wait for search results
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "search"))
            )
            logger.info("Search results loaded")
            return True
        except Exception as e:
            logger.error(f"Error during Google search: {e}")
            return False
            
    def extract_search_results(self, num_results=5):
        """Extract top search results from Google search page."""
        try:
            results = []
            elements = self.driver.find_elements(By.CSS_SELECTOR, "div.g")
            
            for i, element in enumerate(elements[:num_results], 1):
                try:
                    title = element.find_element(By.CSS_SELECTOR, "h3").text
                    link = element.find_element(By.CSS_SELECTOR, "a").get_attribute("href")
                    results.append({"title": title, "link": link})
                except:
                    continue
                    
            logger.info(f"Extracted {len(results)} search results")
            return results
        except Exception as e:
            logger.error(f"Error extracting search results: {e}")
            return []
            
    def fill_form(self, form_data):
        """Fill a form with the provided data.
        
        Args:
            form_data: Dict with keys as element selectors and values as input values
        """
        try:
            for selector, value in form_data.items():
                element = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                element.clear()
                element.send_keys(value)
                logger.info(f"Filled {selector} with value")
            return True
        except Exception as e:
            logger.error(f"Error filling form: {e}")
            return False
            
    def click_element(self, selector, wait_time=10):
        """Click an element on the page."""
        try:
            element = WebDriverWait(self.driver, wait_time).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
            )
            element.click()
            logger.info(f"Clicked element: {selector}")
            return True
        except Exception as e:
            logger.error(f"Error clicking element {selector}: {e}")
            return False
            
    def scroll_to_bottom(self):
        """Scroll to the bottom of the page."""
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        logger.info("Scrolled to bottom of page")
            
    def navigate_to_turboroute(self):
        """Navigate to the TurboRoute AI login page."""
        try:
            url = "https://th.turboroute.ai/#/login?redirect=%2Fhome"
            logger.info(f"Navigating to TurboRoute AI: {url}")
            self.driver.get(url)
            
            # Wait for the page to load completely
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "form"))
            )
            
            logger.info("TurboRoute AI login page loaded successfully")
            
            # Find username and password fields by their input names
            try:
                username_field = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.NAME, "account"))
                )
                password_field = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.NAME, "password"))
                )
                logger.info("Found login form fields with names 'account' and 'password'")
            except TimeoutException:
                logger.warning("Could not find login form fields by name")
                
            return True
        except Exception as e:
            logger.error(f"Error navigating to TurboRoute AI: {e}")
            return False
            
    def login_to_turboroute(self, username, password):
        """Login to TurboRoute AI with the provided credentials.
        
        Args:
            username: The username to use for login
            password: The password to use for login
        """
        try:
            # Find and fill the username field
            username_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "account"))
            )
            username_field.clear()
            username_field.send_keys(username)
            logger.info("Filled username field")
            
            # Find and fill the password field
            password_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "password"))
            )
            password_field.clear()
            password_field.send_keys(password)
            logger.info("Filled password field")
            
            # Try multiple methods to submit the login form
            logger.info("Attempting to submit login form...")
            
            # Method 1: Find and click the submit button using various selectors
            selectors = [
                "button[type='submit']",
                "input[type='submit']",
                "button.login-button",
                ".btn-login",
                ".login-btn",
                "form button",  # Generic form button
                ".submit-btn",
                "#submit",
                ".ant-btn",     # Ant Design button (common in React apps)
                "button:contains('Login')",  # Button with text "Login"
                "button:contains('Sign In')" # Button with text "Sign In"
            ]
            
            button_clicked = False
            
            # Try each selector
            for selector in selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        for element in elements:
                            try:
                                if element.is_displayed() and element.is_enabled():
                                    element.click()
                                    logger.info(f"Clicked button with selector: {selector}")
                                    button_clicked = True
                                    break
                            except:
                                continue
                    if button_clicked:
                        break
                except:
                    continue
            
            # Method 2: If button click failed, try submitting the form directly
            if not button_clicked:
                try:
                    logger.info("Button click failed, trying to submit form directly")
                    # Find the form and submit it
                    form = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.TAG_NAME, "form"))
                    )
                    form.submit()
                    button_clicked = True
                    logger.info("Submitted form directly")
                except:
                    logger.warning("Form submit failed")
            
            # Method 3: If both previous methods failed, try pressing Enter key in password field
            if not button_clicked:
                try:
                    logger.info("Trying to submit by pressing Enter in password field")
                    password_field.send_keys(Keys.RETURN)
                    button_clicked = True
                    logger.info("Pressed Enter key in password field")
                except:
                    logger.warning("Enter key submission failed")
            
            # Wait for login to complete (wait for URL to change or dashboard element to appear)
            try:
                WebDriverWait(self.driver, 15).until(
                    lambda driver: "login" not in driver.current_url or 
                    len(driver.find_elements(By.CSS_SELECTOR, ".dashboard, #dashboard, .home-page")) > 0
                )
                logger.info("Login appears to be successful")
                return True
            except TimeoutException:
                logger.warning("Login might have failed, timeout waiting for dashboard")
                return False
                
        except Exception as e:
            logger.error(f"Error during login: {e}")
            return False
            
    def navigate_to_waybill_list(self):
        """Navigate to the waybill-list page after login."""
        try:
            url = "https://th.turboroute.ai/#/waybill-manage/waybill-list"
            logger.info(f"Navigating to waybill-list page: {url}")
            self.driver.get(url)
            
            # Wait for the page to load completely
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "body"))
            )
            
            logger.info("Waybill list page loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error navigating to waybill list: {e}")
            return False
    
    def calculate_date_range(self):
        """Calculate the end date (today) and start date (60 days before today)."""
        # Set end_date to tomorrow
        today = datetime.datetime.now().date()
        end_date = today + datetime.timedelta(days=1)
        start_date = end_date - datetime.timedelta(days=58)
        
        # Format dates as specified: "DD-MM-YYYY HH:MM"
        # End date with today's date and time 00:00
        # Start date with date 60 days ago and time 23:59
        end_date_str = end_date.strftime("%d-%m-%Y 23:59")
        start_date_str = start_date.strftime("%d-%m-%Y 00:00")
        
        logger.info(f"Calculated date range: {start_date_str} to {end_date_str}")
        return start_date_str, end_date_str
    
    def fill_date_range_fields(self):
        """Find and fill the date range fields in waybill-list page."""
        try:
            # Get date range values
            start_date_str, end_date_str = self.calculate_date_range()
            
            # Wait for the page to load completely
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "form"))
            )
            
            logger.info("Looking for date input fields using multiple approaches...")
            
            # Added delay to ensure the page is fully rendered
            time.sleep(3)
            
            # Try multiple approaches to find and interact with date fields
            
            # Approach 1: Try to find and click on the date picker elements first
            try:
                # Look for date picker containers or icons
                date_pickers = self.driver.find_elements(By.CSS_SELECTOR, 
                    ".ant-picker, .date-picker, input[type='date'], .datepicker, [placeholder*='Date']")
                
                if len(date_pickers) >= 2:
                    logger.info(f"Found {len(date_pickers)} potential date picker elements")
                    
                    # Click on the first date picker (start date)
                    start_picker = date_pickers[0]
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", start_picker)
                    start_picker.click()
                    logger.info("Clicked on start date picker")
                    time.sleep(.2)
                    
                    # Try to send keys directly to the active element
                    active_element = self.driver.switch_to.active_element
                    active_element.send_keys(Keys.CONTROL + "a")  # Select all
                    active_element.send_keys(start_date_str)  # Enter start date
                    active_element.send_keys(Keys.ENTER)  # Confirm date
                    logger.info(f"Entered start date: {start_date_str}")
                    time.sleep(1)
                    
                    # Click on the second date picker (end date)
                    end_picker = date_pickers[1]
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", end_picker)
                    end_picker.click()
                    logger.info("Clicked on end date picker")
                    time.sleep(.2)
                    
                    # Try to send keys directly to the active element
                    active_element = self.driver.switch_to.active_element
                    active_element.send_keys(Keys.CONTROL + "a")  # Select all
                    active_element.send_keys(end_date_str)  # Enter end date
                    active_element.send_keys(Keys.ENTER)  # Confirm date
                    logger.info(f"Entered end date: {end_date_str}")
                    
                    return True
            except Exception as e:
                logger.warning(f"Approach 1 failed: {e}")
            
            # Approach 2: Try using JavaScript to set the input values
            try:
                # Use JavaScript to find and set values of inputs with date-related attributes
                script = """
                    const inputs = document.querySelectorAll('input');
                    let startInput = null;
                    let endInput = null;
                    
                    for (let input of inputs) {
                        const placeholder = input.placeholder || '';
                        const id = input.id || '';
                        const name = input.name || '';
                        const cls = input.className || '';
                        
                        if (placeholder.includes('Start') || id.includes('start') || 
                            name.includes('start') || cls.includes('start')) {
                            startInput = input;
                        } else if (placeholder.includes('End') || id.includes('end') || 
                            name.includes('end') || cls.includes('end')) {
                            endInput = input;
                        }
                    }
                    
                    // If we couldn't find by name, try by order of date inputs
                    if (!startInput || !endInput) {
                        const dateInputs = Array.from(inputs).filter(i => 
                            i.type === 'date' || 
                            i.className.includes('date') || 
                            i.placeholder.includes('Date'));
                        
                        if (dateInputs.length >= 2) {
                            startInput = dateInputs[0];
                            endInput = dateInputs[1];
                        }
                    }
                    
                    if (startInput && endInput) {
                        // Store original event handlers
                        const startChangeEvent = startInput.onchange;
                        const endChangeEvent = endInput.onchange;
                        
                        // Set values
                        startInput.value = arguments[0];
                        endInput.value = arguments[1];
                        
                        // Trigger events to notify the application
                        startInput.dispatchEvent(new Event('input', { bubbles: true }));
                        startInput.dispatchEvent(new Event('change', { bubbles: true }));
                        endInput.dispatchEvent(new Event('input', { bubbles: true }));
                        endInput.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        return true;
                    }
                    return false;
                """
                
                result = self.driver.execute_script(script, start_date_str, end_date_str)
                if result:
                    logger.info("Successfully set date values using JavaScript")
                    return True
            except Exception as e:
                logger.warning(f"Approach 2 failed: {e}")
            
            # Approach 3: Try clicking on date fields and using keyboard shortcuts
            try:
                # Try to locate date inputs by placeholder text containing "Date"
                date_inputs = self.driver.find_elements(By.XPATH, 
                    "//input[contains(@placeholder, 'Date') or contains(@class, 'date') or contains(@class, 'ant-picker-input')]/input")
                
                if len(date_inputs) < 2:
                    # If we didn't find them directly, try parent elements
                    date_containers = self.driver.find_elements(By.XPATH, 
                        "//div[contains(@class, 'ant-picker') or contains(@class, 'date-picker')]")
                    
                    if date_containers and len(date_containers) >= 2:
                        # Click on containers and then find active input
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", date_containers[0])
                        date_containers[0].click()
                        logger.info("Clicked on first date container")
                        time.sleep(1)
                        
                        # Try typing into the active element
                        active_element = self.driver.switch_to.active_element
                        active_element.send_keys(Keys.CONTROL + "a")
                        active_element.send_keys(start_date_str)
                        active_element.send_keys(Keys.ENTER)
                        logger.info(f"Typed start date: {start_date_str}")
                        time.sleep(1)
                        
                        # Repeat for end date
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", date_containers[1])
                        date_containers[1].click()
                        logger.info("Clicked on second date container")
                        time.sleep(1)
                        
                        active_element = self.driver.switch_to.active_element
                        active_element.send_keys(Keys.CONTROL + "a")
                        active_element.send_keys(end_date_str)
                        active_element.send_keys(Keys.ENTER)
                        logger.info(f"Typed end date: {end_date_str}")
                        
                        return True
            except Exception as e:
                logger.warning(f"Approach 3 failed: {e}")
                
            # Final approach: Try taking a screenshot to diagnose the issue
            try:
                screenshot_path = "date_inputs_debug.png"
                self.driver.save_screenshot(screenshot_path)
                logger.info(f"Saved debug screenshot to {screenshot_path}")
                
                # Log HTML structure around form elements to help diagnose
                form_html = self.driver.find_element(By.CSS_SELECTOR, "form").get_attribute('outerHTML')
                logger.info(f"Form HTML structure (first 500 chars): {form_html[:500]}...")
            except Exception as e:
                logger.warning(f"Could not save debug screenshot: {e}")
                
            logger.warning("All approaches to fill date fields failed")
            return False
            
        except Exception as e:
            logger.error(f"Error filling date range fields: {e}")
            return False
            
    def click_search_button(self):
        """Find and click the search button after filling date range."""
        try:
            logger.info("Looking for search button with class 'el-button search-btn el-button--primary el-button--mini'")
            
            # Wait for search button to be clickable
            search_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".el-button.search-btn.el-button--primary.el-button--mini"))
            )
            
            # Scroll to the button to ensure it's visible
            self.driver.execute_script("arguments[0].scrollIntoView(true);", search_button)
            time.sleep(1)  # Short pause to complete scrolling
            
            # Click the search button
            search_button.click()
            logger.info("Clicked search button successfully")
            
            # Wait for search results to load
            time.sleep(3)  # Allow time for search to complete
            
            return True
        except Exception as e:
            logger.error(f"Error clicking search button: {e}")
            
            # Try alternative methods if direct click failed
            try:
                logger.info("Trying JavaScript click method")
                search_button = self.driver.find_element(By.CSS_SELECTOR, 
                    ".el-button.search-btn.el-button--primary.el-button--mini")
                self.driver.execute_script("arguments[0].click();", search_button)
                logger.info("Clicked search button using JavaScript")
                time.sleep(3)  # Allow time for search to complete
                return True
            except Exception as e2:
                logger.error(f"JavaScript click also failed: {e2}")
                return False
            
    def close(self):
        """Close the browser."""
        if hasattr(self, 'driver'):
            self.driver.quit()
            logger.info("Browser closed")

def main():
    """Main function to demonstrate browser automation."""
    # Initialize browser automation (set headless=True for no UI)
    try:
        automation = BrowserAutomation(headless=False)
        
        # Navigate directly to TurboRoute AI login page
        automation.navigate_to_turboroute()
        
        # Use provided credentials
        username = "0935642232"
        password = "FleetAPCG@2568"
        
        print(f"Attempting to login with provided credentials (username: {username})...")
        
        # Attempt to login
        login_success = automation.login_to_turboroute(username, password)
        
        if login_success:
            print("Login appears successful!")
            
            # Navigate to waybill-list page after successful login
            print("Navigating to waybill-list page...")
            automation.navigate_to_waybill_list()
            
            # Fill date range fields
            print("Filling date range fields...")
            automation.fill_date_range_fields()
            
            # Click search button
            print("Clicking search button...")
            automation.click_search_button()
        else:
            print("Login might have failed. The browser will remain open.")
        
        # Wait for user interaction - keeping the browser open
        print("\nBrowser is now open. Press Ctrl+C in the terminal when you want to close the browser.")
        
        try:
            # Keep the script running until interrupted
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nClosing browser...")
        
        print("Browser automation completed successfully!")
        
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Always close the browser
        if 'automation' in locals():
            automation.close()

if __name__ == "__main__":
    main()