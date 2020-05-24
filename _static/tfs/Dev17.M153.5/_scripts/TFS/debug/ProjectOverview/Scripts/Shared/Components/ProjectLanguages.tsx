import * as React from "react";

import * as Utils_String from "VSS/Utils/String";

import { TagListControlComponent, TagInfo } from "ProjectOverview/Scripts/Shared/Components/TagListControl";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { ProjectLanguageMetricsData } from "ProjectOverview/Scripts/ActionsHub";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Shared/Components/ProjectLanguages";

export interface ProjectLanguageProps {
	dominantLanguagesMetrics: ProjectLanguageMetricsData[];
}

export function ProjectLanguages(props: ProjectLanguageProps): JSX.Element {
	const languagesMetrics: ProjectLanguageMetricsData[] = props.dominantLanguagesMetrics;
	const tags: TagInfo[] = [];
	const shouldRenderProjectLanguages = languagesMetrics && languagesMetrics.length !== 0;

	if (shouldRenderProjectLanguages) {
		for (const languageMetrics of languagesMetrics) {
			tags.push({
				text: languageMetrics.name,
				tooltipText: languageMetrics.languagePercentage.toString() + " %",
				tagItemAriaLabel: Utils_String.format(
					ProjectOverviewResources.ProjectLanguage_ItemNameAriaLabel,
					languageMetrics.name,
					languageMetrics.languagePercentage.toString()
				),
				isFocusable: true
			});
		}
		return (
			<div className={"project-languages"}>
				<TagListControlComponent
					tags={tags}
					autoCompleteSuggestedTagItems={null}
					editMode={false}
					listAriaLabel={ProjectOverviewResources.ProjectLanguages_AriaLabel}
				/>
			</div>
		);
	}

	return null;
}
