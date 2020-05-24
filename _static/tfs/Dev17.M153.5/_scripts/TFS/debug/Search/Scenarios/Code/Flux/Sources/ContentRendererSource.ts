import * as _TFSContentRenderer from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { using } from "VSS/VSS";

export class ContentRendererSource {
    public getRenderer(fileExt: string): IPromise<_TFSContentRenderer.IContentRenderer> {
        return new Promise<_TFSContentRenderer.IContentRenderer>((resolve, reject) => {
            using([
                "Presentation/Scripts/TFS/TFS.ContentRendering"
            ], (TFSContentRenderer: typeof _TFSContentRenderer) => {
                TFSContentRenderer.ContentRendererFactory.getRendererForExtension(fileExt).then(resolve, reject)
            }, reject);
        });
    }
}