export type Placement = {
  color: 0 | 1;
  point: { x: number; y: number };
};

export type Game = {
  path: string;
  score: number;
  last_move_matched: number;
  rotation: number; // 0: no rotation, 1-3: rotation index
  is_inverted: boolean; // whether the pattern colors were inverted
  is_mirrored: boolean; // whether the pattern was mirrored
  all_empty_correctly_within: number; // distance from moves where all surrounding points are correctly empty
  moves: Array<Placement>;
};
