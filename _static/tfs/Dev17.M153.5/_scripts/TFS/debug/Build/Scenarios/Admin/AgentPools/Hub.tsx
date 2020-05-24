import * as React from "react";
import * as ReactDOM from "react-dom";
import { ViewContent } from "Build/Scenarios/Admin/AgentPools/View";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as SDK_Shim from "VSS/SDK/Shim";
import { ITabProps } from "./Types";
import "VSS/LoaderPlugins/Css!AgentPools";

SDK_Shim.registerContent("build.AgentPools", context => {
	const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
	const pageData = pageDataService.getPageData<ITabProps>("ms.vss-build-web.agent-pool-hub-data-provider");

	let loadScript = function(contributionId: string, url: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let contentElement: HTMLElement = document.createElement("script");
			(contentElement as HTMLScriptElement).async = false;
			(contentElement as HTMLScriptElement).src = url;

			contentElement.setAttribute("data-contentlength", "0");
			contentElement.setAttribute("data-sourcecontribution", contributionId);

			contentElement.addEventListener("load", (event: Event) => {
				resolve();
			});
			contentElement.addEventListener("error", (event: Event) => {
				reject();
			});

			document.head.appendChild(contentElement);
		});
	};

	// Load the signalr scripts
	let loadPromises: Promise<void>[] = [];
	loadPromises.push(loadScript("signalR", pageData.jQuerySignalrUrl));
	loadPromises.push(loadScript("signalRHub", pageData.signalrHubUrl));

	Promise.all(loadPromises).then(() => {
		ReactDOM.render(<ViewContent {...pageData} />, context.$container[0]);
	});
});
