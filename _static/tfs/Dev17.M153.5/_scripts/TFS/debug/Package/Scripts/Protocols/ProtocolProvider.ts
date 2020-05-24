/* tslint:disable:no-require-imports */
import * as Diag from "VSS/Diag";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";

import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { IPackageProtocol } from "Package/Scripts/Protocols/Common/IPackageProtocol";
import Lazy_IvyPackageProtocol = require("Package/Scripts/Protocols/Ivy/IvyPackageProtocol");
import { MavenPackageProtocol } from "Package/Scripts/Protocols/Maven/MavenPackageProtocol";
import { NpmPackageProtocol } from "Package/Scripts/Protocols/Npm/NpmPackageProtocol";
import { NuGetPackageProtocol } from "Package/Scripts/Protocols/NuGet/NuGetPackageProtocol";
import Lazy_PyPiPackageProtocol = require("Package/Scripts/Protocols/PyPi/PyPiPackageProtocol");
import Lazy_UPackPackageProtocol = require("Package/Scripts/Protocols/UPack/UPackPackageProtocol");

export class ProtocolProvider {
    private static _packageProtocols: IDictionaryStringTo<IPackageProtocol>;
    private static nameMap: IDictionaryStringTo<string>;

    public static async initializeProtocols(): Promise<void> {
        const webPageDataService = Service.getService(HubWebPageDataService);
        const promises: Array<Promise<void>> = [];
        const packageProtocols: IDictionaryStringTo<IPackageProtocol> = {};
        ProtocolProvider.nameMap = {};

        const addProtocol = (protocol: IPackageProtocol) => {
            ProtocolProvider.nameMap[protocol.key.toLowerCase()] = protocol.key;
            packageProtocols[protocol.key] = protocol;
        };

        addProtocol(new NuGetPackageProtocol());
        addProtocol(new NpmPackageProtocol());
        addProtocol(new MavenPackageProtocol());

        if (webPageDataService.isUPackUIEnabled()) {
            // Lazy load only if FF is enabled
            const loadProtocol = async () => {
                const module: typeof Lazy_UPackPackageProtocol = (await VSS.requireModules([
                    "Package/Scripts/Protocols/UPack/UPackPackageProtocol"
                ]))[0];
                addProtocol(new module.UPackPackageProtocol());
            };
            promises.push(loadProtocol());
        }

        if (webPageDataService.isIvyUIEnabled()) {
            // Lazy load only if FF is enabled
            const loadProtocol = async () => {
                const module: typeof Lazy_IvyPackageProtocol = (await VSS.requireModules([
                    "Package/Scripts/Protocols/Ivy/IvyPackageProtocol"
                ]))[0];
                addProtocol(new module.IvyPackageProtocol());
            };
            promises.push(loadProtocol());
        }

        if (webPageDataService.isPyPiUIEnabled()) {
            // Lazy load only if FF is enabled
            const loadProtocol = async () => {
                const module: typeof Lazy_PyPiPackageProtocol = (await VSS.requireModules([
                    "Package/Scripts/Protocols/PyPi/PyPiPackageProtocol"
                ]))[0];
                addProtocol(new module.PyPiPackageProtocol());
            };
            promises.push(loadProtocol());
        }

        await Promise.all(promises);
        ProtocolProvider._packageProtocols = packageProtocols;
    }

    public static get(protocolType: string, throwIfMissing = false): IPackageProtocol {
        Diag.Debug.assertParamIsStringNotEmpty(protocolType, "protocolType");

        const protocols = ProtocolProvider._packageProtocols;
        Diag.Debug.assertIsObject(protocols, "ProtocolProvider has not been initialized");

        const key = ProtocolProvider.nameMap[protocolType.toLowerCase()];
        const protocol = (key && protocols[key]) || null;
        if (!protocol && throwIfMissing) {
            // TODO: Review
            throw Error(`Couldn't find protocol provider for ${protocolType}`);
        }

        return protocol;
    }

    public static getProtocols(): IPackageProtocol[] {
        // Ideally this would be "Object.values(ProtocolProvider._packageProtocols)", but .values is not supported yet
        const protocols = ProtocolProvider._packageProtocols;
        return Object.keys(protocols).map(key => protocols[key]);
    }

    public static getEnabledProtocolTypes(): IDictionaryStringTo<IPackageProtocol> {
        return { ...ProtocolProvider._packageProtocols };
    }
}
