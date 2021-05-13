import browser from "webextension-polyfill";

function parseStartItem(startItem) {
	const [itemTypeName, itemID, versionModificator] = (startItem || "").split(
		":"
	);
	// ItemID must be UUID
	if (itemTypeName && itemID && itemID.length === 32) {
		return {
			itemTypeName,
			itemID,
			versionModificator
		};
	}

	return null;
}

async function switchOnActiveTab(tab) {
	const urlString = tab.url;
	if (!(urlString && urlString.startsWith("http"))) {
		return;
	}

	const url = new URL(urlString);
	url.search = url.search.toLowerCase();
	const startItem = url.searchParams.get("startitem");
	const dataItem = parseStartItem(startItem);
	if (!dataItem) {
		return;
	}

	url.search = "";
	console.log(url.toString() + "?*");
	const tabs = await browser.tabs.query({
		url: [url.toString(), url.toString() + "?*"],
		active: false
	});
	if (tabs.length === 0) {
		return;
	}

	const active = tabs[0];
	try {
		await browser.tabs.executeScript(tab.id, {
			code: `localStorage.removeItem("DeepLinkingOpenStartItem");localStorage.setItem("DeepLinkingOpenStartItem", '${JSON.stringify(
				dataItem
			)}');`
		});
		await browser.tabs.executeScript(tab.id, {
			code: "window.stop();",
			allFrames: true,
			runAt: "document_start"
		});
		await browser.tabs.update(active.id, { active: true });
		await browser.tabs.remove(tab.id);
	} catch (error) {
		console.log(error);
	}
}

const isFirefox = (window.browser && browser.runtime) || !chrome.app;
if (!isFirefox) {
	browser.tabs.onUpdated.addListener(async (tabId, { url }, tab) => {
		if (url) {
			await switchOnActiveTab(tab);
		}
	});
} else if (isFirefox) {
	browser.runtime.getBrowserInfo().then((browserInfo) => {
		if (Number.parseInt(browserInfo.version, 10) < 88) {
			browser.tabs.onUpdated.addListener(
				async (tabId, { url }, tab) => {
					if (url) {
						await switchOnActiveTab(tab);
					}
				},
				{
					properties: ["status"]
				}
			);
		} else {
			browser.tabs.onUpdated.addListener(
				async (tabId, changeInfo, tab) => {
					await switchOnActiveTab(tab);
				},
				{
					properties: ["url"]
				}
			);
		}
	});
}
