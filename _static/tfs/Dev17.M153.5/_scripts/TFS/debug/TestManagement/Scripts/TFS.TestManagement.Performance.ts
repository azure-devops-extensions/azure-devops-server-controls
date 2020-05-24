import * as Performance from "VSS/Performance";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";

export class PerformanceUtils {
    private static scenarioDescriptorsMap: IDictionaryStringTo<Performance.IScenarioDescriptor> = {};

    public static onBuildExtensionRenderComplete: (area: string, extensionName: string) => void = null;
    public static startScenario(areaName: string, scenarioName: string, isPageLoadScenario?: boolean) {
        if (isPageLoadScenario) {
            const pageLoadScenario = Performance.getScenarioManager().startScenarioFromNavigation(areaName, scenarioName, true);
            this.scenarioDescriptorsMap[scenarioName] = pageLoadScenario;
        }
        else {
            if (Performance.getScenarioManager().getScenarios(areaName, scenarioName)) {
                Performance.getScenarioManager().abortScenario(areaName, scenarioName);
            }
            const perfScenarioDescriptor = Performance.getScenarioManager().startScenario(areaName, scenarioName);

            this.scenarioDescriptorsMap[scenarioName] = perfScenarioDescriptor;
        }
    }

    public static endScenario(scenarioName: string) {
        if (this.scenarioDescriptorsMap[scenarioName]) {

            this.scenarioDescriptorsMap[scenarioName].end();

            // Only recording the resource timings if this is an interactive page.
            if (this.scenarioDescriptorsMap[scenarioName].isPageInteractive()
                && window && window.performance && window.performance.getEntriesByType) {
                
                var resourceTimingsToLog: IResourceTiming[] = [];
                var resourceTimings: PerformanceResourceTiming[] = window.performance.getEntriesByType('resource');

                if (resourceTimings.length > 0) {
                    resourceTimings.forEach((resourceTiming: PerformanceResourceTiming) => {
                        if (resourceTiming.duration > 0) {
                            resourceTimingsToLog.push({
                                name: resourceTiming.name,
                                startTime: resourceTiming.startTime,
                                requestEnd: resourceTiming.responseStart,
                                responseEnd: resourceTiming.responseEnd,
                                duration: resourceTiming.duration
                            });
                        }
                    });
        
                    if (!!resourceTimingsToLog && resourceTimingsToLog.length > 0) {
                        this.scenarioDescriptorsMap[scenarioName].addData(<IResourceTimingCIEntry>{
                            resourceTimings: JSON.stringify(resourceTimingsToLog)
                        });
                    }
                }
            }

            if (this.onBuildExtensionRenderComplete && scenarioName === TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails) {
                // This comes in case of build
                this.onBuildExtensionRenderComplete(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.BuildTestResultDetailsExtension);
                // resetting it so that it is not invoked when stale
                this.onBuildExtensionRenderComplete = null;
            }
            delete this.scenarioDescriptorsMap[scenarioName];
        }
    }

    public static abortScenario(scenarioName: string) {
        if(this.scenarioDescriptorsMap[scenarioName]) {
            this.scenarioDescriptorsMap[scenarioName].abort();
            delete this.scenarioDescriptorsMap[scenarioName];
        }
    }

    public static addSplitTiming(scenarioName: string, name: string, elapsedTime?: number) {
        if (this.scenarioDescriptorsMap[scenarioName]) {
            this.scenarioDescriptorsMap[scenarioName].addSplitTiming(name, elapsedTime);
        }
    }

    public static addDataToScenario(scenarioName: string, data: any) {
        if (this.scenarioDescriptorsMap[scenarioName]) {
            this.scenarioDescriptorsMap[scenarioName].addData(data);
        }
    }
}

export interface IResourceTiming {
    name: string;
    startTime: number;
    requestEnd: number;
    responseEnd: number;
    duration: number;
}

export interface IResourceTimingCIEntry {
    resourceTimings: string;
}