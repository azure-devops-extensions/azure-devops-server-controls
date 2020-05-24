import * as React from "react";

import { BuildReference } from "TFS/Build/Contracts"
import { LinkWithKeyBinding } from "Build/Scripts/Components/LinkWithKeyBinding";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { isDateRecent } from "Build/Scripts/Utilities/DateUtility";

import { BuildLinks } from "Build.Common/Scripts/Linking";

import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import { friendly, localeFormat } from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";


export interface BuildProps {
    build: BuildReference;
}

export class LatestBuild extends React.Component<BuildProps, {}> {
    public render(): JSX.Element {
        const build = this.props.build;
        if (!build) {
            return null;
        }
        else {
            let lastBuiltElement: JSX.Element = null;
            if (build.finishTime) {
                const text = this._getAuthoredDate(build.finishTime);
                const tooltip = localeFormat(build.finishTime, "f");

                lastBuiltElement = (<TooltipHost content={tooltip} directionalHint={DirectionalHint.bottomCenter}>
                    <LinkWithKeyBinding title={format(BuildResources.ViewLatestBuildText, text)} text={text} href={BuildLinks.getBuildDetailLink(build.id)} />
                </TooltipHost>);
            }
            else {
                // this means the build is not finished yet
                return <span>{BuildResources.BuildNotFinishedText}</span>;
            }

            return <div>
                {lastBuiltElement}
            </div>;
        }
    }

    private _getAuthoredDate(date: Date): string {
        const isRecent: boolean = isDateRecent(date);
        return isRecent ? friendly(date) : localeFormat(date, "g");
    }
}


