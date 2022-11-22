
type TEventType =
    'Create' |
    'DeletePosition' |
    'LineUpdated' |
    'Load' |
    'ModeChanged' |
    'Move' |
    'MoveBackward' |
    'MoveForward' |
    'SelectLineEnd' |
    'SelectLineStart' |
    'SelectNode' |
    'TimeControlUpdated' |
    'Undo' |
    'UpdateOptions';

interface IGameEvent
{
    data: any;
    type: TEventType
}

interface Marking
{
    type: string; // ["arrow", "effect", ..]
    key?: string; // "arrow|e2e4", "effect|e4"
    node?: boolean; // set to true will make it hidden when moving forward/backward in the game
    persistent?: boolean; // set to false when you want it to be removed when user interact with the board
    data: {
        from?: string;
        to?: string;
        square?: string;
        color?: string;
        opacity?: number; // between 0 and 1
        type?: string;
    }
}

interface IGameHistory
{
    from: string;
    to: string;
    san: string;

    beforeFen: string;
    fen: string;

    piece: string;
    flags: number;

    hash: number[];
    wholeMoveNumber: number; // move number in notation (floor(num/2))
}

// game eco theory
interface GameECO
{
    ml: string; // moves by theory, in full notation, ex: "e2e4 c7c5 g1f3 a7a6 c2c3 b7b5"
    m: string; // moves by theory, in san, ex: "1.e4 c5 2.Nf3 a6 3.c3 b5"
    n: string; // theory name, ex: "Sicilian Defense: O'Kelly, Venice, Ljubojević Line"
    u: string; // theory name, ex: "Sicilian-Defense-OKelly-Venice-Ljubojevic-Line"
}

interface GameOptions
{
    allowMarkings: boolean;
    analysisHighlightColors: {
        alt: string;
        ctrl: string;
        default: string;
        shift: string;
    },

    analysisHighlightOpacity: 0.8;
    animationType: string; // "default"
    arrowColors: {
        alt: string;
        ctrl: string;
        default: string;
        shift: string;
    },
    aspectRatio: 1
    autoClaimDraw: boolean;
    autoPromote: boolean;
    autoResize: boolean;
    boardStyle: string; // "green"
    captureKeyStrokes: boolean
    checkBlinkingSquareColor: string; // "#ff0000"
    coordinates: string; // "inside"
    darkMode: boolean;
    diagramStyle: boolean;
    enabled: boolean;
    fadeSetup: number; // 0
    flipped: boolean;
    highlightLegalMoves: boolean;
    highlightMoves: boolean;
    highlightOpacity: number; // 0.5
    hoverSquareOutline: boolean;
    id: string;
    moveListContextMenuEnabled: boolean;
    moveListDisplayType: string; // "figurine"
    moveMethod: string; // "drag"
    overlayInAnalysisMode: boolean
    pieceStyle: string; // "neo"
    playSounds: boolean;
    premoveDelay: number; // 200
    premoveHighlightColor: string; // "#f42a32"
    premoveHighlightOpacity: number; // 0.5
    rounded: boolean;
    soundTheme: string; // "default"
    threatSquareColor: string; // "#ff0000"
    threatSquareOpacity: number; // 0.8
    useSharedStyleTag: boolean;
    boardSize: string; // "auto"
    isWhiteOnBottom: boolean;
    showTimestamps: boolean;
    test: boolean;
}

interface IMoveDetails
{
    from: string;
    to: string;
    san?: string;
    promotion?: string;
    piece?: string;

    time?: number; // only available when play online

    // only own move
    color?: number; // 1 for white, 2 for black
    lines?: null; // unk
    userGenerated?: boolean;
    userGeneratedDrop?: boolean;

    // ANY_CAPTURE: 5
    // BIG_PAWN: 2 // pawn move 2 steps
    // CAPTURE: 1
    // DROP: 64
    // DROP_OR_PROMOTE: 72
    // EP_CAPTURE: 4
    // KQSIDE_CASTLE: 48
    // KSIDE_CASTLE: 16
    // PROMOTION: 8
    // QSIDE_CASTLE: 32
    flags?: number;
}

interface GameMarkings
{
    addOne(marking: Marking): string; // return the key, ex: "arrow|e2e4"
    addMany(markings: Marking[]): void;
    removeOne(key: string): void;
    removeMany(keys: string[]): void;
    getAll(): Marking[];
    removeAll(): void;
}

interface ChessboardGame
{
    // move a piece on the board
    move(move: IMoveDetails): void;

    // change the game mode
    setMode(mode: any): any;

    // emit game events
    emit(event: string, data: any): any;

    // be aware that this will return false if the game hasn't started
    isGameOver(): boolean;

    // is end of theory openings
    // isAtEndOfLine(): boolean;

    eco: {
        get(): GameECO | null;
        update(): Promise<void>;
        _update(): Promise<void>;
    }

    // get raw history
    getRawLines(): IGameHistory[][];

    getLastMove(): IGameHistory | undefined;

    getContext(): any;

    getOptions(): GameOptions;

    // get the current FEN
    getFEN(): string;

    // get current turn, 1 is white, 2 is black
    getTurn(): number;

    // get current side, 1 is white, 2 is black
    getPlayingAs(): number;

    // get all legal moves on the board
    getLegalMoves(): IMoveDetails[];

    markings: GameMarkings;

    // used for debugging only, calling this will hook all function of the game controller
    debug_hook(): void;

    on: (event: TEventType, fn: (event: IGameEvent) => void) => void
}


interface ExtensionOptions
{
    depth: number;
    threads: number;
    show_hints: boolean;
    move_analysis: boolean;
    depth_bar: boolean;
    evaluation_bar: boolean;
    auto_move: boolean;
}