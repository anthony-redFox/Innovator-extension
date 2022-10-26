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

function setLocalStorage(string) {
	return () => {
		localStorage.removeItem("DeepLinkingOpenStartItem");
		localStorage.setItem("DeepLinkingOpenStartItem", string);
	};
}

async function switchOnActiveTab(tab) {
	const urlString = tab.url;
	if (!urlString?.startsWith("http")) {
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
	const [active] = await browsers.tabs.query({
		url: [url.toString(), url.toString() + "?*"],
		active: false
	});
	if (!active) {
		return;
	}

	try {
		await browsers.scripting.executeScript({
			target: { tabId: tab.id },
			func: setLocalStorage(JSON.stringify(dataItem))
		});
		await browsers.tabs.update(active.id, { active: true });
		await browsers.tabs.remove(tab.id);
	} catch (error) {
		console.log(error);
	}
}

const browsers = typeof browser === "undefined" ? chrome : browser;
const isFirefox = typeof chrome === "undefined";
if (isFirefox) {
	browsers.tabs.onUpdated.addListener(
		async (tabId, changeInfo, tab) => {
			await switchOnActiveTab(tab);
		},
		{
			properties: ["url"]
		}
	);
} else {
	browsers.tabs.onUpdated.addListener(async (tabId, { url }, tab) => {
		if (url) {
			await switchOnActiveTab(tab);
		}
	});
}
