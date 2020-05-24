// Copyright (C) Microsoft Corporation. All rights reserved.
define("VSS/Diagnostics/UI/Components/Resources/Resources", ["require", "exports", "react", "VSS/Platform/Layout", "VSS/Diagnostics/UI/Section"], function (require, exports, React, Layout_1, Section_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Resources extends Layout_1.VssComponent {
        constructor(props, context) {
            super(props, context);
            this.ttiComplete = () => {
                this.setState({ resourceSegments: this.getSectionData() });
            };
            this.state = {
                resourceSegments: this.getSectionData()
            };
        }
        render() {
            return React.createElement(Section_1.Section, { key: "resoruces-section", dataSegments: this.state.resourceSegments, sectionLabel: "Resources" });
        }
        componentDidMount() {
            super.componentDidMount();
            const performanceService = this.context.pageContext.getService("IVssPerformanceService");
            performanceService.subscribe(this.ttiComplete, "scenarioComplete");
        }
        componentWillUnmount() {
            super.componentWillUnmount();
            const performanceService = this.context.pageContext.getService("IVssPerformanceService");
            performanceService.unsubscribe(this.ttiComplete, "scenarioComplete");
        }
        getSectionData() {
            const performanceDiagnosticsService = this.context.pageContext.getService("IVssPerformanceDiagnosticsService");
            const performanceService = this.context.pageContext.getService("IVssPerformanceService");
            const performanceData = performanceService.getPerformanceData();
            let resourceSegments = [];
            if (performanceDiagnosticsService.isBundlingEnabled()) {
                if (performanceData.initialPageLoad) {
                    resourceSegments = [
                        {
                            segmentLabel: "Scripts",
                            segmentContent: performanceData.contentData.scriptsCount + " (" + this.getSizeText(performanceData.contentData.scriptSize) + ")"
                        },
                        {
                            segmentLabel: "CSS",
                            segmentContent: performanceData.contentData.cssCount + " (" + this.getSizeText(performanceData.contentData.cssSize) + ")"
                        }
                    ];
                    if (performanceData.contentData.ajaxCount) {
                        resourceSegments.push({
                            segmentLabel: "Ajax",
                            segmentContent: performanceData.contentData.ajaxCount + ""
                        });
                    }
                    if (performanceData.contentData.other) {
                        resourceSegments.push({
                            segmentLabel: "Other",
                            segmentContent: performanceData.contentData.other
                        });
                    }
                }
                else {
                    resourceSegments = [
                        {
                            segmentLabel: "",
                            segmentContent: "Unavailable on FPS. Reload for stats."
                        }
                    ];
                }
            }
            else {
                resourceSegments = [
                    {
                        segmentLabel: "Scripts",
                        segmentContent: performanceDiagnosticsService.isDebugEnabled() ? "debug" : "minified"
                    },
                    {
                        segmentLabel: "Bundling",
                        segmentContent: "disabled"
                    }
                ];
            }
            const dataProviderResult = window["dataProviders"];
            if (dataProviderResult) {
                let dataProviderSize = -1;
                try {
                    dataProviderSize = JSON.stringify(dataProviderResult.data).length / 1024;
                }
                catch (_a) {
                    // Ignore any error here
                }
                resourceSegments.push({
                    segmentLabel: "Data Providers",
                    segmentContent: `${Object.keys(dataProviderResult.data).length} (${dataProviderSize.toFixed(0)} KB)`
                });
            }
            return resourceSegments;
        }
        getSizeText(size) {
            var text = "";
            if (size >= 0) {
                var kb = size / 1024;
                text = Math.round(kb) + " KB";
            }
            return text;
        }
    }
    Layout_1.Components.add("perfbar.resourcesSection", Resources);
});
//# sourceMappingURL=Resources.js.map