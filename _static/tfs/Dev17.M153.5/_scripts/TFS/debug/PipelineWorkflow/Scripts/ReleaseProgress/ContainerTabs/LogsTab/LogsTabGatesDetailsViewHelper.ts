import { ITaskLog } from "DistributedTaskUI/Logs/Logs.Types";

import { IReleaseGateSampleInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import { IReleaseEnvironmentGatesRuntimeData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";

import * as Utils_String from "VSS/Utils/String";
import { first } from "VSS/Utils/Array";

export class LogsTabGatesDetailsViewHelper {

    public static getLatestSample(gateData: IReleaseEnvironmentGatesRuntimeData): IGateSampleAndPhase {
        if (gateData.gateEvaluationSamples && gateData.gateEvaluationSamples.length > 0) {
            return {
                sample: gateData.gateEvaluationSamples[0],
                isStabilizationPhase: false
            };
        }
        else if (gateData.gateStabilizationSamples && gateData.gateStabilizationSamples.length > 0) {
            return {
                sample: gateData.gateStabilizationSamples[0],
                isStabilizationPhase: true
            };
        }

        return null;
    }

    public static getEvaluationSampleByGateNameAndRank(gateData: IReleaseEnvironmentGatesRuntimeData, rank: number): IGateSampleAndPhase {

        let findSample = (samples: IReleaseGateSampleInfo[], isStabilizationPhase: boolean) => {
            const sample = first(samples, sample => sample.gateJobRank === rank);
            return sample ? { sample: sample, isStabilizationPhase: isStabilizationPhase} : null;
        };
        if (gateData.gateEvaluationSamples && gateData.gateEvaluationSamples.length > 0) {
            let foundSample = findSample(gateData.gateEvaluationSamples, false);
            if (foundSample) {
                return foundSample;
            }
        }
        if (gateData.gateStabilizationSamples && gateData.gateStabilizationSamples.length > 0) {
            let foundSample = findSample(gateData.gateStabilizationSamples, true);
            return foundSample;
        }

        return null;
    }

    public static isGivenSampleObsolete(gateData: IReleaseEnvironmentGatesRuntimeData, gateSample: IReleaseGateSampleInfo): boolean {

        let gateSampleIndex: number = this._findGateIndexInSamples(gateData, gateSample);

        return gateSampleIndex === -1 ? true : false;
    }

    public static getPreviousSampleOfCurrentGate(gateData: IReleaseEnvironmentGatesRuntimeData, currentGateSample: IReleaseGateSampleInfo, defaultSampleToReturn?: IReleaseGateSampleInfo): IReleaseGateSampleInfo {
        let previousSampleInfo: IReleaseGateSampleInfo = defaultSampleToReturn;

        let concatenatedArray: IReleaseGateSampleInfo[] = LogsTabGatesDetailsViewHelper._concatenateEvaluationAndStabilizationSamples(gateData);

        let currentGateIndex: number = concatenatedArray.map((sample: IReleaseGateSampleInfo) => {
            return sample.sampleStartTime.toString();
        }).indexOf(currentGateSample.sampleStartTime.toString());

        if (currentGateIndex > -1 && currentGateIndex < (concatenatedArray.length - 1)) {
            previousSampleInfo = concatenatedArray[currentGateIndex + 1];
        }

        return previousSampleInfo;
    }

    public static getNextSampleOfCurrentGate(gateData: IReleaseEnvironmentGatesRuntimeData, currentGateSample: IReleaseGateSampleInfo, returnOldestSampleByDefault: boolean = false): IReleaseGateSampleInfo {
        let nextSampleInfo: IReleaseGateSampleInfo;
        let currentSampleEncountered: boolean = false;

        let concatenatedArray: IReleaseGateSampleInfo[] = LogsTabGatesDetailsViewHelper._concatenateEvaluationAndStabilizationSamples(gateData);

        let currentGateIndex: number = concatenatedArray.map((sample: IReleaseGateSampleInfo) => {
            return sample.sampleStartTime.toString();
        }).indexOf(currentGateSample.sampleStartTime.toString());

        if (currentGateIndex > 0) {
            nextSampleInfo = concatenatedArray[currentGateIndex - 1];
        }

        if (!nextSampleInfo && returnOldestSampleByDefault) {
            nextSampleInfo = concatenatedArray[concatenatedArray.length - 1];
        }

        return nextSampleInfo;
    }

    public static getTaskLogForGateSample(gateSample: IReleaseGateSampleInfo, gateName: string): ITaskLog {
        let taskLog: ITaskLog;

        if (gateSample && gateSample.individualGateInfos) {
            for (let task of gateSample.individualGateInfos) {
                if (Utils_String.equals(task.name, gateName, true)) {
                    taskLog = task;
                }
            }
        }

        return taskLog;
    }

    private static _findGateIndexInSamples(gateData: IReleaseEnvironmentGatesRuntimeData, currentGateSample: IReleaseGateSampleInfo): number {
        let gateSampleIndex: number = -1;
        if (currentGateSample) {
            let concatenatedArray: IReleaseGateSampleInfo[] = LogsTabGatesDetailsViewHelper._concatenateEvaluationAndStabilizationSamples(gateData);

            gateSampleIndex = concatenatedArray.map((sample: IReleaseGateSampleInfo) => {
                return sample.sampleStartTime.toString();
            }).indexOf(currentGateSample.sampleStartTime.toString());
        }
        return gateSampleIndex;
    }

    private static _concatenateEvaluationAndStabilizationSamples(gateData: IReleaseEnvironmentGatesRuntimeData): IReleaseGateSampleInfo[] {

        let concatenatedArray: IReleaseGateSampleInfo[] = [];

        if (gateData.gateEvaluationSamples && gateData.gateEvaluationSamples.length > 0) {
            concatenatedArray = concatenatedArray.concat(gateData.gateEvaluationSamples);
        }
        if (gateData.gateStabilizationSamples && gateData.gateStabilizationSamples.length > 0) {
            concatenatedArray = concatenatedArray.concat(gateData.gateStabilizationSamples);
        }

        return concatenatedArray;
    }
}

export interface IGateSampleAndPhase {
    sample: IReleaseGateSampleInfo;
    isStabilizationPhase: boolean;
}