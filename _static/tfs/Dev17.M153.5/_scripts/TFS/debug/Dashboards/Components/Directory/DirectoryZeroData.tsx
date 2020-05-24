import * as React from "react";
import * as ZeroData from "Presentation/Scripts/TFS/Components/ZeroData";
import * as Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import * as Locations from "VSS/Locations";

export class DirectoryZeroData {
    private static zeroDataProps: ZeroData.Props = {
        primaryText: Resources.DashboardZeroData_PrimaryText,
        imageUrl: Locations.urlHelper.getVersionedContentUrl('Dashboards/zerodata-no-dashboard.png'),
        secondaryText: Resources.DashboardZeroData_SecondaryText
    }

    public static renderZeroDataElement(): JSX.Element {
        return <ZeroData.ZeroData {...DirectoryZeroData.zeroDataProps} />;
    }
}
