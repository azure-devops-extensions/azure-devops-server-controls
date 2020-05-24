// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as Context from "VSS/Context";
import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";

export namespace AddTargetGuidanceResourceTypes {
    export const DeploymentPool = "DeploymentPool";
    export const DeploymentGroup = "DeploymentGroup";
}

export namespace DeploymentGroupsConstants {
    export const Windows = "win-x64";
    export const Linux = "linux-x64";

    export const Windows_7 = "win7-x64";
    export const Ubuntu14_04 = "ubuntu.14.04-x64"; 
    export const Ubuntu16_04 = "ubuntu.16.04-x64";
    export const RedHat7_2 = "rhel.7.2-x64";
}

export namespace PackageTypes {
    // netcore 1.x
    export const Windows_7 = "win7-x64";
    export const Osx_10_11 = "osx.10.11-x64";
    export const Ubuntu_14 = "ubuntu.14.04-x64";
    export const Ubuntu_16 = "ubuntu.16.04-x64";
    export const RedHat_72 = "rhel.7.2-x64";

    // netcore 2.x
    export const Windows = "win-x64";
    export const Osx = "osx-x64";
    export const Linux = "linux-x64";
}

export namespace MachineGroupsForwardLinks {
    export const LearnMoreAboutMachineGroupsLink = "https://aka.ms/832442";
    export const InstructionToConfigureWindowsAgent = "https://aka.ms/832440";
    export const InstructionToConfigureLinuxAgent = "https://aka.ms/832441";
    export const InstructionToConfigureDarwinAgent = "https://aka.ms/832438";
    export const LearnMoreAboutPAT = "https://go.microsoft.com/fwlink/?linkid=846962";
}

export namespace AddTargetGuidanceErrorActions {
    export const UpdatePATTokenErrorMessage = "UpdatePATTokenErrorMessage";
}

export class UrlHelper {
    public static getAccountUri(): string {
        let pageContext = Context.getPageContext();
        return pageContext.webContext.account.uri;
    }

    public static getProjectName(): string {
        let pageContext = Context.getPageContext();
        return pageContext.webContext.project.name;
    }

    public static getProjectId(): string{
        var pageContext = Context.getPageContext();
        return pageContext.webContext.project.id;
    }
}

export function getCollectionName(): string {
    let pageContext = Context.getPageContext();
    return pageContext.webContext.collection.name;
}

export function isHostedType() {
    let pageContext = Context.getPageContext();
    return pageContext.webAccessConfiguration.isHosted;
}

export function canUseHttpsProtocol(): boolean {
    let pageContext = Context.getPageContext();
    return pageContext.webAccessConfiguration.isHosted || pageContext.webContext.host.scheme.toLowerCase() == 'https';
}

export function getFabricIcon(name: string): IVssIconProps {
    return {
        iconName: name,
        iconType: VssIconType.fabric
    };
}

export namespace AgentConfigurationScripts {
    export const Windows = "If(-NOT (Test-Path $env:SystemDrive\\'azagent')){{mkdir $env:SystemDrive\\'azagent'}}; cd $env:SystemDrive\\'azagent'; for($i=1; $i -lt 100; $i++){{$destFolder=\"A\"+$i.ToString();if(-NOT (Test-Path ($destFolder))){{mkdir $destFolder;cd $destFolder;break;}}}}; $agentZip=\"$PWD\\agent.zip\";$DefaultProxy=[System.Net.WebRequest]::DefaultWebProxy;$securityProtocol=@();$securityProtocol+=[Net.ServicePointManager]::SecurityProtocol;$securityProtocol+=[Net.SecurityProtocolType]::Tls12;[Net.ServicePointManager]::SecurityProtocol=$securityProtocol;$WebClient=New-Object Net.WebClient; $Uri='{0}';if($DefaultProxy -and (-not $DefaultProxy.IsBypassed($Uri))){{$WebClient.Proxy= New-Object Net.WebProxy($DefaultProxy.GetProxy($Uri).OriginalString, $True);}}; $WebClient.DownloadFile($Uri, $agentZip);Add-Type -AssemblyName System.IO.Compression.FileSystem;[System.IO.Compression.ZipFile]::ExtractToDirectory( $agentZip, \"$PWD\");.\\config.cmd {1} --agent $env:COMPUTERNAME --runasservice --work '_work' --url '{2}'{3}{4}{5}; Remove-Item $agentZip;";
    export const LinuxService = "mkdir azagent;cd azagent;curl -fkSL -o vstsagent.tar.gz {0};tar -zxvf vstsagent.tar.gz;./config.sh {1} --acceptteeeula --agent $HOSTNAME --url {2} --work _work{3}{4}{5} --runasservice;sudo ./svc.sh install;sudo ./svc.sh start";
    export const LinuxInteractive = "mkdir azagent;cd azagent;curl -fkSL -o vstsagent.tar.gz {0};tar -zxvf vstsagent.tar.gz;./config.sh {1} --acceptteeeula --agent $HOSTNAME --url {2} --work _work{3}{4}{5};./run.sh";
    export const Linux = "mkdir azagent;cd azagent;curl -fkSL -o vstsagent.tar.gz {0};tar -zxvf vstsagent.tar.gz; if [ -x \"$(command -v systemctl)\" ]; then ./config.sh {1} --acceptteeeula --agent $HOSTNAME --url {2} --work _work{3}{4}{5} --runasservice; sudo ./svc.sh install; sudo ./svc.sh start; else ./config.sh {1} --acceptteeeula --agent $HOSTNAME --url {2} --work _work{3}{4}{5}; ./run.sh; fi";
    export const CollectionName = " --collectionname '{0}'";
    export const PSAdminPromptCheck = "$ErrorActionPreference=\"Stop\";If(-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent() ).IsInRole( [Security.Principal.WindowsBuiltInRole] “Administrator”)){{ throw \"{0}\"}};";
    export const PSMinVersionCheck = "If($PSVersionTable.PSVersion -lt (New-Object System.Version(\"3.0\"))){{ throw \"{0}\" }};";
    export const DeploymentGroupParams = "--deploymentgroup --deploymentgroupname \"{0}\"";
    export const DeploymentPoolParams = "--deploymentpool --deploymentpoolname \"{0}\"";
    export const ProjectParams = " --projectname '{0}'";
    export const AuthParamIntegrated = " --auth Integrated";
    export const AuthParamNegotiate = " --auth Negotiate";
    export const AuthParameters = " --auth PAT --token {0}";
    export const ScriptFormatPowerShell = "```powershell\r\n{0}\r\n```";
    export const ScriptFormatBash = "```bash\r\n{0}\r\n```";
}

export namespace artifactType {
    export const git = "Git";
    export const build = "Build";
    export const tfvc= "TFVC";
    export const github = "GitHub";
    export const jenkins = "Jenkins";
    export const artifactIconClass = {
        "Git": "bowtie-icon bowtie-brand-git",
        "Build": "bowtie-icon bowtie-build",
        "TFVC": "bowtie-icon bowtie-brand-tfvc",
        "GitHub": "bowtie-icon bowtie-brand-github",
        "Jenkins": "bowtie-icon bowtie-brand-jenkins"
    };
}

export const SEARCH_INPUT_CHANGE_DELAY = 500;