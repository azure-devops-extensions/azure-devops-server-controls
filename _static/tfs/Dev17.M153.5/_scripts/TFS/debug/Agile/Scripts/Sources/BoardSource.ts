import { BoardArtifact } from './../Models/Board/BoardArtifact';
import { getClient } from "TFS/Boards/RestClient";
import { BoardReference } from "TFS/Boards/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";

export interface IBoardSource {
    fetchIdBoards(): Promise<BoardArtifact[]>;
}

export class BoardSource implements IBoardSource {
    /**
     * Gets all Id boards for current project.
     */
    public fetchIdBoards(): Promise<BoardArtifact[]> {
        const boardClient = getClient();
        const project = getDefaultWebContext().project;
        const projectId = project.id;
       
        return toNativePromise(
            boardClient.getBoards(projectId)
            .then(
                (boardResources: BoardReference[]) => {
                    return boardResources.map((boardResources) => this.fromWebApiBoard(boardResources));
                }
            )
        );
    }

     /**
     * Create BoardArtifact from the BoardWebApi response
     * @param boardData The board from the web api
     */
    private fromWebApiBoard(boardData: BoardReference): BoardArtifact {
        if(boardData) {
            return new BoardArtifact({
                name: boardData.name,
                id: boardData.id.toString(),
                isIdBoard: true
            });
        }
    }
}