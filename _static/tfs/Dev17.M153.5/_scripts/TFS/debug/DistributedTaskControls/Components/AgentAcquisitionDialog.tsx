/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import Q = require("q");

import { ExternalLink } from "DistributedTaskControls/Components/ExternalLink";
import { Component as TabContent } from "DistributedTaskControls/Components/TabContent";
import { AgentPackagesStore, IAgentLatestPackage, getStore } from "DistributedTaskControls/Stores/AgentPackages";
import { CopyButton } from "DistributedTaskControls/Components/CopyButton";
import { Component as Markdown } from "DistributedTaskControls/Components/MarkdownRenderer";
import TaskResources = require("DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls");
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { Label } from "OfficeFabric/Label";
import { Link, ILinkProps } from "OfficeFabric/Link";

import { PackageMetadata } from "TFS/DistributedTask/Contracts";

import { IModalDialogOptions, ModalDialogO } from "VSS/Controls/Dialogs";
import { getService as getEventService, CommonActions } from "VSS/Events/Action";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Url from "VSS/Utils/Url";

import { State } from "VSS/Flux/Component";
import { Component as TabPanel, TabItemProps } from "VSSPreview/Flux/Components/TabPanel";
import { ButtonComponent as Button } from "VSSPreview/Flux/Components/Button";

import TabContentControl_NO_REQUIRE = require("VSS/Controls/TabContent");

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/AgentAcquisitionDialog";

class PackageTypes {
    // netcore 1.x
    public static Windows_7 = "win7-x64";
    public static Osx_10_11 = "osx.10.11-x64";
    public static Ubuntu_14 = "ubuntu.14.04-x64";
    public static Ubuntu_16 = "ubuntu.16.04-x64";
    public static RedHat_72 = "rhel.7.2-x64";
    public static Ubuntu = "ubuntu";

    // netcore 2.x
    public static Windows = "win-x64";
    public static Osx = "osx-x64";
    public static Linux = "linux-x64";

    // netcore 2.1
    public static Windows_64 = "win-x64";
    public static Windows_86 = "win-x86";
    //public static Osx = "osx-x64";
    public static Linux_64 = "linux-x64";
    public static Linux_arm = "linux-arm";
}

export class PackagePlatforms {
    public static Windows = "windows";
    public static Linux = "linux";
    public static Darwin = "darwin";
}

export interface IAgentAcquisitionGuidance {
    prerequisites?: string;
    createAgentScript?: string;
    configureAgentScript?: string;
    runAgentScript?: string;
    detailedInstructionsLink?: string;
}

export interface IAgentAcquisitionDialogOptions extends IModalDialogOptions {
    agentPackagesStore?: AgentPackagesStore;
    agentAcquisitionGuidances: IDictionaryStringTo<IAgentAcquisitionGuidance>;
}

export class AgentAcquisitionDialog extends ModalDialogO<IAgentAcquisitionDialogOptions> {
    public initializeOptions(options?: any) {
        super.initializeOptions(JQueryWrapper.extend({
            title: TaskResources.AgentAcquisitionDialogTitle,
            width: 800,
            height: 900,
            resizable: false,
            coreCssClass: "agent-acquisition-dialog",
            // no buttons
            buttons: []
        }, options));
    }

    public initialize() {
        super.initialize();

        ReactDOM.render(<AgentAcquisitionDialogView {...this._options} />, this._element[0]);
    }

    public close(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super.close();
    }
}

interface IAgentAcquisitionDialogState extends State {
    packages: IDictionaryStringTo<IAgentLatestPackage>;
    isDotnetCoreV21Agent: boolean;
}

/**
 * Controller-view for the agent acquisition dialog.
 */
class AgentAcquisitionDialogView extends React.Component<IAgentAcquisitionDialogOptions, IAgentAcquisitionDialogState> {
    private _agentPackagesStore: AgentPackagesStore;
    private _onStoresUpdated: () => void;

    constructor(props: IAgentAcquisitionDialogOptions) {
        super(props);

        this._agentPackagesStore = props.agentPackagesStore || getStore(null, true);

        this.state = this._getState();

        this._onStoresUpdated = () => {
            this.setState(this._getState());
        };
    }

    public render(): JSX.Element {
        if (this.state.isDotnetCoreV21Agent) {
            return <AgentAcquisitionDialogBody packages={this.state.packages} agentAcquisitionGuidances={this.props.agentAcquisitionGuidances} />;
        } else {
            return <AgentNetCoreV2AcquisitionDialogBody packages={this.state.packages} agentAcquisitionGuidances={this.props.agentAcquisitionGuidances} />;
        }
    }

    public componentDidMount() {
        this._agentPackagesStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._agentPackagesStore.removeChangedListener(this._onStoresUpdated);
    }

    private _getState(): IAgentAcquisitionDialogState {
        let packages: IDictionaryStringTo<IAgentLatestPackage> = {};

        const isNetCoreV21 = this._agentPackagesStore.IsDotnetCoreV21Agent();
        if (isNetCoreV21) {
            packages[PackageTypes.Windows_64] = this._agentPackagesStore.getLatestPackage(PackageTypes.Windows_64);
            packages[PackageTypes.Windows_86] = this._agentPackagesStore.getLatestPackage(PackageTypes.Windows_86);
            packages[PackageTypes.Osx] = this._agentPackagesStore.getLatestPackage(PackageTypes.Osx);
            packages[PackageTypes.Linux_64] = this._agentPackagesStore.getLatestPackage(PackageTypes.Linux_64);
            packages[PackageTypes.Linux_arm] = this._agentPackagesStore.getLatestPackage(PackageTypes.Linux_arm);
        }
        else {
            packages[PackageTypes.Windows] = this._agentPackagesStore.getLatestPackage(PackageTypes.Windows);
            packages[PackageTypes.Osx] = this._agentPackagesStore.getLatestPackage(PackageTypes.Osx);
            packages[PackageTypes.Linux] = this._agentPackagesStore.getLatestPackage(PackageTypes.Linux);
        }

        return {
            packages: packages,
            isDotnetCoreV21Agent: isNetCoreV21
        };
    }
}

interface IAgentAcquisitionDialogBodyProps {
    packages: IDictionaryStringTo<IAgentLatestPackage>;
    agentAcquisitionGuidances: IDictionaryStringTo<IAgentAcquisitionGuidance>;
}

class AgentAcquisitionDialogBody extends React.Component<IAgentAcquisitionDialogBodyProps, State> {
    public render(): JSX.Element {
        let tabItems: JSX.Element[] = [];
        let windowsagentAcquisitionGuidance = this.props.agentAcquisitionGuidances[PackagePlatforms.Windows];
        if (windowsagentAcquisitionGuidance) {
            let windows86Package = this.props.packages[PackageTypes.Windows_86];
            let windows64Package = this.props.packages[PackageTypes.Windows_64];

            if (windows86Package && windows64Package) {
                let windowsPackages: IDictionaryStringTo<IAgentLatestPackage[]> = {};
                windowsPackages[PackagePlatforms.Windows] = [windows86Package, windows64Package];

                tabItems.push(<AgentPackageComplexTab key={PackagePlatforms.Windows} tabKey={PackagePlatforms.Windows} title={TaskResources.AgentAcquisitionPlatformWindows} packages={windowsPackages} platform={PackagePlatforms.Windows} agentAcquisitionGuidance={windowsagentAcquisitionGuidance} />);
            }
        }

        let darwinagentAcquisitionGuidance = this.props.agentAcquisitionGuidances[PackagePlatforms.Darwin];
        if (darwinagentAcquisitionGuidance) {
            let osxPackage = this.props.packages[PackageTypes.Osx];
            if (osxPackage) {
                tabItems.push(<AgentPackageSingleTab key={PackagePlatforms.Darwin} tabKey={PackagePlatforms.Darwin} title={TaskResources.AgentAcquisitionPlatformOsx} agentPackages={[osxPackage]} agentAcquisitionGuidance={darwinagentAcquisitionGuidance} />);
            }
        }

        let linuxagentAcquisitionGuidance = this.props.agentAcquisitionGuidances[PackagePlatforms.Linux];
        if (linuxagentAcquisitionGuidance) {
            let linux64Package = this.props.packages[PackageTypes.Linux_64];
            let linuxARMPackage = this.props.packages[PackageTypes.Linux_arm];

            if (linux64Package && linuxARMPackage) {
                let linuxPackages: IDictionaryStringTo<IAgentLatestPackage[]> = {};
                linuxPackages[PackagePlatforms.Linux] = [linux64Package, linuxARMPackage];

                tabItems.push(<AgentPackageComplexTab key={PackagePlatforms.Linux} tabKey={PackagePlatforms.Linux} title={TaskResources.AgentAcquisitionPlatformLinux} packages={linuxPackages} platform={PackagePlatforms.Linux} agentAcquisitionGuidance={linuxagentAcquisitionGuidance} />);
            }
        }
        let selectedKey: string = "";
        let os = window.navigator.appVersion;
        if (os) {
            if (os.toLowerCase().indexOf("windows") > 0) {
                selectedKey = PackagePlatforms.Windows;
            }

            else if (os.toLowerCase().indexOf("os x") > 0) {
                selectedKey = PackagePlatforms.Darwin;
            }

            else if (os.toLowerCase().indexOf("linux") > 0) {
                selectedKey = PackagePlatforms.Linux;
            }
        }

        if (!selectedKey && tabItems.length > 0) {
            selectedKey = tabItems[0].props.tabKey;
        }

        return <div>
            <TabPanel cssClass="bowtie agent-acquisition-tabs" selectedKey={selectedKey}>
                {tabItems}
            </TabPanel>
        </div>;
    }
}

class AgentNetCoreV2AcquisitionDialogBody extends React.Component<IAgentAcquisitionDialogBodyProps, State> {
    public render(): JSX.Element {
        let tabItems: JSX.Element[] = [];
        let windowsagentAcquisitionGuidance = this.props.agentAcquisitionGuidances[PackagePlatforms.Windows];
        if (windowsagentAcquisitionGuidance) {
            let windowsPackage = this.props.packages[PackageTypes.Windows];
            if (windowsPackage) {
                tabItems.push(<AgentPackageSingleTab key={PackagePlatforms.Windows} tabKey={PackagePlatforms.Windows} title={TaskResources.AgentAcquisitionPlatformWindows} agentPackages={[windowsPackage]} agentAcquisitionGuidance={windowsagentAcquisitionGuidance} />);
            }
        }

        let darwinagentAcquisitionGuidance = this.props.agentAcquisitionGuidances[PackagePlatforms.Darwin];
        if (darwinagentAcquisitionGuidance) {
            let osxPackage = this.props.packages[PackageTypes.Osx];
            if (osxPackage) {
                tabItems.push(<AgentPackageSingleTab key={PackagePlatforms.Darwin} tabKey={PackagePlatforms.Darwin} title={TaskResources.AgentAcquisitionPlatformOsx} agentPackages={[osxPackage]} agentAcquisitionGuidance={darwinagentAcquisitionGuidance} />);
            }
        }

        let linuxagentAcquisitionGuidance = this.props.agentAcquisitionGuidances[PackagePlatforms.Linux];
        if (linuxagentAcquisitionGuidance) {
            let linuxPackage = this.props.packages[PackageTypes.Linux];
            if (linuxPackage) {
                tabItems.push(<AgentPackageSingleTab key={PackagePlatforms.Linux} tabKey={PackagePlatforms.Linux} title={TaskResources.AgentAcquisitionPlatformLinux} agentPackages={[linuxPackage]} agentAcquisitionGuidance={linuxagentAcquisitionGuidance} />);
            }
        }
        let selectedKey: string = "";
        let os = window.navigator.appVersion;
        if (os) {
            if (os.toLowerCase().indexOf("windows") > 0) {
                selectedKey = PackagePlatforms.Windows;
            }

            else if (os.toLowerCase().indexOf("os x") > 0) {
                selectedKey = PackagePlatforms.Darwin;
            }


            else if (os.toLowerCase().indexOf("linux") > 0) {
                selectedKey = PackagePlatforms.Linux;
            }
        }

        if (!selectedKey && tabItems.length > 0) {
            selectedKey = tabItems[0].props.tabKey;
        }

        return <div>
            <TabPanel cssClass="bowtie agent-acquisition-tabs" selectedKey={selectedKey}>
                {tabItems}
            </TabPanel>
        </div>;
    }
}

interface IAgentAcquisitionTabItemOptions extends TabItemProps {
    packages: IDictionaryStringTo<IAgentLatestPackage[]>;
    platform: string;
    agentAcquisitionGuidance: IAgentAcquisitionGuidance;
}

class AgentPackageComplexTab extends React.Component<IAgentAcquisitionTabItemOptions, State> {
    public render(): JSX.Element {
        let tabGroups: TabContentControl_NO_REQUIRE.ITabGroup[] = [];
        let tabsExist: boolean = false;
        if (Utils_String.equals(this.props.platform, PackagePlatforms.Windows, true)) {
            let windowsPackages = this.props.packages[PackagePlatforms.Windows];
            let windowsTabs: TabContentControl_NO_REQUIRE.ITab<IPackageTabOptions>[] = windowsPackages.map((windowsPackage, index) => {
                let tab: TabContentControl_NO_REQUIRE.ITab<IPackageTabOptions> = {
                    id: windowsPackage.version,
                    order: index,
                    tabContent: GeneralPackageTabContent,
                    title: getAgentPlatformArchitectureName(windowsPackage.package),
                    tabContentOptions: {
                        agentPackage: windowsPackage,
                        prerequisitesHref: this.props.agentAcquisitionGuidance.prerequisites,
                        agentAcquisitionGuidance: this.props.agentAcquisitionGuidance
                    }
                };

                tabsExist = true;
                return tab;
            });

            tabGroups.push({
                id: PackagePlatforms.Windows,
                order: 1,
                tabs: windowsTabs,
                title: ""
            }
            );
        }

        if (Utils_String.equals(this.props.platform, PackagePlatforms.Linux, true)) {
            let linuxPackages = this.props.packages[PackagePlatforms.Linux];
            let linuxTabs: TabContentControl_NO_REQUIRE.ITab<IPackageTabOptions>[] = linuxPackages.map((linuxPackage, index) => {
                let tab: TabContentControl_NO_REQUIRE.ITab<IPackageTabOptions> = {
                    id: linuxPackage.version,
                    order: index,
                    tabContent: GeneralPackageTabContent,
                    title: getAgentPlatformArchitectureName(linuxPackage.package),
                    tabContentOptions: {
                        agentPackage: linuxPackage,
                        prerequisitesHref: this.props.agentAcquisitionGuidance.prerequisites,
                        agentAcquisitionGuidance: this.props.agentAcquisitionGuidance
                    }
                };

                tabsExist = true;
                return tab;
            });

            tabGroups.push(
                {
                    id: PackagePlatforms.Linux,
                    order: 1,
                    tabs: linuxTabs,
                    title: ""
                },
            );
        }

        if (tabsExist) {
            return <TabContent groups={tabGroups} savingMode={TabContentControl_NO_REQUIRE.TabControlSavingMode.NONE} />;
        }
        else {
            return (<span>{TaskResources.Loading}</span>);
        }
    }
}

interface IPackageTabOptions {
    agentPackage: IAgentLatestPackage;
    agentAcquisitionGuidance: IAgentAcquisitionGuidance;
}

class PackageTabContent {
    protected _options: IPackageTabOptions;

    constructor(options: IPackageTabOptions) {
        this._options = options;
    }

    protected renderHtml(html: string) {
        return {
            __html: html
        };
    }

    public getAgentPackage() {
        return this._options.agentPackage;
    }

    public getAgentAcquisitionGuidance(): IAgentAcquisitionGuidance {
        return this._options.agentAcquisitionGuidance;
    }
}

class GeneralPackageTabContent extends PackageTabContent implements TabContentControl_NO_REQUIRE.ITabContent {
    constructor(options: IPackageTabOptions) {
        super(options);
    }

    private _getContent(): JSX.Element {
        // currently we get only one version
        let agentPackage = this.getAgentPackage();
        let filename: string = getAgentPackageFilename(agentPackage);
        let moreInfo: JSX.Element = null;
        if (agentPackage.package.infoUrl) {
            moreInfo = <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionMoreInfoTitle}</div>
                <div className="step-content"><MoreInformationLink href={agentPackage.package.infoUrl} /></div>
            </div>;
        }

        /* tslint:disable:react-no-dangerous-html */
        return <div className="agent-acquisition">
            <SystemPrerequisites href={this.getAgentAcquisitionGuidance().prerequisites} />
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionConfigureAccountTitle}</div>
                <div className="step-content" dangerouslySetInnerHTML={this.renderHtml(TaskResources.AgentAcquisitionConfigureAccountHtml)}></div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionDownloadAgentTitle}</div>
                <div className="step-content">
                    <DownloadButton agentPackage={agentPackage} />
                </div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionCreateAgentTitle}</div>
                <div className="step-content powershell"><Markdown markdown={Utils_String.format(this.getAgentAcquisitionGuidance().createAgentScript, filename)} /></div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionConfigureAgentTitle}</div>
                <div className="step-header-details"><ExternalLink text={TaskResources.AgentAcquisitionConfigureAgentDetailedInstructions} newTab={true} href={this.getAgentAcquisitionGuidance().detailedInstructionsLink} /></div>
                <div className="step-content powershell"><Markdown markdown={Utils_String.format(this.getAgentAcquisitionGuidance().configureAgentScript, filename)} /></div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionRunAgentOptionallyTitle}</div>
                <div className="step-content powershell">
                    <Label>{TaskResources.AgentAcquisitionRunAgentOptionallyInfo}</Label>
                    <Markdown markdown={this.getAgentAcquisitionGuidance().runAgentScript} />
                </div>
            </div>
            {moreInfo}
        </div>;
        /* tslint:enable:react-no-dangerous-html */
    }

    public isDirty(): boolean {
        return false;
    }

    public beginLoad($container: JQuery): IPromise<any> {
        ReactDOM.render(this._getContent(), $container[0]);
        return Q.resolve(null);
    }
}

interface IPackageTabItemProps extends TabItemProps {
    agentPackages: IAgentLatestPackage[];
    agentAcquisitionGuidance: IAgentAcquisitionGuidance;
}

class PackageTabItemComponent extends React.Component<IPackageTabItemProps, State> {
    protected renderHtml(html: string) {
        return {
            __html: html
        };
    }
}

class AgentPackageSingleTab extends PackageTabItemComponent {
    public render(): JSX.Element {
        let moreInfo: JSX.Element = null;
        // currently we get only one version
        let agentPackage = this.props.agentPackages[0];
        let filename: string = getAgentPackageFilename(agentPackage);

        if (agentPackage.package.infoUrl) {
            moreInfo = <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionMoreInfoTitle}</div>
                <div className="step-content"><MoreInformationLink href={agentPackage.package.infoUrl} /></div>
            </div>;
        }

        /* tslint:disable:react-no-dangerous-html */
        return <div className="agent-acquisition">
            <SystemPrerequisites href={this.props.agentAcquisitionGuidance.prerequisites} />
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionConfigureAccountTitle}</div>
                <div className="step-content" dangerouslySetInnerHTML={this.renderHtml(TaskResources.AgentAcquisitionConfigureAccountHtml)}></div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionDownloadAgentTitle}</div>
                <div className="step-content">
                    <DownloadButton agentPackage={this.props.agentPackages[0]} />
                </div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionCreateAgentTitle}</div>
                <div className="step-content powershell"><Markdown markdown={Utils_String.format(this.props.agentAcquisitionGuidance.createAgentScript, filename)} /></div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionConfigureAgentTitle}</div>
                <div className="step-header-details"><ExternalLink text={TaskResources.AgentAcquisitionConfigureAgentDetailedInstructions} newTab={true} href={this.props.agentAcquisitionGuidance.detailedInstructionsLink} /></div>
                <div className="step-content powershell"><Markdown markdown={Utils_String.format(this.props.agentAcquisitionGuidance.configureAgentScript, filename)} /></div>
            </div>
            <div className="step">
                <div className="step-header">{TaskResources.AgentAcquisitionRunAgentOptionallyTitle}</div>
                <div className="step-content powershell">
                    <Label>{TaskResources.AgentAcquisitionRunAgentOptionallyInfo}</Label>
                    <Markdown markdown={this.props.agentAcquisitionGuidance.runAgentScript} />
                </div>
            </div>
            {moreInfo}
        </div>;
        /* tslint:enable:react-no-dangerous-html */
    }
}

const MoreInformationLink = (props: ILinkProps) =>
    <Link {...props}>{TaskResources.MoreInformation}</Link>;

interface ISystemPrerequisitesProps {
    href: string;
}

class SystemPrerequisites extends React.Component<ISystemPrerequisitesProps, State> {

    public render(): JSX.Element {

        return <div className="preview-warning">
            <SafeLink target="_blank" href={this.props.href}>{TaskResources.SystemPrerequisites}</SafeLink>
        </div>;
    }
}

interface IDownloadButtonProps {
    agentPackage: IAgentLatestPackage;
}

class DownloadButton extends React.Component<IDownloadButtonProps, State> {
    public render(): JSX.Element {
        if (this.props.agentPackage && this.props.agentPackage.package && this.props.agentPackage.package.downloadUrl) {
            return <div className="agent-download-row">
                <span className="column"><Button text={TaskResources.Download} cssClass="btn-cta" onClick={this._onDownloadClick} /></span>
                <span className="column copy-column"><CopyButton copyTitle={TaskResources.CopyUrlToClipboard} copyText={this.props.agentPackage.package.downloadUrl} copyAsHtml={false} /></span>
            </div>;
        }
    }

    private _onDownloadClick = () => {
        UrlUtilities.navigateTo(this.props.agentPackage.package.downloadUrl);
    }
}

function getAgentPackageFilename(agentPackage: IAgentLatestPackage): string {
    if (!agentPackage || !agentPackage.package) {
        return "";
    }

    let filename: string = agentPackage.package.filename;
    if (!filename) {
        let uri: Utils_Url.Uri = Utils_Url.Uri.parse(agentPackage.package.downloadUrl);
        filename = uri.path.substring(uri.path.lastIndexOf("/") + 1);
    }

    return filename;
}

function getAgentPlatformArchitectureName(agentPackage: PackageMetadata): string {
    if (!agentPackage) {
        return "";
    }

    if (Utils_String.equals(agentPackage.platform, PackageTypes.Windows_64) || Utils_String.equals(agentPackage.platform, PackageTypes.Linux_64) || Utils_String.equals(agentPackage.platform, PackageTypes.Osx)) {
        return "x64";
    }
    else if (Utils_String.equals(agentPackage.platform, PackageTypes.Windows_86)) {
        return "x86";
    }
    else if (Utils_String.equals(agentPackage.platform, PackageTypes.Linux_arm)) {
        return "ARM";
    }
}