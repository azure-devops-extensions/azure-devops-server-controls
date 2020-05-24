import {
    ILinkedStackTraceInfo,
    IParsedStackTraceInfo,
    ISourceInfoProvider,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/common";

export class StackTraceLinkCreator {
    constructor(private sourceInfoProvider: ISourceInfoProvider) {

    }

    public createLinks(parsedStackTraceInfo: IParsedStackTraceInfo[]): Promise<ILinkedStackTraceInfo[]> {

        return new Promise<ILinkedStackTraceInfo[]>((resolve, reject) => {
            if (this.sourceInfoProvider) {
                this.sourceInfoProvider.constructFilePath(parsedStackTraceInfo).then((result: ILinkedStackTraceInfo[]) => {
                    resolve(result);
                });
            }
            else {
                let linkedStackTraceInfo: ILinkedStackTraceInfo[] = [];
                linkedStackTraceInfo = parsedStackTraceInfo.map((parsedInfo: IParsedStackTraceInfo) => {
                    return {
                        stackTrace: parsedInfo.stackTrace,
                        url: null
                    } as ILinkedStackTraceInfo;
                });

                resolve(linkedStackTraceInfo);
            }
        });
    }
}