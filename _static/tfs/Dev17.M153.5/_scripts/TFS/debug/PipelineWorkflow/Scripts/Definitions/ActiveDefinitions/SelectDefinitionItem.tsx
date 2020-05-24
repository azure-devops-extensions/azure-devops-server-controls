/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";

import { ReleasesHubServiceDataHelper } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { ResourcePathUtils } from "PipelineWorkflow/Scripts/Shared/Utils/ResourcePathUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { ZeroData } from "VSSUI/ZeroData";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsContent";

export class SelectDefinitionItem implements Item {

	public getOverview(instanceId?: string): JSX.Element {
		// No overview, this item is not displayed in left panel;
		// It is used to set the display in right panel when some search results are displayed but no RD selected in left pane
		return (<div className="no-rd-selected-hidden-overview"></div>);
	}

	public getDetails(): JSX.Element {

		const resourcePath = ReleasesHubServiceDataHelper.getResourcePath();
		const secondaryText = (
			<div className={"no-rd-selected-view-text"}>
				{Resources.SelectDefinitionText}
			</div>
		);

		if (!this._details) {
			this._details = (
				<div className={"no-rd-selected-view-container"}>
					<ZeroData
						secondaryText={secondaryText}
						imageAltText={""}
						imagePath={ResourcePathUtils.getResourcePath("zerodata-release-management-new.png", resourcePath)}
					/>
				</div>);
		}

		return this._details;
	}


	public getKey(): string {
		return "select-definition-to-view-details-item";
	}

	private _details: JSX.Element;
}
