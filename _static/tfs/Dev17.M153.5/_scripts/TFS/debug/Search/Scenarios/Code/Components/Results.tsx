import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import { FilterPaneContainer } from "Search/Scenarios/Code/Components/FilterPaneContainer";
import { OverlayContainer } from "Search/Scenarios/Code/Components/Overlay";
import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";
import { RightPaneContainer } from "Search/Scenarios/Code/Components/RightPane";
import { LeftPaneContainer } from "Search/Scenarios/Code/Components/LeftPane";
import { ZeroDataContainer } from "Search/Scenarios/Code/Components/ZeroData";
import { PreviewOrientationActionIds } from "Search/Scenarios/Code/Constants";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/Results";

const LeftPaneWidth = 0.36;
const MarginAdjustment = 20;

export const ResultsContainer = Container.create(
    ["previewOrientationStore", "pivotTabsStore"],
    ({ previewOrientationStoreState, pivotTabsState }, props) => {
        const { previewOrientation } = previewOrientationStoreState,
            splitVertically: boolean = previewOrientation === PreviewOrientationActionIds.Bottom,
            defaultFixedPaneSize: number = LeftPaneWidth * (document.body.clientWidth - MarginAdjustment),
            statefulSettingsPath: string = `CodeSearch.View.Splitter.${previewOrientation}`;

        return (
            <div className="search-View--container absolute-full">
                <FilterPaneContainer {...props} />
                <div className="search-Results">
                    <OverlayContainer {...props} />
                    <ZeroDataContainer {...props } />
                    <div className="results-SplitSection absolute-full">
                        <StatefulSplitter
                            className="search-Splitter"
                            fixedSide="left"
                            statefulSettingsPath={statefulSettingsPath}
                            vertical={splitVertically}
                            left={<LeftPaneContainer {...props} />}
                            leftClassName="search-Items--container"
                            right={<RightPaneContainer {...props} />}
                            isFixedPaneVisible={!pivotTabsState.isFullScreen}
                            enableToggleButton={false}
                            collapsedLabel={null}
                            isFixedPaneVisibleByDefault={true}
                            toggleButtonExpandedTooltip={null}
                            toggleButtonCollapsedTooltip={null}
                            fixedPaneSizeByDefault={!splitVertically ? defaultFixedPaneSize : undefined} />
                    </div>
                </div>
            </div>);
    });

/*
* Queue loading of modules which are required for previewing purposes in async fashion.
**/
queueModulePreload([
    "Search/Scenarios/Code/Components/CompareContainer",
    "Search/Scenarios/Code/Components/HistoryContainer", 
    "VersionControl/Scenarios/Shared/FileViewers/AnnotatedFileViewer",
    "Search/Scenarios/Code/Components/TfvcHistoryContainer",
    "Search/Scenarios/Code/Components/GitHistoryContainer",
    "Search/Scenarios/Code/Components/FilterPane"
]);