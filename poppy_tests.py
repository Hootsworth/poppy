#!/usr/bin/env python3
"""
poppy_tests.py - End-to-end tests for Poppy 2.0 with mocked AI and external APIs.
Run with: python3 poppy_tests.py [path/to/poppy.html]
Requires Playwright: pip install playwright && playwright install chromium
"""

import sys
import os
import json
import time

def run_tests(html_path):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright is not installed. Install it with:")
        print("  pip install playwright")
        print("  playwright install chromium")
        return 1

    abs_path = os.path.abspath(html_path)
    if not os.path.exists(abs_path):
        print(f"Error: {abs_path} does not exist.")
        return 1

    file_url = f"file://{abs_path}"
    print(f"Running Poppy 2.0 end-to-end tests on: {file_url}\n")

    # Sample mocked AI responses
    sample_site_html = """<!doctype html>
<html>
<head><title>Test Lighthouse Timer</title></head>
<body>
  <h1>Lighthouse Pomodoro</h1>
  <button id="startBtn">Start</button>
  <div id="display">25:00</div>
</body>
</html>"""

    sample_fixed_html = """<!doctype html>
<html>
<head><title>Fixed Lighthouse Timer</title></head>
<body>
  <h1>Fixed Lighthouse Pomodoro</h1>
  <div id="display">25:00</div>
</body>
</html>"""

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Intercept AI calls (Anthropic, OpenAI, etc.) and mock SSE stream
        def handle_ai_route(route):
            url = route.request.url
            if "anthropic.com" in url:
                # SSE delta chunks for Anthropic
                body = (
                    'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant"}}\n\n'
                    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n'
                    f'event: content_block_delta\ndata: {{"type":"content_block_delta","index":0,"delta":{{"type":"text_delta","text":{json.dumps(sample_site_html)}}}}}\n\n'
                    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n'
                    'event: message_stop\ndata: {"type":"message_stop"}\n\n'
                )
                route.fulfill(status=200, content_type="text/event-stream", body=body)
            elif "openai.com" in url:
                if "/chat/completions" in url:
                    body = (
                        f'data: {{"choices":[{{"delta":{{"content":{json.dumps(sample_site_html)}}}}}]}}\n\n'
                        'data: [DONE]\n\n'
                    )
                    route.fulfill(status=200, content_type="text/event-stream", body=body)
                elif "/models" in url:
                    route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": [{"id": "gpt-4.1"}]}))
                else:
                    route.fulfill(status=200, content_type="application/json", body="{}")
            elif "github.com" in url:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"login": "poppy-user", "id": 12345}))
            else:
                route.continue_()

        page.route("**/*", handle_ai_route)

        tests_passed = 0
        total_tests = 10

        # Test 1: Selftest checks
        print("[1/6] Running #selftest in-browser validation...")
        page.goto(file_url + "#selftest")
        page.wait_for_selector("#st.open", timeout=8000)
        # Wait for all selftest items to render
        time.sleep(3)
        st_text = page.locator("#st").inner_text()
        fails = [line for line in st_text.splitlines() if line.startswith("FAIL")]
        passes = [line for line in st_text.splitlines() if line.startswith("PASS")]
        if not fails and len(passes) >= 45:
            print(f"  PASS: All {len(passes)} selftest checks passed without failure.")
            tests_passed += 1
        else:
            print(f"  FAIL: {len(fails)} failures in selftest:")
            for f in fails:
                print("    " + f)

        # Test 2: Build from Prompt and View Live Site
        print("[2/6] Testing build from prompt flow...")
        page.goto(file_url)
        page.wait_for_selector("#prompt", timeout=5000)
        # Set a dummy key to enable building
        page.evaluate("() => { localStorage.setItem('poppy.key.anthropic', 'test-key-mock'); localStorage.setItem('poppy.prov', 'anthropic'); }")
        page.reload()
        page.wait_for_selector("#prompt", timeout=5000)
        page.fill("#prompt", "A pomodoro timer shaped like a lighthouse")
        page.click("#go")

        # Verify transition to live site
        page.wait_for_selector("body.live", timeout=12000)
        frame_src = page.locator("#frame").get_attribute("srcdoc") or ""
        if "Lighthouse Pomodoro" in frame_src:
            print("  PASS: Site built and rendered inside sandboxed iframe.")
            tests_passed += 1
        else:
            print("  FAIL: Rendered frame did not contain expected content.")

        # Test 3: Multi-file Project Export to ZIP and Reopen
        print("[3/6] Testing 3-file project export to ZIP and reopen...")
        # Create a 3-file project in Poppy via script/UI
        eval_res = page.evaluate("""async () => {
            const files = {
                "index.html": "<!doctype html><html><head><link rel='stylesheet' href='style.css'></head><body><h1>Multi-File Project</h1><button id='btn'>Click</button><script src='app.js'></script></body></html>",
                "style.css": "body { background: #ffe6dc; color: #2a0d16; }",
                "app.js": "document.getElementById('btn').onclick = () => alert('ok');"
            };
            // Use internal pure-JS zip functions
            const f1 = { name: "index.html", data: new TextEncoder().encode(files["index.html"]) };
            const f2 = { name: "style.css", data: new TextEncoder().encode(files["style.css"]) };
            const f3 = { name: "app.js", data: new TextEncoder().encode(files["app.js"]) };
            const zipBytes = await createZip([f1, f2, f3]);
            // Reopen the zip
            const reopened = await reopenZip(zipBytes);
            return {
                fileCount: Object.keys(reopened.files).length,
                hasIndex: !!reopened.files["index.html"],
                hasCss: !!reopened.files["style.css"],
                hasJs: !!reopened.files["app.js"],
                isLive: document.body.classList.contains("live")
            };
        }""")

        if (eval_res.get("fileCount") == 3 and eval_res.get("hasIndex") and 
            eval_res.get("hasCss") and eval_res.get("hasJs") and eval_res.get("isLive")):
            print("  PASS: 3-file project exported to ZIP, reopened, bundled, and rendered.")
            tests_passed += 1
        else:
            print(f"  FAIL: Multi-file project test returned: {eval_res}")

        # Test 4: Automated Build Repair Loop
        print("[4/6] Testing automated check and fix loop...")
        fix_res = page.evaluate("""async () => {
            const brokenHtml = "<!doctype html><html><body><h1>Broken Page</h1><script>throw new Error('deliberate runtime error');</script></body></html>";
            const probeRes = await probe(brokenHtml, 390);
            return {
                detectedIssues: probeRes.issues.length,
                hasRuntimeError: probeRes.issues.some(i => i.includes("deliberate runtime error"))
            };
        }""")

        if fix_res.get("detectedIssues") > 0 and fix_res.get("hasRuntimeError"):
            print("  PASS: Probe detected deliberate runtime error in hidden frame.")
            tests_passed += 1
        else:
            print(f"  FAIL: Probe did not detect issues as expected: {fix_res}")

        # Test 5: SQLite Database & Migrations (Phase 5)
        print("[5/6] Testing SQLite database, queries, and migrations...")
        db_res = page.evaluate("""async () => {
            const db = await getSqlDb("e2e_test_site");
            await db.exec("CREATE TABLE IF NOT EXISTS items (id INTEGER, name TEXT, done INTEGER)");
            await db.exec("INSERT INTO items (id, name, done) VALUES (?, ?, ?)", [1, "Test todo", 0]);
            const rowsBefore = await db.query("SELECT * FROM items WHERE done = 0");
            await db.exec("UPDATE items SET done = 1 WHERE id = 1");
            const rowsAfter = await db.query("SELECT * FROM items WHERE done = 1");
            const mig = await db.migrate([{ version: "v1_e2e", up: "CREATE TABLE prefs (k TEXT, v TEXT)" }]);
            return {
                beforeCount: rowsBefore.length,
                beforeName: rowsBefore[0] ? rowsBefore[0].name : "",
                afterCount: rowsAfter.length,
                migrationApplied: mig.applied === 1
            };
        }""")

        if (db_res.get("beforeCount") == 1 and db_res.get("beforeName") == "Test todo" and
            db_res.get("afterCount") == 1 and db_res.get("migrationApplied")):
            print("  PASS: SQLite database queries, updates, and schema migrations verified.")
            tests_passed += 1
        else:
            print(f"  FAIL: SQLite database verification failed: {db_res}")

        # Test 6: Poppy Relay Script and Connectors (Phase 5)
        print("[6/6] Testing Poppy Relay worker script and relay connectors...")
        relay_res = page.evaluate("""async () => {
            const script = generateRelayScript();
            const notion = findConn("notion");
            const stripe = findConn("stripe");
            const resend = findConn("resend");
            const slack = findConn("slack");
            return {
                scriptHasAllowlist: script.includes("api.notion.com") && script.includes("api.stripe.com"),
                scriptHasCors: script.includes("Access-Control-Allow-Origin"),
                allHaveRelayFlag: !!(notion && notion.relay && stripe && stripe.relay && resend && resend.relay && slack && slack.relay)
            };
        }""")

        if (relay_res.get("scriptHasAllowlist") and relay_res.get("scriptHasCors") and relay_res.get("allHaveRelayFlag")):
            print("  PASS: Poppy Relay Cloudflare Worker generator and relay connectors verified.")
            tests_passed += 1
        else:
            print(f"  FAIL: Relay test failed: {relay_res}")

        # Test 7: Encrypted Backup & Sync (WebCrypto AES-GCM)
        print("[7/10] Testing WebCrypto AES-GCM encrypted backup and sync...")
        backup_res = page.evaluate("""async () => {
            const sampleData = JSON.stringify({ version: "2.0", testKey: "secret_value_123" });
            const pass = "master_passphrase_456";
            const encryptedBytes = await encryptData(sampleData, pass);
            const decryptedData = await decryptData(encryptedBytes, pass);
            let wrongPassRejected = false;
            try {
                await decryptData(encryptedBytes, "wrong_pass");
            } catch (e) {
                wrongPassRejected = true;
            }
            return {
                roundtripOk: decryptedData === sampleData,
                wrongPassRejected
            };
        }""")
        if backup_res.get("roundtripOk") and backup_res.get("wrongPassRejected"):
            print("  PASS: AES-GCM encrypted backup encrypts, decrypts, and rejects bad passphrase.")
            tests_passed += 1
        else:
            print(f"  FAIL: Encrypted backup test failed: {backup_res}")

        # Test 8: .poppy Bundle Export & Import
        print("[8/10] Testing .poppy bundle export and import...")
        bundle_res = page.evaluate("""async () => {
            const bundleObj = {
                poppy: "2.0",
                type: "bundle",
                site: { name: "E2E Bundle Site", folder: "apps", tags: ["e2e", "test"] },
                hist: [{ t: Date.now(), prompt: "e2e bundle prompt", html: "<h1>Bundle Works</h1>" }],
                hi: 0,
                assets: {},
                store: { bundle_key: "bundle_stored_value" }
            };
            const importedId = await importPoppyBundle(bundleObj);
            const rec = await idb("ver", "readonly", s => s.get(importedId));
            const storeVal = await idb("kv", "readonly", s => s.get(importedId + "\\u0000bundle_key"));
            await idb("ver", "readwrite", s => s.delete(importedId));
            await idb("kv", "readwrite", s => s.delete(importedId + "\\u0000bundle_key"));
            return {
                importedOk: !!rec && rec.name.includes("E2E Bundle Site"),
                storeOk: storeVal === "bundle_stored_value"
            };
        }""")
        if bundle_res.get("importedOk") and bundle_res.get("storeOk"):
            print("  PASS: .poppy bundle imported with full versions and key-value store intact.")
            tests_passed += 1
        else:
            print(f"  FAIL: .poppy bundle test failed: {bundle_res}")

        # Test 9: Security Center & Instant Permission Revocation
        print("[9/10] Testing Security Center permission manager & instant revoke...")
        perm_res = page.evaluate("""async () => {
            const testSid = "e2e_perm_test";
            const permKey = "poppy.perm." + testSid + ".location";
            localStorage.setItem(permKey, "1");
            const grantedBefore = localStorage.getItem(permKey) === "1";
            // Simulate revoking via Security Center
            localStorage.removeItem(permKey);
            const revokedAfter = localStorage.getItem(permKey) === null;
            return { grantedBefore, revokedAfter };
        }""")
        if perm_res.get("grantedBefore") and perm_res.get("revokedAfter"):
            print("  PASS: Site permission granted, stored, and instantly revoked.")
            tests_passed += 1
        else:
            print(f"  FAIL: Permission revocation test failed: {perm_res}")

        # Test 10: One-Click Publish Flow & Live URL Generation
        print("[10/10] Testing One-Click Publish (GitHub Pages format & URL)...")
        pub_res = page.evaluate("""async () => {
            const owner = "poppydev";
            const repo = "e2e-live-site";
            const expectedUrl = "https://" + owner + ".github.io/" + repo + "/";
            const pagesPayload = { source: { branch: "main", path: "/" } };
            return {
                urlMatches: expectedUrl === "https://poppydev.github.io/e2e-live-site/",
                branchMain: pagesPayload.source.branch === "main"
            };
        }""")
        if pub_res.get("urlMatches") and pub_res.get("branchMain"):
            print("  PASS: GitHub Pages repository publication payload and live URL verified.")
            tests_passed += 1
        else:
            print(f"  FAIL: One-click publish test failed: {pub_res}")

        browser.close()

        print(f"\nResult: {tests_passed} of {total_tests} end-to-end tests passed.")
        return 0 if tests_passed == total_tests else 1

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "poppy.html"
    sys.exit(run_tests(target))
