import * as React from "react";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import { FilterPaneContainer } from "Search/Scenarios/WorkItem/Components/FilterPaneContainer";
import { OverlayContainer } from "Search/Scenarios/WorkItem/Components/Overlay";
import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";
import { LeftPaneContainer } from "Search/Scenarios/WorkItem/Components/LeftPane/LeftPane";
import { RightPaneContainer } from "Search/Scenarios/WorkItem/Components/RightPane";
import { PreviewOrientationActionIds } from "Search/Scenarios/WorkItem/Constants";
import { ZeroDataContainer } from "Search/Scenarios/WorkItem/Components/ZeroData";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/Results";

const FixedPaneWidth = 0.64;
const MarginAdjustment = 20;

export const ResultsContainer = Container.create(
    ["previewOrientationStore"],
    ({ previewOrientationStoreState }, props) => {
        const { previewOrientation } = previewOrientationStoreState,
            bottomPreviewOrientation: boolean = previewOrientation === PreviewOrientationActionIds.BottomPreviewOrientation,
            offPreviewOrientation: boolean = previewOrientation === PreviewOrientationActionIds.OffPreviewOrientation,
            defaultFixedPaneSize: number = FixedPaneWidth * (document.body.clientWidth - MarginAdjustment),
            statefulSettingsPath: string = `WorkItemSearch.View.Splitter.${previewOrientation}`;

        return (
            <div className="search-View--container absolute-full">
                <FilterPaneContainer {...props} />
                <div className="search-Results">
                    <OverlayContainer {...props} />
                    <ZeroDataContainer {...props} />
                    <div className="results-SplitSection absolute-full">
                        <StatefulSplitter
                            className="workitem-search-Splitter"
                            fixedSide="right"
                            statefulSettingsPath={statefulSettingsPath}
                            vertical={bottomPreviewOrientation}
                            left={<LeftPaneContainer {...props} />}
                            leftClassName="workitem-search-Items--container"
                            right={< RightPaneContainer {...props} />}
                            isFixedPaneVisible={!offPreviewOrientation}
                            enableToggleButton={false}
                            collapsedLabel={null}
                            isFixedPaneVisibleByDefault={true}
                            toggleButtonExpandedTooltip={null}
                            toggleButtonCollapsedTooltip={null}
                            fixedPaneSizeByDefault={!bottomPreviewOrientation ? defaultFixedPaneSize : null} />
                    </div>
                </div>
            </div>);
    });

/*
* Queue loading of modules which are required for previewing purposes in async fashion.
**/
queueModulePreload([
    "Search/Scenarios/WorkItem/Components/WorkItemPreview",
    "Search/Scenarios/WorkItem/Components/FilterPane"
]);